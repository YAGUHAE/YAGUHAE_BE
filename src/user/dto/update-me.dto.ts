import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { LevelEnum, Position } from '../../common/enums';
import { toE164Phone } from '../../common/utils/phone.util';

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

  /**
   * 알림톡 수신 번호. `010-1234-5678`·`+82 10-1234-5678` 어느 쪽으로 넣어도
   * E.164로 저장된다 (ERD §2.1).
   *
   * `@IsOptional()`을 쓰지 않는 이유: 그 데코레이터는 값이 **null일 때도** 검증을
   * 건너뛴다. `{ "phone": null }` 한 번으로 알림 채널이 조용히 사라지므로,
   * 생략은 허용하되 명시적 null은 422로 거절한다.
   *
   * `@Transform`이 정규화에 실패해도 null이 아니라 **원본을 그대로 돌려준다.**
   * null을 돌려주면 위와 같은 구멍이 다시 열린다 — 뒤따르는 `@Matches`가
   * 판단하게 둔다.
   */
  @ApiPropertyOptional({
    example: '010-1234-5678',
    description: '어떤 표기로 넣어도 E.164(+82...)로 저장된다',
  })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (toE164Phone(value) ?? value) : value,
  )
  @IsString()
  @Matches(/^\+82\d{9,10}$/, {
    message:
      'phone은 휴대폰 번호 형식이어야 합니다. 예: 010-1234-5678 또는 +821012345678',
  })
  phone?: string;
}
