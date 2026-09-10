/**
 * API 명세서 §0.2 — 공통 에러 코드.
 *
 * HTTP 상태 코드만으로는 클라이언트가 분기할 수 없다. 같은 409라도 "이미 승인된
 * 예약"과 "사용 중인 계좌"는 화면 처리가 다르기 때문에, 상태 코드와 별개로
 * 기계가 읽을 수 있는 코드를 응답에 싣는다.
 *
 * 도메인별 코드(INVALID_CREDENTIALS, POSITION_FULL 등)는 각 모듈이 이 파일에
 * 이어서 추가한다. 여기 있는 것은 어느 모듈에서나 나올 수 있는 공통 코드뿐이다.
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
