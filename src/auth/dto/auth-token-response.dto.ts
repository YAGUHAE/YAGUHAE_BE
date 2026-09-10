import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from './user-summary.dto';

/** API 명세서 §1 — 로그인·갱신 응답 */
export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'HOST가 운영하는 가장 최근 리그. 없으면 null (프론트가 리그 생성으로 유도). PLAYER는 항상 null',
  })
  leagueId: string | null;
}
