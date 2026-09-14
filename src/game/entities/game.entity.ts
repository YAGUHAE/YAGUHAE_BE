import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { GameStatus, LevelEnum } from '../../common/enums';
import { League } from '../../league/entities/league.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { User } from '../../user/entities/user.entity';
import { GamePosition } from './game-position.entity';

/**
 * ERD §2.4
 *
 * 참가비 컬럼이 없다 — (팀×포지션)별 차등이라 경기 단위 단일 값이 성립하지 않는다.
 * 경기 단위 표시가 필요하면 game_positions.participation_fee의 MIN/MAX로 집계한다.
 */
@Index('idx_games_datetime', ['gameDate', 'gameTime'])
@Index('idx_games_league', ['leagueId', 'gameDate', 'gameTime'])
@Entity('games')
export class Game extends BaseEntity {
  @Column({ type: 'uuid', name: 'league_id' })
  leagueId: string;

  @ManyToOne(() => League, (league) => league.games)
  @JoinColumn({ name: 'league_id' })
  league: League;

  /** 리그 소유자와 일치 */
  @Column({ type: 'int', name: 'host_id' })
  hostId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'date', name: 'game_date' })
  gameDate: string;

  @Column({ type: 'time', name: 'game_time' })
  gameTime: string;

  /** 경기 소요 분 — 시간대 중복 판정용 */
  @Column({ type: 'int', name: 'duration_min', default: 120 })
  durationMin: number;

  /**
   * 권장 급수 — 표시·필터 전용. 신청을 막지 않는다 (ERD §2.4).
   * 급수 제한은 대리 신청과 충돌해 폐지됐다: 예약당 자리 수에 상한이 없어
   * 신청자 1명만 통과하면 나머지 N명이 프리패스가 되기 때문.
   */
  @Column({
    type: 'enum',
    enum: LevelEnum,
    name: 'recommended_level',
    nullable: true,
  })
  recommendedLevel: LevelEnum | null;

  /** 경기별 구장 override. null이면 리그값(league.stadiumName)을 사용한다 */
  @Column({ type: 'text', name: 'stadium_name', nullable: true })
  stadiumName: string | null;

  @Column({ type: 'text', nullable: true })
  notice: string | null;

  @Column({ type: 'text', name: 'dugout_home', nullable: true })
  dugoutHome: string | null;

  @Column({ type: 'text', name: 'dugout_away', nullable: true })
  dugoutAway: string | null;

  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.OPEN })
  status: GameStatus;

  @OneToMany(() => GamePosition, (position) => position.game)
  positions: GamePosition[];

  @OneToMany(() => Reservation, (reservation) => reservation.game)
  reservations: Reservation[];
}
