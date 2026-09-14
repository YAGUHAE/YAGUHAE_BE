import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { LevelEnum, Position } from '../../common/enums';

/**
 * API 명세서 §2 — `PATCH /users/me`
 *
 * 역할·정지 여부·노쇼 횟수는 여기에 없다. 본인이 고칠 수 있는 값이 아니고,
 * 전역 ValidationPipe가 whitelist·forbidNonWhitelisted라 요청에 실어도
 * 422로 거절된다.
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: '김용병' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @ApiPropertyOptional({ example: '서울' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({ enum: Position })
  @IsOptional()
  @IsEnum(Position)
  primaryPosition?: Position;

  @ApiPropertyOptional({
    enum: LevelEnum,
    description: '표시·필터 전용. 급수 제한은 폐지되어 신청을 막지 않는다',
  })
  @IsOptional()
  @IsEnum(LevelEnum)
  selfLevel?: LevelEnum;

  @ApiPropertyOptional({ example: 'https://gamewon.co.kr/player/123' })
  @IsOptional()
  @IsUrl()
  gamewonUrl?: string;

  @ApiPropertyOptional({ example: 'https://uniqueplay.kr/player/123' })
  @IsOptional()
  @IsUrl()
  uniqueplayUrl?: string;
}
