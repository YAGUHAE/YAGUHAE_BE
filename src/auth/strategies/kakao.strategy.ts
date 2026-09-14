import { Injectable } from '@nestjs/common';
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

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      // 카카오 앱에서 "보안 > Client Secret"을 켠 경우에만 필요하다.
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET', ''),
      callbackURL: configService.getOrThrow<string>('KAKAO_CALLBACK_URL'),
    });
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
