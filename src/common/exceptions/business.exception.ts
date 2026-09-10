import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * 도메인 에러 코드를 실어 나르는 예외.
 *
 * `NotFoundException` 같은 Nest 기본 예외는 상태 코드만 갖고 있어서, 응답에
 * `code`를 넣으려면 상태 코드에서 역산하는 수밖에 없다. 같은 409를 쓰는 코드가
 * 여럿인 이상 그 역산은 틀린다 — 구체적인 코드가 필요한 자리에서는 이 예외를 쓴다.
 *
 * 상태 코드만으로 충분한 경우(단순 404 등)에는 Nest 기본 예외를 그대로 써도 된다.
 * 전역 필터가 상태 코드로 기본 `code`를 채운다.
 */
export class BusinessException extends HttpException {
  constructor(
    readonly code: ErrorCode | string,
    message: string,
    statusCode: HttpStatus,
    /** 클라이언트가 실패를 복구하는 데 필요한 구조화 정보 (API 명세서 §0.1) */
    readonly detail?: Record<string, unknown>,
  ) {
    super({ code, message, detail }, statusCode);
  }
}
