import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { FeeTier } from '../../common/enums';

/**
 * 티어별 참가비 기본값 (API 명세서 §4).
 *
 * 포지션 11종이 아니라 **티어 4종**으로 받는다 — 화면설계서 §3.1이 확정한
 * 모델이고, 포지션마다 금액을 받는 UI는 어디에도 없다.
 *
 * `Record<FeeTier, number>`를 그대로 쓰지 않고 클래스로 만든 이유는 검증이다.
 * 전역 ValidationPipe가 `forbidNonWhitelisted`라 오타난 티어명(`PITCHERS` 등)이
 * 조용히 저장되지 않고 422로 거절된다.
 *
 * 티어별로 선택인 것은 엔티티가 Partial이기 때문이다 — 아직 정하지 않은 티어가
 * 있는 상태가 표현 가능해야 한다.
 */
export class DefaultFeesDto implements Partial<Record<FeeTier, number>> {
  @ApiPropertyOptional({ example: 30000, description: '투수' })
  @IsOptional()
  @IsInt()
  @Min(0)
  PITCHER?: number;

  @ApiPropertyOptional({ example: 25000, description: '포수' })
  @IsOptional()
  @IsInt()
  @Min(0)
  CATCHER?: number;

  @ApiPropertyOptional({ example: 20000, description: '야수' })
  @IsOptional()
  @IsInt()
  @Min(0)
  FIELDER?: number;

  @ApiPropertyOptional({ example: 15000, description: '지타' })
  @IsOptional()
  @IsInt()
  @Min(0)
  DH?: number;
}
