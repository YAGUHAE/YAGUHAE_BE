import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UserRole } from '../common/enums';
import { CreateLeagueDto } from './dto/create-league.dto';
import { LeagueListDto } from './dto/league-list.dto';
import { LeagueDto } from './dto/league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueOwnershipGuard } from './guards/league-ownership.guard';
import { LeagueService } from './league.service';

@ApiTags('Leagues')
@Controller('leagues')
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Get()
  @ApiOperation({
    summary: '리그 목록 (공개)',
    description: '인증이 필요 없다 — 용병이 로그인 전에 리그를 둘러본다.',
  })
  @ApiResponse({ status: 200, type: LeagueListDto })
  findAll(): Promise<LeagueListDto> {
    return this.leagueService.findAll();
  }

  /**
   * `:id` 보다 위에 둔다. 아래에 있으면 `/leagues/mine` 이 `:id` 라우트에 먼저
   * 잡혀 ParseUUIDPipe 에서 400 이 난다 (users의 `me` 와 같은 이유).
   */
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내가 운영하는 리그 목록' })
  @ApiResponse({ status: 200, type: LeagueListDto })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (role ≠ HOST)' })
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<LeagueListDto> {
    return this.leagueService.findMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '리그 상세 (공개)' })
  @ApiResponse({ status: 200, type: LeagueDto })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LeagueDto> {
    return this.leagueService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth()
  @ApiOperation({ summary: '리그 생성' })
  @ApiResponse({ status: 201, type: LeagueDto })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (role ≠ HOST)' })
  @ApiResponse({ status: 404, description: 'BANK_NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeagueDto,
  ): Promise<LeagueDto> {
    return this.leagueService.create(user.id, dto);
  }

  /**
   * `@Roles(HOST)`를 소유권 가드와 함께 붙인다. 역할 검사가 중복처럼 보이지만
   * (리그를 소유한 사람은 어차피 HOST다) **인증 소스를 고르는 데 필요하다** —
   * `JwtAuthGuard`가 이 메타데이터를 보고 어느 세션 쿠키를 읽을지 정하기 때문에
   * (API 명세서 §1.1), 없으면 용병 쿠키를 먼저 집어서 **주최자가 자기 리그를
   * 수정하지 못하고 403을 받는다.** 두 세션은 같은 브라우저에 공존한다.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, LeagueOwnershipGuard)
  @Roles(UserRole.HOST)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '리그 수정 (주최자 본인만)',
    description:
      '계좌 3필드는 여기서 고칠 수 없다 — 계좌는 리그 소유가 아니라서 ' +
      'PATCH /banks/:id 로 따로 호출한다 (§3·§4).',
  })
  @ApiResponse({ status: 200, type: LeagueDto })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (주최자 아님)' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND · BANK_NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeagueDto,
  ): Promise<LeagueDto> {
    return this.leagueService.update(id, dto);
  }
}
