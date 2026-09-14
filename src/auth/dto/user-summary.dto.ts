import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { User } from '../../user/entities/user.entity';
import { isProfileCompleted } from '../../user/dto/user-detail.dto';

/** API 명세서 §9 — 로그인 응답용 최소 필드 */
export class UserSummaryDto {
  @ApiProperty()
  id: number;

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
      // 카카오 콜백의 온보딩 분기와 같은 함수를 쓴다 — 두 곳에 따로 적으면
      // 한쪽만 고쳐져 "온보딩을 마쳤는데 또 온보딩으로 가는" 상태가 생긴다.
      profileCompleted: isProfileCompleted(user),
    };
  }
}
