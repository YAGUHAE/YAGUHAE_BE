import { CookieOptions } from 'express';
import { UserRole } from '../../common/enums';

/**
 * 세션별 쿠키 이름 (API 명세서 §1.1).
 *
 * 용병 콘솔과 어드민 콘솔이 같은 브라우저에 동시에 로그인되어 있을 수 있어
 * 이름을 나눈다. 한 이름을 공유하면 한쪽 로그인이 다른 쪽을 덮어쓴다.
 */
export const SESSION_COOKIES: Record<
  UserRole,
  { access: string; refresh: string }
> = {
  [UserRole.PLAYER]: { access: 'player_session', refresh: 'player_refresh' },
  [UserRole.HOST]: { access: 'admin_session', refresh: 'admin_refresh' },
};

export const ACCESS_COOKIE_NAMES = Object.values(SESSION_COOKIES).map(
  (names) => names.access,
);

export const REFRESH_COOKIE_NAMES = Object.values(SESSION_COOKIES).map(
  (names) => names.refresh,
);

/**
 * `Secure`는 https에서만 쿠키가 전송되게 하므로 로컬 http 개발에서 켜면
 * 쿠키가 아예 심기지 않는다. 운영에서만 켠다.
 */
export function buildCookieOptions(
  maxAgeMs: number,
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}
