import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { FeeTier, Position, Team } from '../../common/enums';
import { Reservation } from './reservation.entity';

/**
 * ERD §2.11 — 종료 예약의 자리 보존
 *
 * releaseSlots()가 점유를 해제하면 game_position_slot에서 그 예약의 자취가
 * 사라지는데, P-7 closed 탭과 P-8은 취소·거절·만료 건에서도 자리 목록을 보여준다.
 * reservations.total_fee가 금액을 스냅샷하는 것과 같은 이유·같은 방식이며,
 * 해제와 **같은 트랜잭션에서** 기록해야 한다.
 *
 * slot_no·game_position_id는 남기지 않는다 — 해제된 뒤 그 자리는 다른 사람이
 * 잡을 수 있어 참조가 의미를 잃는다. 보존하는 것은 "무엇을 잡았었나"이지
 * "어느 행을 가리켰나"가 아니다.
 *
 * 복합 PK (reservation_id, seq)가 조회 패턴
 * (WHERE reservation_id = $1 ORDER BY seq)을 그대로 커버하므로 별도 인덱스가 없다.
 */
@Check('chk_slot_snapshot_seq', '"seq" >= 0')
@Check('chk_slot_snapshot_fee', '"fee" >= 0')
@Entity('reservation_slot_snapshot')
export class ReservationSlotSnapshot {
  @PrimaryColumn({ type: 'uuid', name: 'reservation_id' })
  reservationId: string;

  /** 예약 내 순번 — 해제 전 game_position_slot.seq */
  @PrimaryColumn({ type: 'smallint' })
  seq: number;

  @ManyToOne(() => Reservation, (reservation) => reservation.slotSnapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ type: 'enum', enum: Team })
  team: Team;

  @Column({ type: 'enum', enum: Position })
  position: Position;

  @Column({ type: 'text', name: 'participant_name' })
  participantName: string;

  @Column({ type: 'enum', enum: FeeTier, name: 'fee_tier' })
  feeTier: FeeTier;

  /** 점유 시점 자리별 금액 */
  @Column({ type: 'int' })
  fee: number;
}
