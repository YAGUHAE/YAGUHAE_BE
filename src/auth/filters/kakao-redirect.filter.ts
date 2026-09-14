import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ErrorCode } from '../../common/enums/error-code.enum';

/**
 * 카카오 로그인 경로의 실패를 **JSON이 아니라 리다이렉트로** 되돌린다
 * (API 명세서 §1.2).
 *
 * 이 두 라우트는 브라우저가 주소창으로 직접 들어오는 곳이라, 전역 필터가
 * 내보내는 에러 봉투 JSON을 사용자가 그대로 보게 된다. 목적지만 바꿔
 * 프론트 로그인 화면에서 안내하도록 넘긴다.
 */
@Catch()
export class KakaoRedirectFilter implements ExceptionFilter {
  private readonly logger = new Logger(KakaoRedirectFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const frontOrigin = this.configService.get<string>(
      'FRONT_ORIGIN',
      this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    );

    // message 만 쓰면 'Failed to obtain access token' 이라는 상수 문자열뿐이다.
    // 실제 원인(KOE006 등)은 passport-oauth2 의 InternalOAuthError 가
    // oauthError 에 담아두고 toString() 에서만 꺼낸다. 이게 없으면 콘솔 설정
    // 실수인지 서버 버그인지 구분할 방법이 없다.
    this.logger.warn(
      `카카오 로그인 실패: ${exception instanceof Error ? exception.toString() : String(exception)}`,
    );

    response.redirect(
      `${frontOrigin}/login?error=${encodeURIComponent(this.codeOf(exception))}`,
    );
  }

  /** 에러 코드만 넘긴다. 원인 문구를 쿼리스트링에 실으면 브라우저 히스토리에 남는다 */
  private codeOf(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return ErrorCode.INTERNAL_ERROR;
    }

    const payload = exception.getResponse();
    const code =
      typeof payload === 'object' && payload !== null
        ? (payload as { code?: unknown }).code
        : undefined;

    return typeof code === 'string' ? code : ErrorCode.UNAUTHORIZED;
  }
}
