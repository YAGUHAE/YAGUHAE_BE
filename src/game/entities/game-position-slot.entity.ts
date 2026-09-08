import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AttendanceResult } from '../../common/enums';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { GamePosition } from './game-position.entity';

/**
 * ERD §2.6 — 자리 단위 점유
 *
 * 복합 PK `(game_position_id, slot_no)` 자체가 중복 점유 방지 제약이므로
 * 대리키를 두지 않는다. BaseEntity를 상속하지 않는 이유이기도 하다.
 *
 * 예약은 INSERT가 아니라 `UPDATE ... WHERE reservation_id IS NULL`이다.
 * 조건부 UPDATE의 영향 행 수가 0이면 그 자리는 이미 팔린 것이므로,
 * 정원 초과와 중복 점유를 DB 단독으로 막을 수 있다 (advisory lock 불필요).
 *
 * 해제는 삭제가 아니라 점유 4종(reservationId·seq·participantName·claimedAt)을
 * 비우는 것이다. 행은 경기 수명 내내 유지된다.
 */
@Check('chk_slot_no', '"slot_no" >= 1')
@Check('chk_slot_seq', '"seq" >= 0')
// 빈 자리에 출석이 남는 상태를 막는다
@Check(
  'chk_slot_attendance_claimed',
  '"attendance" IS NULL OR "reservation_id" IS NOT NULL',
)
// 점유 컬럼은 함께 채워지고 함께 비워져야 한다 (§4.2.1 releaseSlots)
@Check('chk_slot_claim_pair', '("reservation_id" IS NULL) = ("seq" IS NULL)')
/**
 * §4.1의 "다음 빈 자리 1건" 조회가 이 서비스에서 가장 뜨거운 경로다.
 * 이미 팔린 자리를 인덱스에서 아예 제외해 만석에 가까울수록 오히려 빨라진다.
 */
@Index('idx_slot_free', ['gamePositionId', 'slotNo'], {
  where: 'reservation_id IS NULL',
})
@Index('idx_slot_reservation', ['reservationId'])
/**
 * seq는 "slots[0] = 신청자 본인" 계약의 유일한 근거라 중복이 생기면
 * 대리 배지와 평가 대상이 조용히 틀린다. 부분 인덱스인 이유는
 * 빈 자리의 seq가 전부 NULL이기 때문 (ERD §6).
 */
@Index('uq_slot_reservation_seq', ['reservationId', 'seq'], {
  unique: true,
  where: 'reservation_id IS NOT NULL',
})
@Entity('game_position_slot')
export class GamePositionSlot {
  @PrimaryColumn({ type: 'uuid', name: 'game_position_id' })
  gamePositionId: string;

  /** 같은 모집 단위 내 자리 번호 (1..capacity) */
  @PrimaryColumn({ type: 'smallint', name: 'slot_no' })
  slotNo: number;

  @ManyToOne(() => GamePosition, (position) => position.slots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_position_id' })
  gamePosition: GamePosition;

  /** 이 자리를 점유한 예약. null = 빈 자리 */
  @Column({ type: 'uuid', name: 'reservation_id', nullable: true })
  reservationId: string | null;

  /**
   * 예약은 하드 삭제하지 않는다(터미널 상태로 남긴다). 만약 삭제 경로가 생기면
   * SET NULL이 reservation_id만 비워 chk_slot_claim_pair를 위반하므로,
   * seq·participant_name까지 함께 비우는 처리가 필요하다.
   */
  @ManyToOne(() => Reservation, (reservation) => reservation.slots, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation | null;

  /**
   * 예약 내 순번(0-based). 0 = 예약자 본인, 1.. = 대리분.
   *
   * §4.1이 데드락 방지로 요청을 gamePositionId 오름차순으로 재정렬해 점유하므로
   * (gamePositionId, slotNo)로는 요청 순서를 복원할 수 없다. 따라서 정렬 **전**
   * 인덱스를 부착해 이 컬럼에 담는다 — 정렬은 점유 순서일 뿐 자리의 정체성이 아니다.
   */
  @Column({ type: 'smallint', nullable: true })
  seq: number | null;

  /** 자리 참가자 이름. users와 연결하지 않는다 (대리 신청 대상은 계정이 없어도 된다) */
  @Column({ type: 'text', name: 'participant_name', nullable: true })
  participantName: string | null;

  @Column({ type: 'timestamptz', name: 'claimed_at', nullable: true })
  claimedAt: Date | null;

  /**
   * 자리 단위 출석 결과. 예약 단위 상태는 이 값들을 집계해 정한다 —
   * 전원 PRESENT면 ATTENDED, 하나라도 NO_SHOW면 NO_SHOW (ERD §4.4).
   * 출석이 찍힌 예약은 해제 경로를 타지 않으므로 releaseSlots가 건드리지 않는다.
   */
  @Column({
    type: 'enum',
    enum: AttendanceResult,
    nullable: true,
  })
  attendance: AttendanceResult | null;
}
