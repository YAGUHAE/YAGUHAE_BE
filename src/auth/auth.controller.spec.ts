import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Request, Response } from 'express';
import { UserRole } from '../common/enums';
import { AuthController } from './auth.controller';
import { AuthResult, AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

const passThroughGuard = { canActivate: () => true };

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    hostLogin: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };
  let response: {
    cookie: jest.Mock<void, [string, string, object]>;
    clearCookie: jest.Mock<void, [string, object]>;
  };

  const result = (role: UserRole): AuthResult => ({
    role,
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessExpiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 600_000,
    },
    body: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'u1',
        role,
        nickname: '유저',
        profileCompleted: true,
      },
      leagueId: null,
    },
  });

  beforeEach(async () => {
    authService = {
      hostLogin: jest.fn().mockResolvedValue(result(UserRole.HOST)),
      refresh: jest.fn().mockResolvedValue(result(UserRole.PLAYER)),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    response = {
      cookie: jest.fn<void, [string, string, object]>(),
      clearCookie: jest.fn<void, [string, object]>(),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    })
      // 가드 자체는 각자의 스펙에서 검증한다. 여기서는 컨트롤러만 본다.
      .overrideGuard(JwtAuthGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RefreshTokenGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = module.get(AuthController);
  });

  const asResponse = () => response as unknown as Response;

  it('HOST 로그인은 어드민 쿠키만 심는다', async () => {
    const body = await controller.hostLogin(
      { email: 'host@yaguhae.kr', password: 'pw' },
      asResponse(),
    );

    expect(body.accessToken).toBe('access-token');
    expect(response.cookie.mock.calls.map(([name]) => name)).toEqual([
      'admin_session',
      'admin_refresh',
    ]);
  });

  it('운영 환경이 아니면 Secure 쿠키를 켜지 않는다 (로컬 http에서 쿠키가 안 심긴다)', async () => {
    await controller.hostLogin(
      { email: 'host@yaguhae.kr', password: 'pw' },
      asResponse(),
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'admin_session',
      'access-token',
      expect.objectContaining({ httpOnly: true, secure: false }),
    );
  });

  it('갱신은 가드가 확정한 토큰을 그대로 서비스에 넘긴다', async () => {
    const refreshToken = {
      raw: 'raw',
      payload: { sub: 'u1', role: UserRole.PLAYER },
    };

    await controller.refresh({}, { refreshToken } as Request, asResponse());

    expect(authService.refresh).toHaveBeenCalledWith(refreshToken);
    expect(response.cookie.mock.calls.map(([name]) => name)).toEqual([
      'player_session',
      'player_refresh',
    ]);
  });

  it('로그아웃은 역할에 맞는 refresh 쿠키를 무효화하고 그 세션 쿠키만 지운다', async () => {
    const user = { id: 'u1', role: UserRole.PLAYER };
    const request = {
      cookies: { player_refresh: 'p-refresh', admin_refresh: 'a-refresh' },
    } as unknown as Request;

    await controller.logout({}, user, request, asResponse());

    expect(authService.logout).toHaveBeenCalledWith(user, 'p-refresh');
    expect(response.clearCookie.mock.calls.map(([name]) => name)).toEqual([
      'player_session',
      'player_refresh',
    ]);
  });
});
