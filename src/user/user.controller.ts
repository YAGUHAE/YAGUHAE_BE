import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserDetailDto } from './dto/user-detail.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: '내 전체 프로필' })
  @ApiResponse({ status: 200, type: UserDetailDto })
  findMe(@CurrentUser() user: AuthenticatedUser): Promise<UserDetailDto> {
    return this.userService.findMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiResponse({ status: 200, type: UserDetailDto })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDetailDto> {
    return this.userService.updateMe(user.id, dto);
  }

  /**
   * `me` 보다 아래에 둔다. 위에 있으면 `/users/me` 가 이 라우트에 먼저 잡혀
   * ParseUUIDPipe 에서 422 가 난다.
   */
  @Get(':id')
  @ApiOperation({ summary: '타인 공개 프로필 (선수 카드)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  findProfile(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.findProfile(id);
  }
}
