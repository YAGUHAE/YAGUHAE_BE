import { UserRole } from '../../common/enums';

/** access·refresh 토큰이 공유하는 페이로드 */
export interface JwtPayload {
  /** users.id */
  sub: number;
  /** 어느 세션인지 구분한다 — 같은 브라우저에 PLAYER·HOST 세션이 공존한다 (API 명세서 §1.1) */
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * 가드를 통과한 요청의 `req.user`.
 *
 * DB를 다시 조회하지 않고 토큰이 말하는 것만 담는다. 정지 여부처럼 시시각각
 * 변하는 상태는 여기에 두면 안 된다 — 토큰 수명만큼 낡은 값이 된다.
 */
export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

/** RefreshTokenGuard가 확정한 refresh 토큰. 원문이 있어야 해시를 만들어 대조할 수 있다 */
export interface RefreshTokenContext {
  raw: string;
  payload: JwtPayload;
}
