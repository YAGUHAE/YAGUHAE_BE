import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { KakaoProfile, Strategy } from 'passport-kakao';
import { OAuthProvider } from '../../common/enums';

/** 카카오가 내려준 값 중 우리가 쓰는 것만 추린 형태 */
export interface KakaoAccount {
  provider: OAuthProvider;
  providerId: string;
  nickname: string;
  phone: string | null;
}

/**
 * 카카오 휴대폰 번호는 `+82 10-1234-5678` 형태로 온다.
 * ERD §2.1은 E.164 정규화 저장을 요구하므로 공백·하이픈을 털어낸다.
 * 동의하지 않으면 필드 자체가 없으므로 null을 허용한다 — 없으면 알림톡을
 * 건너뛰고 앱 내 알림만 남긴다(ERD §2.9).
 */
export function normalizePhone(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const compact = raw.replace(/[\s-]/g, '');
  return /^\+\d{8,15}$/.test(compact) ? compact : null;
}

export function toKakaoAccount(profile: KakaoProfile): KakaoAccount {
  const account = profile._json?.kakao_account;

  return {
    provider: OAuthProvider.KAKAO,
    providerId: String(profile.id),
    // 닉네임 동의를 받지 못하면 빈 문자열이 되고, 온보딩에서 채우게 된다.
    nickname:
      account?.profile?.nickname ??
      profile._json?.properties?.nickname ??
      profile.displayName ??
      '',
    phone: normalizePhone(account?.phone_number),
  };
}

/**
 * `ConfigService.getOrThrow`는 키가 **없을 때만** 던지고 빈 문자열은 통과시킨다.
 * `.env.example`을 그대로 복사하면 값이 비어 있어 그대로 passport로 들어가고,
 * `OAuth2Strategy requires a clientID option`이라는 영어 TypeError로 부팅이
 * 깨진다 — 카카오와 무관한 작업을 하려던 사람이 원인을 찾기 어렵다.
 */
export function requireKakaoEnv(name: string, raw: string | undefined): string {
  if (!raw) {
    throw new Error(
      `${name}가 비어 있습니다. 카카오 개발자 콘솔에서 값을 받아 .env에 채워 주세요. (docs/카카오 로그인 설정.md)`,
    );
  }

  return raw;
}

/**
 * 요청할 동의항목.
 *
 * 생략하면 콘솔에 설정된 동의항목대로 동의 화면이 뜨므로 지금도 동작은 한다.
 * 그럼에도 명시하는 이유는 **이미 가입한 사용자에게 추가 동의를 다시 물으려면**
 * scope를 실어 보내야 하기 때문이다 — 비즈 앱 심사가 통과돼 phone_number를 켤 때
 * 콘솔 설정만 바꿔서는 기존 사용자의 번호를 받을 수 없다.
 *
 * 환경변수로 뺀 것은 그 전환을 재배포 없이 하기 위함이다. 다만 **콘솔에 켜지지
 * 않은 항목을 보내면 인가 요청 자체가 거부되므로** 콘솔 설정과 반드시 일치해야 한다.
 */
export const DEFAULT_KAKAO_SCOPE = ['profile_nickname'];

export function parseScope(raw: string | undefined): string[] {
  const scopes = (raw ?? '')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return scopes.length > 0 ? scopes : DEFAULT_KAKAO_SCOPE;
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(configService: ConfigService) {
    super({
      clientID: requireKakaoEnv(
        'KAKAO_CLIENT_ID',
        configService.get<string>('KAKAO_CLIENT_ID'),
      ),
      /**
       * 비워둘 수 없다. passport-kakao는 falsy면 `'kakao'`라는 **리터럴 더미**로
       * 바꿔 넣고(DEFAULT_CLIENT_SECRET), oauth 라이브러리는 토큰 요청에 항상
       * client_secret을 싣는다. 즉 "안 보내기"는 불가능하고, 콘솔에서 Client
       * Secret을 켜 두면 그 더미 값으로 교환이 실패한다. 실패는 사용자가 동의를
       * 마친 뒤에야 드러나고 원인은 카카오 응답 본문에만 남는다.
       */
      clientSecret: requireKakaoEnv(
        'KAKAO_CLIENT_SECRET',
        configService.get<string>('KAKAO_CLIENT_SECRET'),
      ),
      callbackURL: requireKakaoEnv(
        'KAKAO_CALLBACK_URL',
        configService.get<string>('KAKAO_CALLBACK_URL'),
      ),
      scope: parseScope(configService.get<string>('KAKAO_SCOPE')),
    });

    new Logger(KakaoStrategy.name).log(
      `카카오 동의항목: ${parseScope(configService.get<string>('KAKAO_SCOPE')).join(', ')}`,
    );
  }

  /**
   * 반환값이 `req.user`가 된다. 여기서 DB를 건드리지 않는다 —
   * 가입/조회는 콜백 핸들러가 AuthService를 통해 한 트랜잭션으로 처리한다.
   */
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: KakaoProfile,
  ): KakaoAccount {
    return toKakaoAccount(profile);
  }
}
