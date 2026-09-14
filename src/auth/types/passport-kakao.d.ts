/**
 * passport-kakao는 타입 선언을 제공하지 않고 DefinitelyTyped에도 없다.
 * 실제로 쓰는 표면만 선언한다 — 전체를 any로 두면 프로필 파싱에서
 * no-unsafe-* 가 줄줄이 뜨고 오탈자를 컴파일러가 잡지 못한다.
 */
declare module 'passport-kakao' {
  import { Request } from 'express';
  import { Strategy as PassportStrategy } from 'passport';

  export interface KakaoProfile {
    id: number | string;
    username?: string;
    displayName?: string;
    _json?: {
      id?: number;
      kakao_account?: {
        email?: string;
        phone_number?: string;
        profile?: { nickname?: string };
      };
      properties?: { nickname?: string };
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export type VerifyCallback = (
    error: unknown,
    user?: Express.User | false,
    info?: unknown,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: KakaoProfile,
        done: VerifyCallback,
      ) => void | Promise<void>,
    );
    authenticate(req: Request, options?: unknown): void;
  }
}
