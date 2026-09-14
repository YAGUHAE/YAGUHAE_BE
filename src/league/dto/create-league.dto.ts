import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DefaultFeesDto } from './default-fees.dto';

/** API 명세서 §4 — `POST /leagues` */
export class CreateLeagueDto {
  @ApiProperty({ example: '주말 사회인 야구 리그' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '서울' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  region: string;

  /** 리그 기본 경기장. 리그 내 모든 경기가 같은 곳에서 진행된다 (ERD §2.2 확정) */
  @ApiProperty({ example: '잠실 야구장' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  stadiumName: string;

  @ApiPropertyOptional({ example: '매주 토요일 오전에 모입니다.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  intro?: string;

  /**
   * 입금 계좌. **선택이다** — A-8은 리그를 만든 뒤에 계좌를 등록하고,
   * `leagues.bank_id`도 그래서 nullable이다 (ERD §2.2). 필수로 받으면
   * 계좌를 먼저 만들지 않고는 리그를 만들 수 없다.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bankId?: string;

  @ApiPropertyOptional({ type: DefaultFeesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DefaultFeesDto)
  defaultFees?: DefaultFeesDto;
}
