import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UserRole } from '../../common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 어느 세션 쿠키를 읽을지 결정하려면 라우트가 요구하는 역할을 알아야 한다.
    // passport 추출기는 Request만 받으므로 요청에 실어 전달한다.
    const request = context.switchToHttp().getRequest<Request>();
    request.requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    return super.canActivate(context);
  }
}
