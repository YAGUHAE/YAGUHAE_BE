# API 명세서

# API 명세 (NestJS + TypeORM)

> **문서 정보**
> 
> - **최종 수정일:** 2026-07-10
> - **기반 문서:** ERD + 상태머신 (NestJS + TypeORM 재정비판 v3)
> - **범위:** REST 엔드포인트, 요청/응답 DTO, Guard 권한, 에러 케이스
> - **ORM 참고:** ORM이 Prisma → TypeORM으로 변경됐으나, 이 문서는 엔드포인트·DTO·에러 계약 위주라 ORM 종속 표현이 없어 본문 변경사항은 없음 (구현 세부는 ERD 문서 §4~6 참고).
> - **공통 규칙:** 모든 응답은 `{ data, error }` 형태. 인증 필요 엔드포인트는 `Authorization: Bearer <access_token>`.
- **전역 prefix:** 모든 엔드포인트는 `/api/v1`로 시작 (NestJS `app.setGlobalPrefix('api/v1')`).

---

## 0. 공통 사항

### 0.1 에러 응답 포맷

```json
{
  "data": null,
  "error": {
    "code": "RESERVATION_ALREADY_APPROVED",
    "message": "이미 승인된 예약입니다.",
    "statusCode": 409
  }
}
```

### 0.2 공통 에러 코드

| HTTP | code | 상황 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 토큰 없음/만료 |
| 403 | `FORBIDDEN` | 권한 없음 (Guard 실패) |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 상태 전이 조건 위반 (아래 리소스별 표에 세분화) |
| 422 | `VALIDATION_FAILED` | DTO 유효성 검증 실패 |

---

## 1. Auth

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/kakao` | 없음 | 카카오 OAuth 리다이렉트 (PLAYER) |
| GET | `/api/v1/auth/kakao/callback` | 없음 | 카카오 콜백 → JWT 발급 |
| POST | `/api/v1/auth/host/login` | 없음 | HOST 이메일 로그인 |
| POST | `/api/v1/auth/refresh` | RefreshTokenGuard | access token 재발급 |
| POST | `/api/v1/auth/logout` | JwtAuthGuard | refresh token 무효화 |

**`POST /api/v1/auth/host/login`**

```tsx
// Request
{ email: string; password: string }
// Response
{ accessToken: string; refreshToken: string; user: UserSummaryDto }
```

에러: `401 INVALID_CREDENTIALS`, `403 USER_SUSPENDED`

---

## 2. Users

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/users/me` | JwtAuthGuard | 내 전체 프로필 |
| PATCH | `/api/v1/users/me` | JwtAuthGuard | 내 프로필 수정 |
| GET | `/api/v1/users/:id` | JwtAuthGuard | 타인 공개 프로필 (선수 카드) |

> Guard 표(ERD 7장) 기준: 본인은 전체 관리, 타인은 공개 프로필만 — `GET /api/v1/users/:id` 응답 DTO에서 `email`, `provider`/`providerId` 등 민감 필드 제외.
> 

> ERD 변경 반영: `kakao_id` 단일 필드가 `provider`(OAuth 제공자 enum) + `providerId`로 일반화됐고, `uniqueplayUrl`이 `gamewonUrl`과 별도로 추가됐습니다.
> 

**`PATCH /api/v1/users/me`**

```tsx
// Request (부분 업데이트)
{
  nickname?: string;
  region?: string;
  primaryPosition?: Position;
  selfLevel?: LevelEnum;
  gamewonUrl?: string;
  uniqueplayUrl?: string;   // 신규
}
// Response: UserDetailDto
```

**`GET /api/v1/users/:id` Response (공개 프로필)**

```tsx
{
  id: string;
  nickname: string;
  region: string;
  primaryPosition: Position;
  selfLevel: LevelEnum;
  gamewonUrl: string | null;
  uniqueplayUrl: string | null;   // 신규
  evaluationSummary: {
    mannerAvg: number;
    skillMatchAvg: number;
    punctualityAvg: number;
    bestPlayerCount: number;
  };
}
```

