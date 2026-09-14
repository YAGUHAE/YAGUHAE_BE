import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AuthenticatedUser } from '../types/jwt-payload.type';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const contextWith = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const requireRoles = (roles: UserRole[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  /** toThrow(expect.objectContaining(...))는 인자가 any로 흘러 린트 경고가 난다 */
  const captureError = (run: () => unknown): BusinessException => {
    try {
      run();
    } catch (error) {
      return error as BusinessException;
    }
    throw new Error('예외가 발생하지 않았습니다.');
  };

  it('@Roles()가 없는 라우트는 통과시킨다', () => {
    requireRoles(undefined);

    expect(guard.canActivate(contextWith())).toBe(true);
  });

  it('역할이 맞으면 통과', () => {
    requireRoles([UserRole.HOST]);

    expect(guard.canActivate(contextWith({ id: 1, role: UserRole.HOST }))).toBe(
      true,
    );
  });

  it('역할이 다르면 403 FORBIDDEN', () => {
    requireRoles([UserRole.HOST]);

    const error = captureError(() =>
      guard.canActivate(contextWith({ id: 1, role: UserRole.PLAYER })),
    );

    expect(error).toMatchObject({
      code: 'FORBIDDEN',
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('인증되지 않은 요청은 401', () => {
    requireRoles([UserRole.HOST]);

    expect(captureError(() => guard.canActivate(contextWith()))).toMatchObject({
      code: 'UNAUTHORIZED',
      status: HttpStatus.UNAUTHORIZED,
    });
  });
});
