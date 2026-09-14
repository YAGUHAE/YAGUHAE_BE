import { ApiProperty } from '@nestjs/swagger';
import { LeagueDto } from './league.dto';

/** API 명세서 §4 — `GET /leagues`, `GET /leagues/mine` */
export class LeagueListDto {
  @ApiProperty({ type: [LeagueDto] })
  items: LeagueDto[];
}