> ✅ **확정:** `no_show_count`는 타인에게 노출하지 않음 — 공개 프로필 DTO에서 제외. `UserDetailDto`(본인 전용 `/users/me`)에는 계속 포함.
> 

---

## 3. Banks — **신규**

> ERD에 `Bank`(은행 정보) 테이블이 새로 생겼습니다. 입금 계좌 정보를 `games`에서 분리해 **리그 단위로 정규화**한 엔티티입니다 — 한 HOST가 여러 리그를 운영해도 같은 계좌를 재사용할 수 있고, 리그 생성 시 매번 계좌번호를 다시 입력할 필요가 없습니다.
> 

> ✅ **확정:** `Bank`는 리그 주최자와 반드시 같은 사람이 아닐 수 있어(예: 회계 담당자 명의) `host_id`를 두지 않기로 했습니다. 따라서 소유권 기반 `OwnershipGuard` 대신 **`RolesGuard('HOST')`만 적용** — HOST 역할이면 누구나 계좌를 등록/조회/수정할 수 있습니다. 이 트레이드오프상 "내 계좌만" 필터링은 불가능하므로 `GET /banks`는 전체 목록을 반환합니다.
> 

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/banks` | JwtAuthGuard + RolesGuard('HOST') | 등록된 계좌 전체 목록 (소유자 필터 없음) |
| POST | `/api/v1/banks` | JwtAuthGuard + RolesGuard('HOST') | 계좌 등록 |
| PATCH | `/api/v1/banks/:id` | JwtAuthGuard + RolesGuard('HOST') | 계좌 정보 수정 |
| DELETE | `/api/v1/banks/:id` | JwtAuthGuard + RolesGuard('HOST') | 계좌 삭제 (참조 중인 리그 있으면 거부) |

**`POST /api/v1/banks`**

```tsx
// Request
{ bankName: string; account: string; holder: string }
// Response: BankDto
```

에러: `403 FORBIDDEN` (role ≠ HOST)

**`DELETE /api/v1/banks/:id`**

에러: `409 BANK_IN_USE` (하나 이상의 League가 이 bank_id를 참조 중)

---

## 4. Leagues

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/leagues` | 없음 | 리그 목록 (공개) |
| GET | `/api/v1/leagues/:id` | 없음 | 리그 상세 |
| POST | `/api/v1/leagues` | JwtAuthGuard + RolesGuard('HOST') | 리그 생성 |
| PATCH | `/api/v1/leagues/:id` | JwtAuthGuard + OwnershipGuard | 리그 수정 |

**`POST /api/v1/leagues`**

```tsx
// Request
{
  name: string;
  region: string;
  stadiumName: string;   // ERD 변경: games → leagues로 이동
  bankId: string;        // ERD 변경: 신규 Bank 엔티티 참조 (games의 deposit* 필드 대체)
}
// Response: LeagueDto
```

**`GET /api/v1/leagues/:id` Response**

```tsx
{
  id: string; hostId: string; name: string; region: string;
  stadiumName: string;
  bank: BankDto;   // bankId를 조인해서 내려줌 (참가비 안내 화면에 그대로 필요)
  createdAt: string;
}
```

에러: `403 FORBIDDEN` (role ≠ HOST), `404 BANK_NOT_FOUND` (존재하지 않는 bankId)

> ✅ **확정:** 리그 내 모든 경기는 같은 경기장에서 진행 — `stadium_name`을 `games`가 아닌 `leagues`에 두는 것으로 확정.
> 

---

