import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import {
  ACTIVE_RESERVATION_STATUSES,
  RejectReason,
  ReservationStatus,
} from '../../common/enums';
import { Game } from '../../game/entities/game.entity';
import { GamePositionSlot } from '../../game/entities/game-position-slot.entity';
import { User } from '../../user/entities/user.entity';
import { ReservationSlotSnapshot } from './reservation-slot-snapshot.entity';
import { ReservationStatusHistory } from './reservation-status-history.entity';

const ACTIVE_STATUS_SQL = ACTIVE_RESERVATION_STATUSES.map(
  (status) => `'${status}'`,
).join(', ');

/**
 * ERD §2.7
 *
 * 1인 1경기 1예약. 복수 자리는 1건의 예약이 N자리를 갖는 구조이지
 * 예약이 N건 생기는 것이 아니다.
 */
@Check('chk_reservations_slot_count', '"slot_count" >= 1')
@Check('chk_reservations_total_fee', '"total_fee" >= 0')
// 거절에는 사유가 반드시 붙는다 (ERD §6)
@Check(
  'chk_reservations_reject_reason',
  `"status" <> 'REJECTED' OR "reject_reason" IS NOT NULL`,
)
@Index('idx_reservations_expire', ['status', 'expiresAt'])
@Index('idx_reservations_game_status', ['gameId', 'status'])
@Index('idx_reservations_created', ['createdAt', 'id'])
/**
 * 중복 신청 방지. ERD §6은 enum 값이 하드코딩되는 점을 들어 마이그레이션 raw SQL을
 * 권장하지만, 어차피 어딘가에는 박히므로 엔티티에 두어 migration:generate가
 * 잡아내게 한다. 값은 ACTIVE_RESERVATION_STATUSES에서 생성한다.
 */
@Index('uq_reservations_active_per_game', ['gameId', 'reserverId'], {
  unique: true,
  where: `status IN (${ACTIVE_STATUS_SQL})`,
})
@Entity('reservations')
export class Reservation extends BaseEntity {
  @Column({ type: 'uuid', name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game, (game) => game.reservations)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  /** 신청자 (PLAYER) — 결제·연락 주체 */
  @Column({ type: 'int', name: 'reserver_id' })
  reserverId: number;

  @ManyToOne(() => User, (user) => user.reservations)
  @JoinColumn({ name: 'reserver_id' })
  reserver: User;

  /**
   * 이 예약이 점유한 자리 수. 상한 없음.
   * 파생값이지만 유지한다 — 취소·만료되면 슬롯이 해제되어 COUNT가 0이 되므로,
   * 이력 조회를 위해 예약 시점의 수를 고정해 둔다.
   */
  @Column({ type: 'smallint', name: 'slot_count' })
  slotCount: number;

  /**
   * 신청 시점 확정 참가비 총액 (점유 슬롯들의 포지션 단가 합계).
   * 곱셈이 아니라 합계다 — 단가가 자리마다 다르다.
   * 조회 시 재계산하지 않는다: 주최자가 단가를 수정해도 이미 입금 안내를 받은
   * 사용자의 청구 금액이 소급 변경되면 안 되기 때문.
   */
  @Column({ type: 'int', name: 'total_fee' })
  totalFee: number;

  @Column({ type: 'text', name: 'depositor_name' })
  depositorName: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  /** REJECTED일 때만 채워진다. 자유 텍스트를 받지 않는다 (알림톡 템플릿 매핑) */
  @Column({
    type: 'enum',
    enum: RejectReason,
    name: 'reject_reason',
    nullable: true,
  })
  rejectReason: RejectReason | null;

  /** 미입금 자동취소 기한 (생성 시 now() + 24h) */
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  /** 활성 예약이 점유 중인 자리. 종료되면 해제되므로 빈 배열이 된다 */
  @OneToMany(() => GamePositionSlot, (slot) => slot.reservation)
  slots: GamePositionSlot[];

  /** 해제된 자리의 보존본. 종료 예약은 이쪽에서 읽는다 */
  @OneToMany(() => ReservationSlotSnapshot, (snapshot) => snapshot.reservation)
  slotSnapshots: ReservationSlotSnapshot[];

  @OneToMany(() => ReservationStatusHistory, (history) => history.reservation)
  statusHistory: ReservationStatusHistory[];
}
