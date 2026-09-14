import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LevelEnum, Position } from '../../common/enums';
import { User } from '../entities/user.entity';
import { EvaluationSummaryDto } from './evaluation-summary.dto';

/**
 * API 명세서 §2 — 타인 공개 프로필 (`GET /users/:id`, 선수 카드)
 *
 * 빠진 것이 이 DTO의 요점이다 — `email`·`provider`·`providerId`·`phone`은
 * 신원 정보라 제외하고, `noShowCount`와 `isSuspended`는 **비공개로 확정**됐다
 * (ERD §7). 노쇼 이력은 주최자만 본다.
 */
export class UserProfileDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  region: string | null;

  @ApiPropertyOptional({ enum: Position, nullable: true })
  primaryPosition: Position | null;

  @ApiPropertyOptional({ enum: LevelEnum, nullable: true })
  selfLevel: LevelEnum | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  gamewonUrl: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  uniqueplayUrl: string | null;

  @ApiProperty({ type: EvaluationSummaryDto })
  evaluationSummary: EvaluationSummaryDto;

  static from(user: User, summary: EvaluationSummaryDto): UserProfileDto {
    return {
      id: user.id,
      nickname: user.nickname,
      region: user.region,
      primaryPosition: user.primaryPosition,
      selfLevel: user.selfLevel,
      gamewonUrl: user.gamewonUrl,
      uniqueplayUrl: user.uniqueplayUrl,
      evaluationSummary: summary,
    };
  }
}