## 5. Games

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/games` | 없음 | 경기 목록 (필터: region, level, date) |
| GET | `/api/v1/games/:id` | 없음 | 경기 상세 (포지션별 잔여석 포함) |
| POST | `/api/v1/leagues/:leagueId/games` | JwtAuthGuard + OwnershipGuard | 경기 개설 |
| PATCH | `/api/v1/games/:id` | JwtAuthGuard + OwnershipGuard | 경기 수정 (OPEN 상태만) |
| POST | `/api/v1/games/:id/close` | JwtAuthGuard + OwnershipGuard | 주최자 수동 마감 |
| POST | `/api/v1/games/:id/cancel` | JwtAuthGuard + OwnershipGuard | 경기 취소 (활성 예약 연쇄 CANCELLED) |

**`POST /api/v1/leagues/:leagueId/games`**

```tsx
// Request
{
  gameDate: string;       // ISO date
  gameTime: string;       // HH:mm
  durationMin?: number;   // default 120
  requiredLevel?: LevelEnum;
  participationFee: number;
  positions: { position: Position; capacity: number }[];  // game_positions 동시 생성
}
// Response: GameDetailDto (positions 포함)
```

> ERD 변경 반영: `stadiumName`과 입금 계좌 3필드(`depositBank/Account/Holder`)는 `leagues`(+`banks`)로 이동했으므로 경기 생성 요청에서 제거했습니다. 경기 상세 화면에서 경기장/계좌를 보여줘야 하면 `GameDetailDto`가 league를 조인해서 내려줍니다.
> 

에러: `403 FORBIDDEN` (league.host_id ≠ user.id), `422 VALIDATION_FAILED` (capacity ≤ 0)

**`GET /api/v1/games/:id` Response**

```tsx
{
  id: string; leagueId: string;
  gameDate: string; gameTime: string; durationMin: number;
  requiredLevel: LevelEnum | null; participationFee: number;
  status: GameStatus;
  league: {                 // stadiumName·계좌 정보는 league 조인으로 제공 (ERD 변경)
    id: string; name: string; stadiumName: string; bank: BankDto;
  };
  positions: { position: Position; capacity: number; approvedCount: number; remaining: number }[];
}
```

**`POST /api/v1/games/:id/cancel`** — 연쇄 처리 주의사항: 이 엔드포인트는 트랜잭션 내에서 game.status=CANCELLED 갱신과 함께 활성 예약(RESERVED·PAYMENT_SUBMITTED·APPROVED) 전체를 CANCELLED로 일괄 전이시키고, 각 예약자에게 알림을 생성한다.

에러: `409 GAME_ALREADY_CLOSED`

---

## 6. Reservations

상태 전이 가드 조건(ERD 3.2)을 엔드포인트별 에러 케이스로 그대로 매핑합니다.

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| POST | `/api/v1/games/:gameId/reservations` | JwtAuthGuard + RolesGuard('PLAYER') | 예약 신청 (`reserve()`) |
| GET | `/api/v1/reservations/me` | JwtAuthGuard | 내 예약 목록 |
| GET | `/api/v1/games/:gameId/reservations` | JwtAuthGuard + OwnershipGuard | 경기별 신청자 목록 (주최자용) |
| PATCH | `/api/v1/reservations/:id/payment-submitted` | JwtAuthGuard + OwnershipGuard(reserver) | 입금 완료 체크 |
| PATCH | `/api/v1/reservations/:id/approve` | JwtAuthGuard + OwnershipGuard(host) | 승인 (`approve()`) |
| PATCH | `/api/v1/reservations/:id/reject` | JwtAuthGuard + OwnershipGuard(host) | 거절 |
| PATCH | `/api/v1/reservations/:id/cancel` | JwtAuthGuard + OwnershipGuard(reserver) | 취소 |
| PATCH | `/api/v1/reservations/:id/attended` | JwtAuthGuard + OwnershipGuard(host) | 참가 확인 |
| PATCH | `/api/v1/reservations/:id/no-show` | JwtAuthGuard + OwnershipGuard(host) | 노쇼 처리 |

**`POST /api/v1/games/:gameId/reservations`**

```tsx
// Request
{ preferredPositions: Position[]; depositorName: string }
// Response: ReservationDto (status=RESERVED, expiresAt)
```

에러 (가드 조건 위반 시 `reserve()` 트랜잭션 순서대로):

| code | statusCode | 조건 |
| --- | --- | --- |
| `GAME_NOT_OPEN` | 409 | 경기 status ≠ OPEN |
| `USER_SUSPENDED` | 403 | is_suspended = true |
| `LEVEL_NOT_ELIGIBLE` | 409 | self_level > required_level |
| `TIME_SLOT_CONFLICT` | 409 | 동일 시간대 다른 활성 예약 존재 |
| `DUPLICATE_RESERVATION` | 409 | 동일 경기 활성 예약 이미 존재 |
| `GAME_FULL` | 409 | 전체 활성 예약 수 ≥ 전체 정원 |
| `VALIDATION_FAILED` | 422 | `preferredPositions.length < 1` |

**`PATCH /api/v1/reservations/:id/approve`**

```tsx
// Request
{ assignedPosition: Position }
// Response: ReservationDto (status=APPROVED)
```

에러:

| code | statusCode | 조건 |
| --- | --- | --- |
| `NOT_PAYMENT_SUBMITTED` | 409 | status ≠ PAYMENT_SUBMITTED |
| `POSITION_NOT_PREFERRED` | 409 | assignedPosition ∉ preferred_positions |
| `POSITION_FULL` | 409 | 해당 포지션 APPROVED 수 ≥ capacity |

**`PATCH /api/v1/reservations/:id/no-show`**

```tsx
// Request: {} (body 없음)
// Response: ReservationDto (status=NO_SHOW) + { userSuspended: boolean }
```

> 부수 효과: `no_show_count++`, 2회 이상 시 `is_suspended=true` — 응답에 `userSuspended` 플래그를 포함해 프론트에서 즉시 안내 가능.
> 

에러: `409 NOT_APPROVED`, `409 GAME_NOT_ENDED` (경기일 미경과)

**공통 (payment-submitted / reject / cancel / attended)**

| 엔드포인트 | 필요 상태 | 주요 에러 |
| --- | --- | --- |
| payment-submitted | RESERVED | `409 NOT_RESERVED`, `409 RESERVATION_EXPIRED` |
| reject | PAYMENT_SUBMITTED | `409 NOT_PAYMENT_SUBMITTED` |
| cancel | RESERVED / PAYMENT_SUBMITTED | `409 ALREADY_TERMINAL` |
| attended | APPROVED | `409 NOT_APPROVED`, `409 GAME_NOT_ENDED` |

---

## 7. Evaluations

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| POST | `/api/v1/games/:gameId/evaluations` | JwtAuthGuard + AttendedGuard | 평가 작성 |
| GET | `/api/v1/games/:gameId/evaluations` | JwtAuthGuard + AttendedGuard | 같은 경기 참가자끼리 조회 |
| GET | `/api/v1/users/:id/evaluations/summary` | 없음 | 선수 카드용 평균 점수 (공개) |

**`POST /api/v1/games/:gameId/evaluations`**

```tsx
// Request
{
  evaluateeId: string;
  mannerScore: number;        // 1~5
  skillMatchScore: number;    // 1~5
  punctualityScore: number;   // 1~5
  isBestPlayer?: boolean;
}
// Response: EvaluationDto
```

> `AttendedGuard`: 요청자와 `evaluateeId` 모두 해당 경기에서 status=ATTENDED인지 서비스 레이어에서 검증.
> 

에러:

| code | statusCode | 조건 |
| --- | --- | --- |
| `NOT_ATTENDED` | 403 | 평가자 또는 대상자가 ATTENDED가 아님 |
| `SELF_EVALUATION` | 422 | evaluateeId = 본인 |
| `DUPLICATE_EVALUATION` | 409 | 이미 같은 대상 평가함 (game_id, evaluator_id, evaluatee_id 유니크) |
| `VALIDATION_FAILED` | 422 | 점수 범위 1~5 벗어남 |
| `BEST_PLAYER_LIMIT_REACHED` | 409 | 같은 평가자가 해당 경기에서 이미 2명에게 `isBestPlayer=true` 투표함 |

> ✅ **확정:** 베스트플레이어는 한 평가자당 경기당 **최대 2명**까지 투표 가능. `EvaluationsService.create()`에서 `isBestPlayer=true` 저장 전에 `count(evaluator_id, game_id, is_best_player=true) < 2` 확인 후 초과 시 `409 BEST_PLAYER_LIMIT_REACHED`.
> 
> 
> ⚠️ 표현이 "한 평가자가 2명에게 투표"인지 "경기 전체에서 2명만 뽑힐 수 있다"인지 확인이 한 번 더 필요하면 말씀해 주세요 — 위는 전자(평가자 기준)로 해석해 반영했습니다.
> 

---

## 8. Notifications

> ✅ **확정:** 알림 발송 채널은 **카카오 알림톡**. `notifications` INSERT 시점에 알림톡 발송도 트리거되며, 발송 성공/실패를 추적하기 위해 `sendStatus` 필드가 필요합니다.
> 

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/notifications/me` | JwtAuthGuard | 내 알림 목록 (`is_read` 필터 가능) |
| PATCH | `/api/v1/notifications/:id/read` | JwtAuthGuard + OwnershipGuard | 읽음 처리 |
| PATCH | `/api/v1/notifications/read-all` | JwtAuthGuard | 전체 읽음 처리 |
| POST | `/api/v1/notifications/kakao/webhook` | 없음 (카카오 서명 검증) | 알림톡 발송 결과 콜백 수신 |

