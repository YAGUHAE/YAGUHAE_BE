/** ERD §1 — DB에는 이 키(ASCII)가 그대로 저장된다. 한글 표시값은 아래 라벨 맵으로 변환한다. */
export enum UserRole {
  PLAYER = 'PLAYER',
  HOST = 'HOST',
}

/** 추후 NAVER, GOOGLE 등으로 확장 (ERD §2.1) */
export enum OAuthProvider {
  KAKAO = 'KAKAO',
}

export enum LevelEnum {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
}

export const LEVEL_LABEL: Record<LevelEnum, string> = {
  [LevelEnum.L1]: '1부',
  [LevelEnum.L2]: '2부',
  [LevelEnum.L3]: '3부',
  [LevelEnum.L4]: '4부',
};
