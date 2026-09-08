import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { FeeTier } from '../../common/enums';
import { Bank } from '../../bank/entities/bank.entity';
import { Game } from '../../game/entities/game.entity';
import { User } from '../../user/entities/user.entity';

/** ERD §2.2 */
@Entity('leagues')
export class League extends BaseEntity {
  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @ManyToOne(() => User, (user) => user.leagues)
  @JoinColumn({ name: 'host_id' })
  host: User;

  /**
   * nullable — A-8은 계좌를 리그 생성 이후에 등록한다.
   * 대신 경기 개설 시점에 계좌를 요구한다 (서비스 레이어 LEAGUE_BANK_REQUIRED).
   */
  @Column({ type: 'uuid', name: 'bank_id', nullable: true })
  bankId: string | null;

  @ManyToOne(() => Bank, (bank) => bank.leagues, { nullable: true })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank | null;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  region: string;

  /** 리그 기본 경기장. 경기별 override 가능 (games.stadium_name) */
  @Column({ type: 'text', name: 'stadium_name' })
  stadiumName: string;

  @Column({ type: 'text', nullable: true })
  intro: string | null;

  /**
   * 티어별 참가비 기본값. 기본값일 뿐 정산 근거가 아니다 —
   * 실제 금액은 경기 개설 시 game_positions.participation_fee로 복사되고
   * 예약 시 reservations.total_fee로 다시 고정된다. 나중에 바꿔도 소급되지 않는다.
   *
   * DB 기본값이 '{}'이므로 비어 있는 상태가 표현 가능하다 → Partial.
   */
  @Column({ type: 'jsonb', name: 'default_fees', default: () => "'{}'::jsonb" })
  defaultFees: Partial<Record<FeeTier, number>>;

  @OneToMany(() => Game, (game) => game.league)
  games: Game[];
}
