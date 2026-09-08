import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { FeeTier, Position, Team } from '../../common/enums';
import { Game } from './game.entity';
import { GamePositionSlot } from './game-position-slot.entity';

/**
 * ERD §2.5 — 모집 단위 (경기 × 팀 × 포지션)
 *
 * 이 테이블의 id가 곧 "모집 단위"의 식별자이며, 자리(game_position_slot)는
 * 이 id를 참조한다. team·position을 슬롯 쪽에 복사해 두지 않는다.
 *
 * capacity는 "선언된 정원"이고 실제 자리는 슬롯 행이다. 두 값은 반드시
 * 같은 트랜잭션에서 함께 갱신해야 한다 (DB 제약으로 강제 불가).
 */
@Unique('uq_game_positions_game_team_position', ['gameId', 'team', 'position'])
@Check('chk_game_positions_capacity', '"capacity" > 0')
// 참가비 0원 허용 — A-6의 「입금 불필요」 섹션. 음수만 거부한다 (ERD §2.5)
@Check('chk_game_positions_fee', '"participation_fee" >= 0')
@Index('idx_game_positions_game', ['gameId'])
@Entity('game_positions')
export class GamePosition extends BaseEntity {
  @Column({ type: 'uuid', name: 'game_id' })
  gameId: string;

  @ManyToOne(() => Game, (game) => game.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ type: 'enum', enum: Team })
  team: Team;

  @Column({ type: 'enum', enum: Position })
  position: Position;

  @Column({ type: 'int' })
  capacity: number;

  /**
   * 개설 시 POSITION_FEE_TIER로 결정해 복사한다. 파생시키지 않는 이유는
   * 매핑표가 가격 정책이라 바뀌기 때문 — 파생시키면 과거 경기의 티어 표시가
   * 소급 변경되어 복사된 participation_fee와 짝이 맞지 않게 된다 (ERD §2.5).
   */
  @Column({ type: 'enum', enum: FeeTier, name: 'fee_tier' })
  feeTier: FeeTier;

  /** 이 자리 1개당 참가비 */
  @Column({ type: 'int', name: 'participation_fee' })
  participationFee: number;

  @OneToMany(() => GamePositionSlot, (slot) => slot.gamePosition)
  slots: GamePositionSlot[];
}
