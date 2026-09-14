import { ApiProperty } from '@nestjs/swagger';

/** API 명세서 §2 — 공개 프로필의 평가 집계 */
export class EvaluationSummaryDto {
  @ApiProperty({ example: 4.5, description: '매너 평균 (평가가 없으면 0)' })
  mannerAvg: number;

  @ApiProperty({ example: 4.2 })
  skillMatchAvg: number;

  @ApiProperty({ example: 4.8 })
  punctualityAvg: number;

  @ApiProperty({ example: 3, description: '베스트플레이어로 뽑힌 횟수' })
  bestPlayerCount: number;
}
