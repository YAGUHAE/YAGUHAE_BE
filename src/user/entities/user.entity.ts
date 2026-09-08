import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import {
  LevelEnum,
  OAuthProvider,
  Position,
  UserRole,
} from '../../common/enums';
import { Evaluation } from '../../evaluation/entities/evaluation.entity';
import { League } from '../../league/entities/league.entity';
import { Notification } from '../../notification/entities/notification.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';

/**
 * ERD §2.1
 *
 * 인증 경로가 두 갈래다 — PLAYER는 카카오 OAuth(provider + providerId),
 * HOST는 이메일 + 비밀번호. 두 수단은 배타적이므로 양쪽 모두 nullable이며,
 * "PLAYER는 passwordHash IS NULL, HOST는 providerId IS NULL"이 사실상의 불변식이다.
 * CHECK로 강제하지 않는 이유는 후속 리팩터에서 역할 겸임이 생기면 제약이 걸림돌이 되기 때문.
 */
@Index('uq_users_email', ['email'], {
  unique: true,
  where: 'email IS NOT NULL',
})
@Index('uq_users_provider_id', ['providerId'], {
  unique: true,
  where: 'provider_id IS NOT NULL',
})
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  /** HOST 전용 로그인 이메일 */
  @Column({ type: 'text', nullable: true })
  email: string | null;

  /** HOST 전용 로그인 비밀번호 해시. PLAYER는 null */
  @Column({ type: 'text', name: 'password_hash', nullable: true })
  passwordHash: string | null;

  /** PLAYER 로그인 수단 */
  @Column({ type: 'enum', enum: OAuthProvider, nullable: true })
  provider: OAuthProvider | null;

  @Column({ type: 'text', name: 'provider_id', nullable: true })
  providerId: string | null;

  @Column({ type: 'text' })
  nickname: string;

  /** 카카오 알림톡 수신 번호 (E.164 정규화 저장). 없으면 발송을 건너뛴다 */
  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  region: string | null;

  @Column({
    type: 'enum',
    enum: Position,
    name: 'primary_position',
    nullable: true,
  })
  primaryPosition: Position | null;

  /** 급수 제한 폐지(ERD §0.1)로 표시·필터 전용. 신청을 막지 않는다 */
  @Column({ type: 'enum', enum: LevelEnum, name: 'self_level', nullable: true })
  selfLevel: LevelEnum | null;

  @Column({ type: 'text', name: 'gamewon_url', nullable: true })
  gamewonUrl: string | null;

  @Column({ type: 'text', name: 'uniqueplay_url', nullable: true })
  uniqueplayUrl: string | null;

  /** 본인 조회 시에만 노출. 타인 공개 프로필에는 비노출 (ERD §7) */
  @Column({ type: 'int', name: 'no_show_count', default: 0 })
  noShowCount: number;

  /** 노쇼 2회 시 정지. 신청을 막는 유일한 사용자 속성이다 */
  @Column({ type: 'boolean', name: 'is_suspended', default: false })
  isSuspended: boolean;

  @OneToMany(() => League, (league) => league.host)
  leagues: League[];

  @OneToMany(() => Reservation, (reservation) => reservation.reserver)
  reservations: Reservation[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.evaluator)
  evaluationsGiven: Evaluation[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.evaluatee)
  evaluationsReceived: Evaluation[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
