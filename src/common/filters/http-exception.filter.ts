import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-code.enum';

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  detail?: Record<string, unknown>;
}

/** 구체적인 코드가 없는 예외에 상태 코드로 기본값을 채운다 (API 명세서 §0.2) */
const DEFAULT_CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  // ValidationPipe가 422를 쓰므로 400은 JSON 파싱 실패처럼 요청 자체가 깨진 경우다.
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_FAILED,
};

interface ExceptionPayload {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiErrorResponse = {
      success: false,
      ...this.describe(exception, statusCode),
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 5xx는 우리 버그다. 스택을 남기지 않으면 응답만 보고는 원인을 찾을 수 없다.
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json(body);
  }

  private describe(
    exception: unknown,
    statusCode: number,
  ): Pick<ApiErrorResponse, 'code' | 'message' | 'detail'> {
    const fallbackCode =
      DEFAULT_CODE_BY_STATUS[statusCode] ?? ErrorCode.INTERNAL_ERROR;

    if (!(exception instanceof HttpException)) {
      // 예상치 못한 예외의 메시지에는 쿼리문·경로 같은 내부 정보가 섞인다.
      return {
        code: ErrorCode.INTERNAL_ERROR,
        message: '서버 오류가 발생했습니다.',
      };
    }

    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { code: fallbackCode, message: payload };
    }

    const { code, message, detail } = payload as ExceptionPayload;

    // ValidationPipe는 필드별 메시지를 배열로 준다. 계약상 message는 문자열이므로
    // 대표 문구만 남기고 전체 목록은 detail로 내린다.
    const messages = Array.isArray(message) ? message.map(String) : null;

    return {
      code: typeof code === 'string' ? code : fallbackCode,
      message: messages
        ? (messages[0] ?? exception.message)
        : typeof message === 'string'
          ? message
          : exception.message,
      detail:
        (detail as Record<string, unknown> | undefined) ??
        (messages ? { messages } : undefined),
    };
  }
}
