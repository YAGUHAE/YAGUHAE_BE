import { Response } from 'express';
import { UserRole } from '../../common/enums';
import {
  SESSION_COOKIES,
  buildCookieOptions,
} from '../constants/cookie.constant';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** epoch millis */
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

/**
 * 토큰을 body와 **동시에** 쿠키로도 내려준다 (API 명세서 §1.1).
 *
 * 프론트는 서버 컴포넌트에서 데이터를 읽고 라우트 가드는 요청 쿠키만 본다.
 * body에만 담으면 SSR이 인증된 요청을 만들지 못하고 가드도 동작하지 않는다.
 *
 * 쿠키 수명을 토큰 exp에서 역산하는 이유: 만료 표기('15m')를 두 곳에서 파싱하면
 * 쿠키와 토큰의 수명이 서로 어긋날 수 있다.
 */
export function setSessionCookies(
  response: Response,
  role: UserRole,
  tokens: IssuedTokens,
  isProduction: boolean,
): void {
  const names = SESSION_COOKIES[role];
  const now = Date.now();

  response.cookie(
    names.access,
    tokens.accessToken,
    buildCookieOptions(Math.max(tokens.accessExpiresAt - now, 0), isProduction),
  );
  response.cookie(
    names.refresh,
    tokens.refreshToken,
    buildCookieOptions(
      Math.max(tokens.refreshExpiresAt - now, 0),
      isProduction,
    ),
  );
}

/** 해당 세션의 쿠키만 지운다 — 다른 세션의 로그인을 건드리지 않는다 */
export function clearSessionCookies(
  response: Response,
  role: UserRole,
  isProduction: boolean,
): void {
  const names = SESSION_COOKIES[role];
  const options = buildCookieOptions(0, isProduction);

  response.clearCookie(names.access, options);
  response.clearCookie(names.refresh, options);
}
