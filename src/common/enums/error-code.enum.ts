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

  // --- auth ---
  /** 이메일 또는 비밀번호 불일치. 어느 쪽이 틀렸는지 구분하지 않는다 */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** users.is_suspended = true (노쇼 2회) */
  USER_SUSPENDED = 'USER_SUSPENDED',
  /** refresh 토큰이 없거나 서명·만료·무효화 검증에 실패 */
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  /** PLAYER·HOST refresh 쿠키가 둘 다 있어 어느 세션을 갱신할지 정할 수 없음 */
  SESSION_AMBIGUOUS = 'SESSION_AMBIGUOUS',

  // --- bank ---
  /** 하나 이상의 League가 이 계좌를 참조 중이라 삭제할 수 없음 */
  BANK_IN_USE = 'BANK_IN_USE',

  // --- league ---
  /** 리그가 참조하려는 계좌가 존재하지 않음 */
  BANK_NOT_FOUND = 'BANK_NOT_FOUND',
}
