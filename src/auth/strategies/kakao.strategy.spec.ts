import { KakaoProfile } from 'passport-kakao';
import { OAuthProvider } from '../../common/enums';
import {
  DEFAULT_KAKAO_SCOPE,
  parseScope,
  requireKakaoEnv,
  toKakaoAccount,
} from './kakao.strategy';

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

describe('parseScope', () => {
  it('비어 있으면 기본 동의항목만 요청한다', () => {
    expect(parseScope(undefined)).toEqual(DEFAULT_KAKAO_SCOPE);
    expect(parseScope('')).toEqual(DEFAULT_KAKAO_SCOPE);
    expect(parseScope('  ,  ')).toEqual(DEFAULT_KAKAO_SCOPE);
  });

  it('쉼표로 나누고 공백을 털어낸다', () => {
    expect(parseScope('profile_nickname, phone_number')).toEqual([
      'profile_nickname',
      'phone_number',
    ]);
  });
});

describe('requireKakaoEnv', () => {
  it('값이 있으면 그대로 돌려준다', () => {
    expect(requireKakaoEnv('KAKAO_CLIENT_ID', 'abc')).toBe('abc');
  });

  /**
   * ConfigService.getOrThrow 는 키가 없을 때만 던진다. .env.example 을 그대로
   * 복사하면 빈 문자열이 통과해 passport 가 영어 TypeError 로 부팅을 깨뜨린다.
   */
  it('빈 문자열도 거부하고 무엇을 채워야 하는지 알려준다', () => {
    expect(() => requireKakaoEnv('KAKAO_CLIENT_SECRET', '')).toThrow(
      /KAKAO_CLIENT_SECRET/,
    );
    expect(() => requireKakaoEnv('KAKAO_CLIENT_ID', undefined)).toThrow(/채워/);
  });
});
