import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * API 명세서 §1 — `POST /auth/logout`
 *
 * refresh 토큰을 생략하면 access 토큰이 말하는 역할의 refresh 쿠키를 무효화한다.
 * 로그인한 세션이 곧 로그아웃할 세션이므로 여기서는 모호할 일이 없다.
 */
export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