```tsx
// GET /api/v1/notifications/me?unreadOnly=true Response
{
  items: {
    id: string;
    type: NotificationType;
    reservationId: string | null;
    isRead: boolean;
    sendStatus: 'PENDING' | 'SENT' | 'FAILED';   // 신규: 카카오 알림톡 발송 상태
    createdAt: string;
  }[];
  unreadCount: number;
}
```

> `NotificationsService`가 알림 생성과 동시에 카카오 알림톡 API를 호출한다. 발송 실패 시 `sendStatus=FAILED`로 남기고, 재시도 큐(예: `@nestjs/schedule` cron으로 5분 간격 재시도)를 두는 것을 권장. 알림톡 템플릿 코드는 `NotificationType`별로 1:1 매핑(예: `APPROVED` → 템플릿 A) — 템플릿 심사·코드 값은 카카오 비즈니스 채널 등록 후 확정.
> 

---

## 9. DTO ↔ 테이블 매핑 요약

| DTO | 소스 테이블 | 비고 |
| --- | --- | --- |
| `UserSummaryDto` | users (일부) | 로그인 응답용 최소 필드 |
| `UserDetailDto` | users (전체) | 본인 조회/수정용 |
| `BankDto` | banks | **신규** |
| `LeagueDto` | leagues + banks(조인) | `bankId` → `bank: BankDto`로 응답 시 조인 |
| `GameDetailDto` | games + game_positions + leagues(조인) | 잔여석은 서비스 레이어에서 계산 (capacity - approvedCount). stadiumName·계좌는 league 조인으로 제공 |
| `ReservationDto` | reservations |  |
| `EvaluationDto` | evaluations |  |
| `NotificationDto` | notifications | `reservationId`, `sendStatus`(카카오 알림톡 발송 상태) 포함 |

