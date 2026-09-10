import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole } from '../../common/enums';
import { JwtPayload } from '../types/jwt-payload.type';
import { RefreshTokenGuard } from './refresh-token.guard';

describe('RefreshTokenGuard', () => {
  const payload: JwtPayload = { sub: 'u1', role: UserRole.PLAYER };
  let jwtService: { verifyAsync: jest.Mock };
  let guard: RefreshTokenGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    guard = new RefreshTokenGuard(
      jwtService as unknown as JwtService,
      { getOrThrow: () => 'refresh-secret' } as unknown as ConfigService,
    );
  });

  const request = (init: Partial<Request>): Request =>
    ({ body: {}, cookies: {}, ...init }) as Request;

  const activate = (req: Request) =>
    guard.canActivate({
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext);

  it('body의 refreshToken이 쿠키보다 우선한다', async () => {
    const req = request({
      body: { refreshToken: 'from-body' },
      cookies: { player_refresh: 'from-cookie' },
    });

    await expect(activate(req)).resolves.toBe(true);
    expect(req.refreshToken).toEqual({ raw: 'from-body', payload });
  });

  it('refresh 쿠키가 하나뿐이면 그것으로 확정한다', async () => {
    const req = request({ cookies: { admin_refresh: 'a' } });

    await expect(activate(req)).resolves.toBe(true);
    expect(req.refreshToken?.raw).toBe('a');
  });

  it('두 세션 쿠키가 공존하고 지정이 없으면 422 SESSION_AMBIGUOUS', async () => {
    const req = request({
      cookies: { player_refresh: 'p', admin_refresh: 'a' },
    });

    await expect(activate(req)).rejects.toMatchObject({
      code: 'SESSION_AMBIGUOUS',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  });

  it('session을 지정하면 해당 세션 쿠키를 쓴다', async () => {
    const req = request({
      body: { session: UserRole.HOST },
      cookies: { player_refresh: 'p', admin_refresh: 'a' },
    });

    await expect(activate(req)).resolves.toBe(true);
    expect(req.refreshToken?.raw).toBe('a');
  });

  it('토큰이 아예 없으면 401', async () => {
    await expect(activate(request({}))).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('서명 검증에 실패하면 401', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

    await expect(
      activate(request({ body: { refreshToken: 'bad' } })),
    ).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      status: HttpStatus.UNAUTHORIZED,
    });
  });
});
