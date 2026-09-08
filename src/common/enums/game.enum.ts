export enum Position {
  SP = 'SP',
  RP = 'RP',
  C = 'C',
  DH = 'DH',
  FIRST = 'FIRST',
  SECOND = 'SECOND',
  THIRD = 'THIRD',
  SS = 'SS',
  LF = 'LF',
  CF = 'CF',
  RF = 'RF',
}

export const POSITION_LABEL: Record<Position, string> = {
  [Position.SP]: '선발투수',
  [Position.RP]: '구원투수',
  [Position.C]: '포수',
  [Position.DH]: '지명타자',
  [Position.FIRST]: '1루수',
  [Position.SECOND]: '2루수',
  [Position.THIRD]: '3루수',
  [Position.SS]: '유격수',
  [Position.LF]: '좌익수',
  [Position.CF]: '중견수',
  [Position.RF]: '우익수',
};

/** 경기 내 편 구분 — 상설 클럽이 아니다 (ERD §0.2) */
export enum Team {
  HOME = 'HOME',
  AWAY = 'AWAY',
}

export const TEAM_LABEL: Record<Team, string> = {
  [Team.HOME]: '홈',
  [Team.AWAY]: '원정',
};

export enum GameStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/** 참가비 티어 — 포지션 11종이 아니라 4종으로 묶어 가격을 정한다 (ERD §2.5) */
export enum FeeTier {
  PITCHER = 'PITCHER',
  CATCHER = 'CATCHER',
  FIELDER = 'FIELDER',
  DH = 'DH',
}

export const FEE_TIER_LABEL: Record<FeeTier, string> = {
  [FeeTier.PITCHER]: '투수',
  [FeeTier.CATCHER]: '포수',
  [FeeTier.FIELDER]: '야수',
  [FeeTier.DH]: '지타',
};

/**
 * Position → FeeTier 매핑은 서버가 소유한다 (프론트가 추론하지 않음).
 * 이 표는 "지금 새 경기를 만들 때의 기본값"이며, 개설 시
 * game_positions.fee_tier로 복사되므로 표가 바뀌어도 기존 경기는 흔들리지 않는다 (ERD §1).
 */
export const POSITION_FEE_TIER: Record<Position, FeeTier> = {
  [Position.SP]: FeeTier.PITCHER,
  [Position.RP]: FeeTier.PITCHER,
  [Position.C]: FeeTier.CATCHER,
  [Position.DH]: FeeTier.DH,
  [Position.FIRST]: FeeTier.FIELDER,
  [Position.SECOND]: FeeTier.FIELDER,
  [Position.THIRD]: FeeTier.FIELDER,
  [Position.SS]: FeeTier.FIELDER,
  [Position.LF]: FeeTier.FIELDER,
  [Position.CF]: FeeTier.FIELDER,
  [Position.RF]: FeeTier.FIELDER,
};

/** 자리 단위 출석 결과 — 예약 단위 상태(ATTENDED/NO_SHOW)와 다른 층위 (ERD §2.6) */
export enum AttendanceResult {
  PRESENT = 'PRESENT',
  NO_SHOW = 'NO_SHOW',
}
