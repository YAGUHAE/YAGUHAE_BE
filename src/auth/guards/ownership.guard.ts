import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/** 경로 파라미터가 uuid인지 본다 — ParseUUIDPipe와 같은 판정을 가드에서 먼저 한다 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 경로가 가리키는 리소스의 소유자가 요청자인지 확인한다 (ERD §7).
 *
 * 인증 자체는 하지 않으므로 반드시 `JwtAuthGuard` 뒤에 붙인다.
 *
 * 리소스마다 소유자를 찾는 법이 달라서(`leagues.host_id`, `games.host_id`,
 * `reservations.reserver_id` …) 조회만 하위 클래스가 구현한다. 가드가 거절하는
 * 규칙 — 없으면 404, 남의 것이면 403 — 은 한 곳에 모아둔다. 규칙이 흩어지면
 * 리소스마다 다른 상태 코드가 나가고 프론트가 분기를 리소스별로 짜게 된다.
 */
@Injectable()
export abstract class OwnershipGuard implements CanActivate {
  /** 소유자의 `users.id`. 리소스가 없으면 undefined */
  protected abstract findOwnerId(
    resourceId: string,
  ): Promise<number | undefined>;

  /** 소유자를 찾을 id가 담긴 경로 파라미터 이름 */
  protected readonly paramName: string = 'id';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        '인증이 필요합니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 와일드카드 라우트에서는 배열이 올 수 있어 타입이 string | string[] 이다.
    const resourceId = request.params[this.paramName];

    // 가드가 파이프보다 먼저 돌기 때문에 여기서 형식을 보지 않으면 uuid가 아닌
    // 값이 그대로 쿼리로 내려가 22P02(invalid input syntax)로 500이 된다.
    if (typeof resourceId !== 'string' || !UUID_PATTERN.test(resourceId)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        '잘못된 형식의 id 입니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ownerId = await this.findOwnerId(resourceId);

    if (ownerId === undefined) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '존재하지 않는 리소스입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (ownerId !== user.id) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '이 작업을 수행할 권한이 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
