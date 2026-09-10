import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/** `JwtAuthGuard`를 통과한 라우트에서만 값이 있다 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser | undefined;
  },
);
