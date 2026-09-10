import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { User } from '../../user/entities/user.entity';

/** API 명세서 §9 — 로그인 응답용 최소 필드 */
export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  nickname: string;

  @ApiProperty({
    description:
      '온보딩 완료 여부. nickname·region·selfLevel이 모두 채워진 상태 (API 명세서 §1.2)',
  })
  profileCompleted: boolean;

  static from(user: User): UserSummaryDto {
    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      profileCompleted: Boolean(user.nickname && user.region && user.selfLevel),
    };
  }
}
