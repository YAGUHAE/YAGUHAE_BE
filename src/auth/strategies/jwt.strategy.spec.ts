import { Request } from 'express';
import { extractAccessToken } from './jwt.strategy';
import { UserRole } from '../../common/enums';

const buildRequest = (init: Partial<Request>): Request =>
  ({ headers: {}, cookies: {}, ...init }) as Request;

describe('extractAccessToken', () => {
  it('Authorization 헤더가 쿠키보다 우선한다', () => {
    const request = buildRequest({
      headers: { authorization: 'Bearer header-token' },
      cookies: { player_session: 'cookie-token' },
    });

    expect(extractAccessToken(request)).toBe('header-token');
  });

  it('헤더가 없으면 쿠키에서 꺼낸다', () => {
    const request = buildRequest({ cookies: { player_session: 'p' } });

    expect(extractAccessToken(request)).toBe('p');
  });

  it('두 세션 쿠키가 공존하면 라우트가 요구한 역할의 쿠키를 고른다', () => {
    const request = buildRequest({
      cookies: { player_session: 'p', admin_session: 'a' },
      requiredRoles: [UserRole.HOST],
    });

    expect(extractAccessToken(request)).toBe('a');
  });

  it('요구 역할의 쿠키가 없으면 남은 쿠키로 폴백한다 (역할 검증은 RolesGuard가 한다)', () => {
    const request = buildRequest({
      cookies: { player_session: 'p' },
      requiredRoles: [UserRole.HOST],
    });

    expect(extractAccessToken(request)).toBe('p');
  });

  it('토큰이 없으면 null', () => {
    expect(extractAccessToken(buildRequest({}))).toBeNull();
  });
});