---

## 10. 확정 사항 반영 로그 / 남은 확인 사항

이전 버전에서 확인이 필요했던 7개 항목을 이번에 모두 결정받아 반영했습니다.

| # | 항목 | 확정 내용 | 반영 위치 |
| --- | --- | --- | --- |
| 1 | `no_show_count` 타인 노출 | 비노출 — 공개 프로필 DTO에서 제외 | §2 |
| 2 | 베스트플레이어 투표 제한 | 평가자당 경기당 최대 2명 | §7 |
| 3 | 알림 발송 채널 | 카카오 알림톡, `sendStatus` 필드 추가 | §8 |
| 4 | `banks.host_id` | 두지 않음 — Guard를 `RolesGuard('HOST')`로 단순화 | §3 |
| 5 | 리그별 경기장 | 리그 내 모든 경기 동일 경기장으로 확정 | §4 |
| 6 | `provider` 필드 | 카카오 단일 지원이지만 추후 확장 대비 enum 유지 | §2 |
| 7 | `evaluations` 오타 | `manner_score`로 수정 완료 (ERD 반영, API는 원래 `mannerScore`라 영향 없음) |  |

**남은 확인 사항 (경미):**

- §7의 베스트플레이어 제한을 "평가자당 2명"으로 해석해 반영했습니다. 만약 "경기당 전체 2명"이 의도였다면 다시 알려주세요.
- 카카오 알림톡 템플릿 코드는 카카오 비즈니스 채널 심사 이후에나 확정되므로, 이 부분은 실제 연동 단계에서 값을 채워야 합니다.