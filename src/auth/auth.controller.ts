import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIES } from './constants/cookie.constant';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto';
import { HostLoginDto } from './dto/host-login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import {
  clearSessionCookies,
  setSessionCookies,
} from './utils/session-cookie.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  @Post('host/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HOST 이메일 로그인' })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, description: 'USER_SUSPENDED' })
  async hostLogin(
    @Body() dto: HostLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    const result = await this.authService.hostLogin(dto);
    setSessionCookies(response, result.role, result.tokens, this.isProduction);
    return result.body;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'access token 재발급',
    description:
      'refresh 토큰은 body 또는 세션 쿠키에서 읽는다. 쓰인 토큰은 무효화되고 새 쌍이 발급된다(회전).',
  })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  @ApiResponse({ status: 401, description: 'INVALID_REFRESH_TOKEN' })
  @ApiResponse({ status: 422, description: 'SESSION_AMBIGUOUS' })
  async refresh(
    @Body() _dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthTokenResponseDto> {
    // RefreshTokenGuard가 body·쿠키를 보고 토큰 하나를 확정해 둔다.
    const result = await this.authService.refresh(request.refreshToken!);
    setSessionCookies(response, result.role, result.tokens, this.isProduction);
    return result.body;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'refresh token 무효화 및 세션 쿠키 만료' })
  @ApiResponse({ status: 204, description: '로그아웃 완료 (멱등)' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    // 로그인한 세션이 곧 로그아웃할 세션이므로 어느 쿠키인지 모호하지 않다.
    const cookies = (request.cookies ?? {}) as Record<
      string,
      string | undefined
    >;
    const presented =
      dto.refreshToken ?? cookies[SESSION_COOKIES[user.role].refresh];

    await this.authService.logout(user, presented);
    clearSessionCookies(response, user.role, this.isProduction);
  }
}
