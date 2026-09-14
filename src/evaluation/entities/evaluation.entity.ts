import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Game } from '../../game/entities/game.entity';
import { User } from '../../user/entities/user.entity';

/**
 * ERD §2.8 — 상호 평가
 *
 * 평가 대상은 각 예약의 seq = 0인 자리(예약자 본인)뿐이다. 대리 신청분은
 * 이름 문자열일 뿐 계정이 없어 evaluatee_id를 만들 수 없다.
 *
 * 베스트플레이어 "평가자당 경기당 최대 2명" 제한은 카운트 집계라
 * CHECK/유니크로 표현할 수 없다 — 서비스 레이어에서 강제한다.
 */
@Unique('uq_evaluations_game_evaluator_evaluatee', [
  'gameId',
  'evaluatorId',
  'evaluateeId',
])
@Check('chk_evaluations_manner', '"manner_score" BETWEEN 1 AND 5')
@Check('chk_evaluations_skill_match', '"skill_match_score" BETWEEN 1 AND 5')
@Check('chk_evaluations_punctuality', '"punctuality_score" BETWEEN 1 AND 5')
@Check('chk_evaluations_not_self', '"evaluator_id" <> "evaluatee_id"')
@Index('idx_evaluations_evaluatee', ['evaluateeId'])
@Index('idx_evaluations_best_player', ['gameId', 'evaluatorId', 'isBestPlayer'])
@Entity('evaluations')
export class Evaluation extends BaseEntity {
  @Column({ type: 'uuid', name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ type: 'int', name: 'evaluator_id' })
  evaluatorId: number;

  @ManyToOne(() => User, (user) => user.evaluationsGiven)
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: User;

  @Column({ type: 'int', name: 'evaluatee_id' })
  evaluateeId: number;

  @ManyToOne(() => User, (user) => user.evaluationsReceived)
  @JoinColumn({ name: 'evaluatee_id' })
  evaluatee: User;

  @Column({ type: 'int', name: 'manner_score' })
  mannerScore: number;

  /** 실력-프로필 일치도 */
  @Column({ type: 'int', name: 'skill_match_score' })
  skillMatchScore: number;

  @Column({ type: 'int', name: 'punctuality_score' })
  punctualityScore: number;

  @Column({ type: 'boolean', name: 'is_best_player', default: false })
  isBestPlayer: boolean;
}
