import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/enums';

/** API 명세서 §1 — `POST /auth/refresh` */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      '쿠키를 쓰지 않는 클라이언트(모바일·테스트)가 refresh 토큰을 직접 싣는다. 있으면 쿠키보다 우선한다.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description:
      '갱신할 세션. 용병·어드민 refresh 쿠키가 둘 다 있을 때 필수 — 없으면 422 SESSION_AMBIGUOUS.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  session?: UserRole;
}
