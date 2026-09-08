export enum ReservationStatus {
  /** 자리 점유 완료, 입금 대기 */
  RESERVED = 'RESERVED',
  /** 입금 완료 체크 */
  PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED',
  /** 주최자 입금 확인 (포지션은 신청 시 이미 확정) */
  APPROVED = 'APPROVED',
  /** 24h 미입금 자동 취소 → 슬롯 해제 */
  EXPIRED = 'EXPIRED',
  /** 사용자 취소 → 슬롯 해제 */
  CANCELLED = 'CANCELLED',
  /** 주최자 거절 → 슬롯 해제 */
  REJECTED = 'REJECTED',
  /** 경기 후 노쇼 처리 */
  NO_SHOW = 'NO_SHOW',
  /** 참가 완료 */
  ATTENDED = 'ATTENDED',
}

/** 자리를 점유하고 있는 상태들 — 중복 신청 방지 부분 유니크 인덱스의 조건 (ERD §6) */
export const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.RESERVED,
  ReservationStatus.PAYMENT_SUBMITTED,
  ReservationStatus.APPROVED,
] as const;

/** 거절 사유 — 자유 텍스트를 받지 않는다 (알림톡 템플릿이 고정 문구라 enum이어야 매핑됨, ERD §2.7) */
export enum RejectReason {
  NOT_DEPOSITED = 'NOT_DEPOSITED',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  DUPLICATE = 'DUPLICATE',
  OTHER = 'OTHER',
}

/** 상태 이력의 행위 주체 (ERD §2.10) */
export enum HistoryActor {
  PLAYER = 'PLAYER',
  HOST = 'HOST',
  SYSTEM = 'SYSTEM',
}
