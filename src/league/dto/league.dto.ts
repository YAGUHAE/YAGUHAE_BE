import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankDto } from '../../bank/dto/bank.dto';
import { FeeTier } from '../../common/enums';
import { League } from '../entities/league.entity';

/**
 * API 명세서 §4 · §9 — 리그 응답 (leagues + banks 조인).
 *
 * 계좌를 `bankId`가 아니라 `bank` 객체로 내려준다. 참가비 안내 화면이 은행명·
 * 계좌번호·예금주를 그대로 필요로 하는데, id만 주면 화면마다 한 번씩 더
 * 조회하게 된다.
 */
export class LeagueDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: '주최자 users.id — 정수다 (§0.3)' })
  hostId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  region: string;

  @ApiProperty()
  stadiumName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  intro: string | null;

  @ApiProperty({
    description: '티어별 참가비 기본값. 정하지 않은 티어는 키가 없다',
    example: { PITCHER: 30000, CATCHER: 25000, FIELDER: 20000, DH: 15000 },
  })
  defaultFees: Partial<Record<FeeTier, number>>;

  /**
   * 계좌를 아직 등록하지 않았으면 null이다 — A-8이 리그 생성 이후에 등록한다
   * (ERD §2.2). 경기 개설 시점에는 서버가 계좌를 요구한다.
   */
  @ApiPropertyOptional({ type: BankDto, nullable: true })
  bank: BankDto | null;

  @ApiProperty()
  createdAt: Date;

  static from(league: League): LeagueDto {
    return {
      id: league.id,
      hostId: league.hostId,
      name: league.name,
      region: league.region,
      stadiumName: league.stadiumName,
      intro: league.intro,
      defaultFees: league.defaultFees,
      bank: league.bank ? BankDto.from(league.bank) : null,
      createdAt: league.createdAt,
    };
  }
}
