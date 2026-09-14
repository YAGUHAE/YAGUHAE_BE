import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../common/enums';
import { AuthenticatedUser } from '../types/jwt-payload.type';
import { OwnershipGuard } from './ownership.guard';

const RESOURCE_ID = '00000000-0000-4000-8000-000000000001';

/** 소유자 조회만 구현한 최소 구현체 — 가드의 거절 규칙만 본다 */
class TestOwnershipGuard extends OwnershipGuard {
  constructor(private readonly ownerId: number | undefined) {
    super();
  }

  protected findOwnerId(): Promise<number | undefined> {
    return Promise.resolve(this.ownerId);
  }
}

const contextWith = (
  user: AuthenticatedUser | undefined,
  id: string | undefined,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () =>
        ({
          user,
          params: id === undefined ? {} : { id },
        }) as unknown as Request,
    }),
  }) as ExecutionContext;

const captureError = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('에러가 발생하지 않았다');
};

describe('OwnershipGuard', () => {
  const owner: AuthenticatedUser = { id: 7, role: UserRole.HOST };

  it('소유자 본인이면 통과한다', async () => {
    const guard = new TestOwnershipGuard(7);

    await expect(
      guard.canActivate(contextWith(owner, RESOURCE_ID)),
    ).resolves.toBe(true);
  });

  it('남의 리소스는 403 FORBIDDEN', async () => {
    const guard = new TestOwnershipGuard(99);

    await expect(
      guard.canActivate(contextWith(owner, RESOURCE_ID)),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('없는 리소스는 404 NOT_FOUND', async () => {
    const guard = new TestOwnershipGuard(undefined);

    await expect(
      guard.canActivate(contextWith(owner, RESOURCE_ID)),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('인증 정보가 없으면 401 — JwtAuthGuard 뒤에 붙는 전제를 지킨다', async () => {
    const guard = new TestOwnershipGuard(7);

    await expect(
      guard.canActivate(contextWith(undefined, RESOURCE_ID)),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  /**
   * 가드는 ParseUUIDPipe보다 먼저 돈다. 여기서 형식을 보지 않으면 uuid가 아닌
   * 값이 그대로 쿼리로 내려가 22P02로 500이 난다.
   */
  it('uuid가 아닌 id는 소유자를 조회하지 않고 400', async () => {
    const guard = new TestOwnershipGuard(7);
    const findOwnerId = jest.spyOn(
      guard as unknown as { findOwnerId: () => Promise<number> },
      'findOwnerId',
    );

    const error = await captureError(() =>
      guard.canActivate(contextWith(owner, 'not-a-uuid')),
    );

    expect(error).toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(findOwnerId).not.toHaveBeenCalled();
  });

  it('id 파라미터가 아예 없으면 400', async () => {
    const guard = new TestOwnershipGuard(7);

    await expect(
      guard.canActivate(contextWith(owner, undefined)),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });
});
