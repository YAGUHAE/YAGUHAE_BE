import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserRole } from '../../common/enums';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { SESSION_COOKIES } from '../constants/cookie.constant';
import { JwtPayload } from '../types/jwt-payload.type';

interface RefreshRequestBody {
  refreshToken?: unknown;
  session?: unknown;
}

/**
 * `POST /auth/refresh`가 갱신할 refresh 토큰을 **하나로 확정**하고 서명을 검증한다.
 *
 * DB 대조(무효화 여부)는 하지 않는다 — 그건 토큰 해시를 아는 `AuthService`의 몫이다.
 * 이 가드는 "요청에서 어떤 토큰을 쓸 것인가"만 답한다.
 *
 * 확정이 필요한 이유: 용병·어드민 refresh 쿠키가 같은 브라우저에 공존한다.
 * 둘 다 있는데 아무거나 고르면 **엉뚱한 세션이 조용히 갱신된다** — 침묵보다
 * 422로 되묻는 편이 낫다.
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const raw = this.resolveToken(request);

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(raw, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new BusinessException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        '유효하지 않은 refresh 토큰입니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.refreshToken = { raw, payload };
    return true;
  }

  private resolveToken(request: Request): string {
    const body = (request.body ?? {}) as RefreshRequestBody;

    // 헤더 우선 원칙과 같은 이유 — 쿠키를 안 쓰는 클라이언트가 있다.
    if (typeof body.refreshToken === 'string' && body.refreshToken.length > 0) {
      return body.refreshToken;
    }

    const cookies = (request.cookies ?? {}) as Record<
      string,
      string | undefined
    >;

    if (typeof body.session === 'string' && body.session in SESSION_COOKIES) {
      const token = cookies[SESSION_COOKIES[body.session as UserRole].refresh];
      if (!token) {
        throw this.missingToken();
      }
      return token;
    }

    const present = Object.values(SESSION_COOKIES)
      .map((names) => cookies[names.refresh])
      .filter((token): token is string => Boolean(token));

    if (present.length === 0) {
      throw this.missingToken();
    }

    if (present.length > 1) {
      throw new BusinessException(
        ErrorCode.SESSION_AMBIGUOUS,
        '갱신할 세션을 지정해야 합니다. session에 PLAYER 또는 HOST를 담아 주세요.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return present[0];
  }

  private missingToken() {
    return new BusinessException(
      ErrorCode.INVALID_REFRESH_TOKEN,
      'refresh 토큰이 없습니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
