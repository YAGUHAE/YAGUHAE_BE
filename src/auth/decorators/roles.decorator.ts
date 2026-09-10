import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * 이 라우트를 어떤 역할이 호출할 수 있는지 선언한다 (ERD §7).
 *
 * `RolesGuard`가 이 메타데이터를 읽어 강제하고, `JwtAuthGuard`는 같은 값을 보고
 * 어느 세션 쿠키를 읽을지 고른다 — PLAYER·HOST 쿠키가 공존하기 때문이다.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
