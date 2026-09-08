export enum NotificationType {
  EXPIRING_12H = 'EXPIRING_12H',
  EXPIRING_1H = 'EXPIRING_1H',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NO_SHOW_MARKED = 'NO_SHOW_MARKED',
  /** P1-2 대비 — MVP에서는 발송하지 않는다 (ERD §2.9) */
  WAITLIST_PROMOTED = 'WAITLIST_PROMOTED',
}

/** 카카오 알림톡 발송 상태 추적 (ERD §2.9) */
export enum NotificationSendStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}
