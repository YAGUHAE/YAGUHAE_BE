import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

/**
 * ERD §2.12 — 리프레시 토큰
 *
 * 로그아웃의 "무효화"는 서버가 상태를 들고 있어야만 가능하다. JWT는 서명만으로
 * 검증되므로 발급된 토큰을 스스로 취소할 수 없다.
 *
 * 유저당 여러 행이다 — 용병(PLAYER) 세션과 어드민(HOST) 세션이 같은 브라우저에
 * 공존하고 기기도 여러 대일 수 있어, user_id 유니크를 걸면 한쪽 로그인이
 * 다른 쪽을 로그아웃시킨다.
 *
 * 평문을 저장하지 않는다. 검증은 제시된 토큰을 해싱해 비교한다.
 * 회전을 도입하면 revoked_at이 찍힌 토큰의 재제시가 탈취 신호가 된다.
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text', name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  /** null = 유효 */
  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;
}
