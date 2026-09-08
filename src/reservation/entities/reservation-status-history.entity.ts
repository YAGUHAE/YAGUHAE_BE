import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import {
  HistoryActor,
  RejectReason,
  ReservationStatus,
} from '../../common/enums';
import { Reservation } from './reservation.entity';

/**
 * ERD §2.10 — 예약 상태 이력
 *
 * reservations.status는 현재값만 들고 있어 "언제 승인됐는지"를 복원할 수 없다.
 * P-8 타임라인이 이 테이블을 읽는다.
 *
 * RESERVED 생성도 이력에 남긴다 — 첫 행이 비면 타임라인의 시작점을
 * reservations.created_at에서 따로 끼워 넣어 그려야 한다.
 *
 * 상태 전이 코드 경로 한 곳에서만 INSERT한다. 전이 메서드 밖에서 status를
 * 바꾸는 경로가 생기면 이력에 구멍이 난다.
 */
@Index('idx_status_history_reservation', ['reservationId', 'createdAt'])
@Entity('reservation_status_history')
export class ReservationStatusHistory extends BaseEntity {
  @Column({ type: 'uuid', name: 'reservation_id' })
  reservationId: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  /** 전이 결과 상태 */
  @Column({ type: 'enum', enum: ReservationStatus })
  status: ReservationStatus;

  /**
   * 전이 주체. actor_user_id를 두지 않는 이유는 신원이 이미
   * reservations.reserver_id / games.host_id로 확정되기 때문이다.
   */
  @Column({ type: 'enum', enum: HistoryActor })
  actor: HistoryActor;

  @Column({ type: 'enum', enum: RejectReason, nullable: true })
  reason: RejectReason | null;
}
