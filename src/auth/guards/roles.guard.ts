import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../../common/enums';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * `@Roles()`가 붙은 라우트의 역할을 강제한다 (ERD §7).
 *
 * 인증 자체는 하지 않으므로 반드시 `JwtAuthGuard` 뒤에 붙인다:
 * `@UseGuards(JwtAuthGuard, RolesGuard)`
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        '인증이 필요합니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!roles.includes(user.role)) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '이 작업을 수행할 권한이 없습니다.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
