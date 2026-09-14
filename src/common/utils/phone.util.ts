/** 국내 휴대폰 번호를 E.164로 바꿀 때 붙이는 국가번호 */
const KR_COUNTRY_CODE = '+82';

/**
 * 휴대폰 번호를 E.164로 정규화한다 (ERD §2.1).
 *
 * 입력이 두 갈래라 한 함수로 모은다:
 * - 카카오는 `+82 10-1234-5678` 형태로 준다 (동의항목을 받은 경우)
 * - 온보딩 입력은 `010-1234-5678`처럼 국내 표기로 들어온다.
 *   사용자에게 E.164를 직접 입력하라고 요구할 수는 없다.
 *
 * 저장 형식을 하나로 고정하는 이유는 알림톡 발송이 번호를 그대로 쓰기 때문이다.
 * 표기가 섞이면 같은 사람이 두 번호로 보이고 중복 발송·미발송이 갈린다.
 *
 * 판별할 수 없으면 `null`이다. 카카오 경로에서는 "동의하지 않음"을 뜻하고,
 * 입력 경로에서는 검증 실패로 이어진다.
 */
export function toE164Phone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const compact = raw.replace(/[\s-]/g, '');

  // 국내 표기: 0으로 시작하는 9~10자리 + 선행 0을 국가번호로 교체
  if (/^0\d{9,10}$/.test(compact)) {
    return `${KR_COUNTRY_CODE}${compact.slice(1)}`;
  }

  return /^\+\d{8,15}$/.test(compact) ? compact : null;
}
