import { UserRole } from '../../common/enums';
import { RefreshTokenContext } from './jwt-payload.type';

declare global {
  namespace Express {
    interface Request {
      /** `JwtAuthGuard`가 `@Roles()`에서 읽어 심는다. access 쿠키 선택에 쓰인다 */
      requiredRoles?: UserRole[];
      /** `RefreshTokenGuard`가 확정한 refresh 토큰 */
      refreshToken?: RefreshTokenContext;
    }
  }
}

export {};
