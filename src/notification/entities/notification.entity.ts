import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NotificationSendStatus, NotificationType } from '../../common/enums';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { User } from '../../user/entities/user.entity';

/**
 * ERD §2.9
 *
 * 알림 문구(title·body)는 저장하지 않는다 — 프론트가 type(+reason)으로 만든다.
 * 서버는 "무슨 일이 일어났는지"만 기록한다.
 *
 * API의 gameId·reason 필드도 컬럼으로 두지 않는다. reservation을 조인하면
 * 둘 다 얻을 수 있어(reservation.gameId / reservation.rejectReason)
 * 같은 사실을 두 곳에 두지 않는다는 원칙에 맞다.
 */
@Index('idx_notifications_user', ['userId', 'isRead'])
@Index('idx_notifications_send_status', ['sendStatus'])
@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'uuid', name: 'reservation_id', nullable: true })
  reservationId: string | null;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation | null;

  /** 카카오 알림톡 발송 상태. FAILED 건은 Cron 재시도 대상 */
  @Column({
    type: 'enum',
    enum: NotificationSendStatus,
    name: 'send_status',
    default: NotificationSendStatus.PENDING,
  })
  sendStatus: NotificationSendStatus;

  @Column({ type: 'boolean', name: 'is_read', default: false })
  isRead: boolean;
}
