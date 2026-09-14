import { toE164Phone } from './phone.util';

describe('toE164Phone', () => {
  describe('카카오가 주는 형태', () => {
    it('+82 10-1234-5678 을 E.164 로 정규화한다', () => {
      expect(toE164Phone('+82 10-1234-5678')).toBe('+821012345678');
    });

    it('동의하지 않아 값이 없으면 null (알림톡을 건너뛴다)', () => {
      expect(toE164Phone(undefined)).toBeNull();
      expect(toE164Phone(null)).toBeNull();
      expect(toE164Phone('')).toBeNull();
    });
  });

  describe('온보딩에서 입력하는 형태', () => {
    it('국내 표기를 국가번호로 바꾼다 — 사용자에게 E.164를 요구할 수 없다', () => {
      expect(toE164Phone('010-1234-5678')).toBe('+821012345678');
      expect(toE164Phone('01012345678')).toBe('+821012345678');
      expect(toE164Phone('010 1234 5678')).toBe('+821012345678');
    });

    it('9자리 국내 번호도 받는다', () => {
      expect(toE164Phone('011-234-5678')).toBe('+82112345678');
    });
  });

  it('판별할 수 없으면 null', () => {
    expect(toE164Phone('1234')).toBeNull();
    expect(toE164Phone('전화번호없음')).toBeNull();
    expect(toE164Phone('+82')).toBeNull();
  });

  it('이미 정규화된 값은 그대로 통과한다 (재저장이 값을 바꾸지 않는다)', () => {
    expect(toE164Phone('+821012345678')).toBe('+821012345678');
  });
});
