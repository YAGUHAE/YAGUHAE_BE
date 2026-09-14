import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LevelEnum,
  OAuthProvider,
  Position,
  UserRole,
} from '../../common/enums';
import { User } from '../entities/user.entity';

/**
 * API 명세서 §2 — 본인 조회·수정용 (`GET/PATCH /users/me`)
 *
 * 엔티티를 그대로 반환하지 않는 이유는 `passwordHash` 하나다. 엔티티에 필드가
 * 추가될 때마다 자동으로 응답에 실리는 구조를 만들지 않는다 — 다음에 추가되는
 * 필드가 민감할지는 지금 알 수 없다.
 */
export class UserDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional({ type: String, nullable: true })
  email: string | null;

  @ApiPropertyOptional({ enum: OAuthProvider, nullable: true })
  provider: OAuthProvider | null;

  @ApiProperty()
  nickname: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone: string | null;

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

  /** 본인 조회에만 실린다. 공개 프로필에는 없다 (ERD §7) */
  @ApiProperty()
  noShowCount: number;

  @ApiProperty({ description: '노쇼 2회 시 정지. 신청을 막는 유일한 속성이다' })
  isSuspended: boolean;

  @ApiProperty({
    description:
      'nickname·region·selfLevel이 모두 채워졌는지 (API 명세서 §1.2). 온보딩 분기에 쓰인다',
  })
  profileCompleted: boolean;

  @ApiProperty()
  createdAt: Date;

  static from(user: User): UserDetailDto {
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      provider: user.provider,
      nickname: user.nickname,
      phone: user.phone,
      region: user.region,
      primaryPosition: user.primaryPosition,
      selfLevel: user.selfLevel,
      gamewonUrl: user.gamewonUrl,
      uniqueplayUrl: user.uniqueplayUrl,
      noShowCount: user.noShowCount,
      isSuspended: user.isSuspended,
      profileCompleted: isProfileCompleted(user),
      createdAt: user.createdAt,
    };
  }
}

/**
 * 온보딩 완료 기준 (API 명세서 §1.2).
 *
 * 카카오 콜백의 리다이렉트 분기와 이 DTO가 **같은 함수를 써야 한다** —
 * 두 곳에 따로 적으면 한쪽만 고쳐져 "온보딩을 마쳤는데 또 온보딩으로 가는"
 * 상태가 생긴다.
 */
export function isProfileCompleted(user: User): boolean {
  return Boolean(user.nickname && user.region && user.selfLevel);
}
