import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SESSION_COOKIES } from '../constants/cookie.constant';
import { AuthenticatedUser, JwtPayload } from '../types/jwt-payload.type';
import { UserRole } from '../../common/enums';

/**
 * access 토큰을 어디서 꺼낼지 정한다.
 *
 * 헤더가 우선이다 (API 명세서 §1.1) — 모바일·테스트 클라이언트는 쿠키 없이
 * `Authorization: Bearer`만 쓴다.
 *
 * 쿠키로 넘어오면 이름이 두 개다. 같은 브라우저에 용병·어드민 세션이 공존하므로
 * 둘 다 들어 있을 수 있고, 그때 아무거나 고르면 역할이 다른 토큰을 집는다.
 * 라우트가 `@Roles()`로 요구한 역할을 먼저 보고 해당 세션 쿠키를 고른다.
 */
export function extractAccessToken(request: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  if (fromHeader) {
    return fromHeader;
  }

  const cookies = (request.cookies ?? {}) as Record<string, string | undefined>;
  const preferred = request.requiredRoles?.length
    ? request.requiredRoles
    : [UserRole.PLAYER, UserRole.HOST];
  const order = [
    ...preferred,
    ...[UserRole.PLAYER, UserRole.HOST].filter(
      (role) => !preferred.includes(role),
    ),
  ];

  for (const role of order) {
    const token = cookies[SESSION_COOKIES[role].access];
    if (token) {
      return token;
    }
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: extractAccessToken,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * 반환값이 `req.user`가 된다.
   *
   * 여기서 DB를 조회하지 않는다 — 인증이 필요한 모든 요청에 유저 조회가 한 번씩
   * 붙는다. 정지 여부처럼 최신값이 필요한 검사는 그 값을 실제로 쓰는 서비스에서 한다.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, role: payload.role };
  }
}
