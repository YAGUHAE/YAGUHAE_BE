import { KakaoProfile } from 'passport-kakao';
import { OAuthProvider } from '../../common/enums';
import { normalizePhone, toKakaoAccount } from './kakao.strategy';

describe('normalizePhone', () => {
  it('카카오가 주는 +82 10-1234-5678 을 E.164 로 정규화한다', () => {
    expect(normalizePhone('+82 10-1234-5678')).toBe('+821012345678');
  });

  it('동의하지 않아 값이 없으면 null (알림톡을 건너뛴다)', () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('E.164 형태가 아니면 저장하지 않는다', () => {
    expect(normalizePhone('010-1234-5678')).toBeNull();
    expect(normalizePhone('전화번호없음')).toBeNull();
  });
});

describe('toKakaoAccount', () => {
  const profile = (json: KakaoProfile['_json']): KakaoProfile => ({
    id: 12345,
    _json: json,
  });

  it('kakao_account.profile.nickname 을 우선 쓴다', () => {
    expect(
      toKakaoAccount(
        profile({
          kakao_account: {
            profile: { nickname: '용병' },
            phone_number: '+82 10-1111-2222',
          },
          properties: { nickname: '대체' },
        }),
      ),
    ).toEqual({
      provider: OAuthProvider.KAKAO,
      providerId: '12345',
      nickname: '용병',
      phone: '+821011112222',
    });
  });

  it('nickname 동의가 없으면 빈 문자열 — 온보딩에서 채운다', () => {
    expect(toKakaoAccount(profile({})).nickname).toBe('');
  });

  it('providerId 는 항상 문자열이다 (카카오는 숫자로 준다)', () => {
    expect(toKakaoAccount(profile({})).providerId).toBe('12345');
  });
});
