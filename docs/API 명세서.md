# API 명세서

# API 명세 (NestJS + TypeORM)

> **문서 정보**
> 
> - **최종 수정일:** 2026-09-14
> - **기반 문서:** ERD + 상태머신 (NestJS + TypeORM 재정비판 **v4**) · 화면설계서(용병 v1 · 리그 어드민 v2.1) · 라우팅 설계 v1
> - **범위:** REST 엔드포인트, 요청/응답 DTO, Guard 권한, 에러 케이스
> - **v6.3 반영 (사용자 식별자 타입):** `users.id`가 uuid에서 자동 증가 정수로 바뀌었습니다. 응답·요청에서 **사용자 id 계열만 `number`**이고 나머지 리소스 id는 `string`(uuid) 그대로입니다 — §0.3 신설, §2·§4·§7 DTO 반영.
> - **v6 반영 (화면설계서 동기화):** 화면설계서에서 확정된 사항 일부가 이 문서에 반영되지 않아, 이대로 구현하면 **P-4·P-5·P-8·A-5·A-7이 구현 불가능**한 상태였습니다(집계만으로는 포지션 보드를 그릴 수 없고, 자리마다 참가자 이름을 받을 곳이 없음). 이번 개정에서 맞춥니다 — ① 자리별 참가자 이름(`slots[].participantName`), ② `GameDetailDto.positions[].slots[]` **자리 단위 응답**, ③ **급수 제한 폐지**(`requiredLevel` → `recommendedLevel`, `LEVEL_NOT_ELIGIBLE` 삭제 — 화면설계서 §3.3), ④ 예약 상태 이력(`ReservationDto.history[]`), ⑤ 종료 예약의 **자리 스냅샷 보존**, ⑥ 어드민 전용 엔드포인트 4종(리그 대시보드 · 리그 경기 목록 · 리그 예약 목록 · 자리 단위 일괄 출석), ⑦ 평가 대상 참가자 목록, ⑧ 거절 사유, ⑨ 목록 응답 DTO 2종(`GameSummaryDto`·`ReservationSummaryDto`), ⑩ 인증 토큰 전달 방식(httpOnly 쿠키)과 신규 유저 분기, ⑪ `FeeTier` 신설과 리그 티어별 기본 참가비.
> - **v6가 요구하는 ERD 변경:** `game_position_slot.participant_name`(신규) · `reservation_slot_snapshot`(신규, 또는 `reservations.slots_snapshot` JSONB) · `reservation_status_history`(신규 테이블) · `game_positions.fee_tier` · `leagues.intro` · `leagues.default_fees` · `games.notice` · `games.dugout_home`/`dugout_away` · `games.stadium_name`(nullable — 리그값 override) · `games.required_level` → `recommended_level`(검증 없음). **ERD 문서에 아직 반영되지 않았습니다.**
> - **v6에서 바꾸지 않은 것 (프론트가 맞춥니다):** `Team` enum 값(`HOME`/`AWAY` — 화면 라벨은 프론트에서 `선공`/`후공`으로 표기) · `durationMin` · `gameDate`+`gameTime` 분리 · `LevelEnum`(`L1~L4`) · `gamewonUrl`/`uniqueplayUrl` 2개 분리 · HOST 로그인 식별자 `email` · `{ data, error }` 봉투 · `/api/v1` prefix · 알림 타입명(`EXPIRING_12H` 등). **표현이 다를 뿐 데이터가 부족하지 않으므로** 서버를 고치지 않고 프론트가 매핑합니다.
> - **v5 반영 (홈/원정 팀 + 포지션별 참가비):** ERD v5에서 **경기 내 홈/원정 팀 구분**과 **(팀×포지션)별 차등 참가비**가 도입되면서 이 문서의 경기·예약 계약이 변경됐습니다 — 경기 개설 요청의 `participationFee`가 경기 단위에서 포지션 단위로 이동, `GameDetailDto.positions[]`에 `team`·`participationFee` 추가, 신청 요청 필드(`positions: Position[]` → `slots: { team, position }[]`), `totalFee` 산식이 곱셈 → 합계로 변경, 에러 `detail.failedPositions` → `detail.failedSlots`(원소에 `team` 포함).
> - **v4 반영 (예약 계약 변경):** ERD v4에서 예약 도메인이 **"희망 포지션 + 승인 시 확정"에서 "신청 시 실제 자리 점유"로** 바뀌면서 이 문서의 예약 계약도 실제로 변경됐습니다 — 신청 요청 필드(`preferredPositions` → `positions`), 승인 요청 바디 제거, 에러 코드 재배치(§6), 경기 상세의 잔여석 산출 기준(§5). **"포지션 무관" 신청은 금지**되며 이를 뜻하는 특수값을 정의하지 않습니다.
> - **ORM 참고:** ORM이 Prisma → TypeORM으로 변경됐으나 이 문서는 엔드포인트·DTO·에러 계약 위주라 ORM 종속 표현은 없습니다 (구현 세부는 ERD 문서 §4~6 참고).
> - **공통 규칙:** 모든 응답은 `success` 플래그를 갖는 공통 봉투 형태(§0.1). 인증 필요 엔드포인트는 `Authorization: Bearer <access_token>`.
- **전역 prefix:** 모든 엔드포인트는 `/api/v1`로 시작 (NestJS `app.setGlobalPrefix('api/v1')`).

---

## 0. 공통 사항

### 0.1 공통 응답 포맷 — **(v6.1 변경)**

> **⚠️ 이전 판의 `{ data, error }` 봉투를 대체합니다.** 백엔드 코드 컨벤션(`.claude/skills/nestjs-backend/references/response-and-errors.md`)이 정의한 봉투로 통일했습니다. **`error` 객체가 사라지고 필드가 최상위로 평탄화**되며, 성공 여부는 `data`/`error`의 null 여부가 아니라 `success` 플래그로 판정합니다. 도메인 에러 코드(`code`)는 그대로 유지되므로 **에러 코드 표(§0.2 및 리소스별 표)는 전부 유효**합니다 — 읽는 경로만 `body.error.code` → `body.code`로 바뀝니다.

성공:

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-09-11T12:00:00.000Z"
}
```

실패:

```json
{
  "success": false,
  "code": "RESERVATION_ALREADY_APPROVED",
  "message": "이미 승인된 예약입니다.",
  "statusCode": 409,
  "timestamp": "2026-09-11T12:00:00.000Z",
  "path": "/api/v1/reservations/{id}/approve"
}
```

- `data`는 **성공 응답에만** 있습니다. 이 문서에서 "Response: `XDto`"라고 쓰인 것은 전부 `data`에 담기는 값입니다.
- `code`는 항상 문자열입니다. 구체적인 도메인 코드가 없는 예외는 §0.2의 HTTP 상태별 기본 코드로 채워집니다.
- 봉투 자체는 전역 인터셉터(`ResponseInterceptor`)와 전역 예외 필터(`AllExceptionsFilter`)가 붙입니다. 컨트롤러·서비스는 봉투를 직접 만들지 않습니다.

> **(v4) `detail` 선택 필드.** 클라이언트가 실패를 **복구**하려면 무엇이 실패했는지 알아야 하는 경우, `detail`에 구조화된 정보를 추가로 담습니다. 현재 사용처는 §6 신청 실패(`POSITION_FULL`·`POSITION_NOT_OFFERED`)의 **(v5)** `detail.failedSlots`이며, 없을 수도 있는 필드이므로 클라이언트는 부재를 전제로 처리해야 합니다. **(v6.1)** DTO 검증 실패(422)에서는 `detail.messages`에 필드별 메시지 배열이 들어가고, `message`에는 그중 대표 문구 하나만 담깁니다.

### 0.2 공통 에러 코드

| HTTP | code | 상황 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 토큰 없음/만료 |
| 403 | `FORBIDDEN` | 권한 없음 (Guard 실패) |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 상태 전이 조건 위반 (아래 리소스별 표에 세분화) |
| 422 | `VALIDATION_FAILED` | DTO 유효성 검증 실패 |
| 422 | `SESSION_AMBIGUOUS` | **(v6.1)** 용병·어드민 세션이 둘 다 열려 있어 대상을 정할 수 없음 (§1) |
| 401 | `INVALID_REFRESH_TOKEN` | **(v6.1)** refresh 토큰이 없거나 서명·만료·무효화 검증 실패 (§1) |
| 500 | `INTERNAL_ERROR` | **(v6.1)** 처리되지 않은 서버 오류. 내부 메시지는 응답에 싣지 않습니다 |

> **(v6.1)** `ValidationPipe`는 기본값 400 대신 **422**를 반환하도록 설정되어 있습니다(`errorHttpStatusCode`). 요청 본문 자체가 깨진 경우(JSON 파싱 실패 등)에만 400이 나가며 이때도 code는 `VALIDATION_FAILED`입니다.

### 0.3 식별자 타입 — **(v6.3) 신설**

**사용자 id만 `number`이고, 나머지 리소스 id는 전부 `string`(uuid)입니다.**

| 대상 | 타입 | 해당 필드 |
| --- | --- | --- |
| 사용자 | `number` | `UserSummaryDto.id` · `UserDetailDto.id` · `UserProfileDto.id` · `LeagueDto.hostId` · `ParticipantDto.userId` · 평가 요청의 `evaluateeId` |
| 그 외 전부 | `string` (uuid) | `leagueId` · `gameId` · `reservationId` · `bankId` · 알림 id 등 |

> **(v6.3) `users.id`가 uuid에서 자동 증가 정수로 바뀌었습니다**(ERD §2.1). 사용자 식별자는 `/users/:id`처럼 사람이 직접 다루는 경로가 많아 짧은 정수가 낫다는 판단이며, **경기·예약 id는 추측 가능해지면 안 되므로 uuid를 유지합니다.**

> **경로 파라미터도 같습니다.** `/users/:id`는 `ParseIntPipe`, 그 외 `/games/:id`·`/reservations/:id` 등은 `ParseUUIDPipe`로 받습니다. 두 파이프 모두 형식이 맞지 않으면 **400**입니다 — 전역 `ValidationPipe`의 422 설정은 body DTO 검증에만 적용되고 파라미터 파이프에는 미치지 않습니다.

> **프론트는 사용자 id를 문자열로 비교하지 마세요.** `userId === '1'`은 항상 false입니다.

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
{ accessToken: string; refreshToken: string; user: UserSummaryDto; leagueId: string | null }
```

에러: `401 INVALID_CREDENTIALS`, `403 USER_SUSPENDED`

> **(v6) `leagueId`를 응답에 싣습니다.** 어드민 콘솔은 로그인 직후부터 "내 리그"를 알아야 §4의 대시보드·경기 목록·예약 목록을 호출할 수 있습니다. 리그를 아직 만들지 않았으면 `null`(프론트가 리그 생성으로 유도), 여러 개면 가장 최근 리그를 담고 전체 목록은 `GET /leagues/mine`(§4)으로 받습니다.

> **(v6.1) `UserSummaryDto`는 `{ id, role, nickname, profileCompleted }`입니다.** `profileCompleted`의 판정 기준은 §1.2와 같습니다(`nickname`·`region`·`selfLevel`이 모두 채워진 상태).

> **(v6.1) 이메일이 없는 계정과 비밀번호가 틀린 경우를 구분하지 않습니다.** 둘 다 `401 INVALID_CREDENTIALS`입니다 — 구분하면 이메일 존재 여부를 확인하는 도구가 됩니다.

**`POST /api/v1/auth/refresh`** — **(v6.1) 요청 계약 신설**

```tsx
// Request (둘 다 선택)
{
  refreshToken?: string;   // 쿠키를 쓰지 않는 클라이언트용. 있으면 쿠키보다 우선
  session?: 'PLAYER' | 'HOST';  // 갱신할 세션
}
// Response: 로그인과 동일
{ accessToken: string; refreshToken: string; user: UserSummaryDto; leagueId: string | null }
```

토큰을 고르는 순서는 `refreshToken` → `session`이 가리키는 쿠키 → **남은 refresh 쿠키가 하나뿐이면** 그것입니다.

에러: `401 INVALID_REFRESH_TOKEN`, `403 USER_SUSPENDED`, `422 SESSION_AMBIGUOUS`

> **(v6.1) 용병·어드민 refresh 쿠키가 둘 다 있는데 `session`이 없으면 `422 SESSION_AMBIGUOUS`로 거절합니다.** 두 세션이 같은 브라우저에 공존하는 이상(§1.1) 서버가 임의로 고르면 **엉뚱한 세션이 조용히 갱신됩니다.** 어느 콘솔에서 부르는지는 프론트가 알고 있으므로 되묻는 편이 낫습니다.

> **(v6.1) 갱신은 회전(rotation)합니다.** 쓰인 refresh 토큰은 즉시 `revoked_at`이 찍히고 새 쌍이 발급됩니다. 그래서 **이미 무효화된 토큰이 다시 제시되면 탈취로 보고 그 유저의 모든 refresh 토큰을 무효화**합니다(ERD §2.12) — 클라이언트에는 `401 INVALID_REFRESH_TOKEN`만 나갑니다.

**`POST /api/v1/auth/logout`**

```tsx
// Request (선택)
{ refreshToken?: string }
// Response: 204 No Content
```

생략하면 access 토큰이 말하는 역할의 refresh 쿠키를 무효화합니다 — 로그인한 세션이 곧 로그아웃할 세션이라 모호할 일이 없습니다. 해당 세션의 access·refresh 쿠키만 만료시키므로 **다른 세션의 로그인은 유지**됩니다.

> **(v6.1) 로그아웃은 멱등합니다.** 이미 무효화됐거나 서버가 모르는 토큰이어도 204로 끝납니다 — "그런 토큰 없음"을 알려주면 토큰 유효성 확인 도구가 됩니다.

### 1.1 (v6) 토큰 전달 — httpOnly 쿠키

프론트는 Next.js App Router의 **서버 컴포넌트에서 데이터를 읽고**, 라우트 가드(`src/proxy.ts`)는 요청 쿠키만 보고 로그인 여부를 판정합니다(라우팅 설계 §4-1). 토큰이 응답 body에만 있으면 SSR이 인증된 요청을 만들 수 없고 가드도 동작하지 않습니다.

- 로그인·콜백·refresh 응답은 body에 토큰을 담는 것과 **동시에** `Set-Cookie`로 내려줍니다.

| 세션 | access 쿠키 | refresh 쿠키 |
| --- | --- | --- |
| 용병 (PLAYER) | `player_session` | `player_refresh` |
| 어드민 (HOST) | `admin_session` | `admin_refresh` |

- 쿠키 옵션: `HttpOnly; Secure; SameSite=Lax; Path=/`. access는 토큰 만료와 같은 수명, refresh는 장기.
- **두 세션은 같은 브라우저에 공존합니다.** 쿠키 이름을 나눈 이유이며, 한쪽 로그인이 다른 쪽을 덮어쓰면 안 됩니다(라우팅 설계 §0-4).
- 서버는 `Authorization: Bearer` 헤더와 쿠키를 **모두** 인증 소스로 받습니다. 헤더가 있으면 헤더가 우선입니다 — 모바일·테스트 클라이언트는 헤더만 쓰면 됩니다.
- `POST /auth/logout`은 refresh 무효화와 함께 위 쿠키를 만료시킵니다.

### 1.2 (v6) 카카오 콜백 계약 — 신규 유저 분기

`GET /auth/kakao/callback`은 JSON을 반환하지 않고 **프론트로 302 리다이렉트**합니다. 토큰은 §1.1의 쿠키로 심고, 목적지만 분기합니다.

| 조건 | 리다이렉트 |
| --- | --- |
| 신규 유저 (프로필 미완성) | `{FRONT_ORIGIN}/onboarding` |
| 기존 유저 | `{FRONT_ORIGIN}/games` |
| 실패 | `{FRONT_ORIGIN}/login?error=<code>` |

> **분기는 서버가 합니다.** 프론트가 "프로필이 비었으면 온보딩"을 판정하려면 매 요청 프로필을 조회해야 해서 가드 원칙과 충돌합니다(라우팅 설계 §4-3).
>
> **토큰을 쿼리스트링에 싣지 않습니다.** 리퍼러·브라우저 히스토리·서버 액세스 로그에 그대로 남습니다.
>
> **(v6.2) 구현 노트.** 판정은 `isProfileCompleted()`(`src/user/dto/user-detail.dto.ts`) 하나로 모아 콜백 분기와 `UserSummaryDto`·`UserDetailDto`가 공유합니다. 두 곳에 따로 두면 한쪽만 고쳐져 "온보딩을 마쳤는데 또 온보딩으로 가는" 상태가 생깁니다.

> **(v6.2) 실패 리다이렉트의 `error`는 §0.2의 `code` 값입니다.** 사용자가 동의를 거부하면 `UNAUTHORIZED`, 정지 계정이면 `USER_SUSPENDED`, 그 외 서버 오류는 `INTERNAL_ERROR`입니다. **원인 문구는 싣지 않습니다** — 쿼리스트링은 브라우저 히스토리에 남습니다.

> **(v6.2) 최초 로그인 시 `phone`은 항상 `null`입니다.** 카카오 `phone_number` 동의항목은 비즈 앱 전환·비즈니스 인증·심사를 통과해야 쓸 수 있어, 현재는 **온보딩 입력(`PATCH /users/me`)이 유일한 수집 경로**입니다. 설정 절차는 [카카오 로그인 설정](카카오%20로그인%20설정.md) 참고.

> **(v6.2) 최초 로그인 시 계정이 자동 생성됩니다.** 별도 회원가입 단계가 없어 `nickname`(카카오 동의 시) 외에는 비어 있는 행이 만들어지고, 나머지는 온보딩에서 채웁니다.

> **프로필 완성 기준은 `nickname`·`region`·`self_level`이 모두 채워진 상태**입니다. 같은 판정을 `GET /users/me` 응답에 `profileCompleted: boolean`으로 실어, 온보딩을 건너뛰고 URL로 직접 들어온 경우를 프론트가 막을 수 있게 합니다.

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
  phone?: string;           // (v6.2) 신규 — 알림톡 수신 번호
}
// Response: UserDetailDto
```

**`GET /api/v1/users/:id` Response (공개 프로필)**

```tsx
{
  id: number;                     // (v6.3) uuid → 정수 (§0.3)
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

> **(v6.2) 공개 프로필에서 빠지는 필드 전체:** `email` · `provider` · `providerId` · `phone` · `noShowCount` · `isSuspended`. 앞 넷은 신원 정보, 뒤 둘은 노쇼 이력이라 주최자만 봅니다(ERD §7).

> **(v6.2) `UserDetailDto`에 `profileCompleted`·`isSuspended`·`createdAt`이 포함됩니다.** `passwordHash`·`providerId`는 본인 조회에서도 내려가지 않습니다.

> **(v6.2) `evaluationSummary`의 평균은 소수점 첫째 자리 반올림**이며, **평가가 없으면 `0`**입니다(`null`이 아님). 프론트가 null 분기를 하지 않아도 되게 한 것이며, "평가 없음"은 별점 0으로 표시됩니다.

> **(v6.2) `phone`은 어떤 표기로 넣어도 E.164로 저장됩니다.** `010-1234-5678` · `+82 10-1234-5678` 모두 받아 `+821012345678`로 정규화합니다(ERD §2.1). 형식을 판별할 수 없으면 422 `VALIDATION_FAILED`이며, **명시적 `null`도 422**입니다 — 한 번의 실수로 알림 채널이 조용히 사라지지 않게 생략만 허용합니다.

> **(v6.2) `phone`은 `profileCompleted` 판정에 들어가지 않습니다.** 포함하면 이미 온보딩을 마친 사용자가 전부 다시 온보딩으로 튕깁니다(§1.2).

> **(v6.2) `PATCH /users/me`는 DTO에 없는 필드를 422로 거절합니다.** 전역 `ValidationPipe`가 `forbidNonWhitelisted`라 `role`·`isSuspended`·`noShowCount` 등을 실으면 요청 자체가 거부됩니다.


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
| GET | `/api/v1/leagues/mine` | JwtAuthGuard + RolesGuard('HOST') | **(v6)** 내가 운영하는 리그 목록 |
| GET | `/api/v1/leagues/:id/dashboard` | JwtAuthGuard + OwnershipGuard | **(v6)** A-2 홈 대시보드 집계 |

**`POST /api/v1/leagues`**

```tsx
// Request
{
  name: string;
  region: string;
  stadiumName: string;   // ERD 변경: games → leagues로 이동
  bankId: string;        // ERD 변경: 신규 Bank 엔티티 참조 (games의 deposit* 필드 대체)
  intro?: string;        // (v6) 리그 소개 — A-8 리그 설정
  defaultFees: Record<FeeTier, number>;   // (v6) 티어별 참가비 기본값 — A-8에서 정하고 A-4에 프리필
}
// Response: LeagueDto
```

> **(v6) `FeeTier` enum 신설.** 참가비를 포지션 11종마다 따로 정하지 않고 **티어 4종**으로 묶어 정합니다 — 화면설계서 §3.1이 확정한 모델이며, A-8 리그 설정과 A-4 경기 등록이 둘 다 티어 단위 입력입니다. 포지션 11개에 금액을 따로 받는 UI는 어디에도 없습니다.
>
> ```ts
> // enums.ts
> export enum FeeTier { PITCHER = 'PITCHER', CATCHER = 'CATCHER', FIELDER = 'FIELDER', DH = 'DH' }
>
> export const FEE_TIER_LABEL: Record<FeeTier, string> = {
>   [FeeTier.PITCHER]: '투수', [FeeTier.CATCHER]: '포수',
>   [FeeTier.FIELDER]: '야수', [FeeTier.DH]: '지타',
> };
>
> // Position → FeeTier 매핑은 서버가 소유합니다 (프론트가 추론하지 않음)
> export const POSITION_FEE_TIER: Record<Position, FeeTier> = {
>   [Position.SP]: FeeTier.PITCHER,  [Position.RP]: FeeTier.PITCHER,
>   [Position.C]:  FeeTier.CATCHER,  [Position.DH]: FeeTier.DH,
>   [Position.FIRST]: FeeTier.FIELDER, [Position.SECOND]: FeeTier.FIELDER,
>   [Position.THIRD]: FeeTier.FIELDER, [Position.SS]:     FeeTier.FIELDER,
>   [Position.LF]: FeeTier.FIELDER, [Position.CF]: FeeTier.FIELDER, [Position.RF]: FeeTier.FIELDER,
> };
> ```
>
> **매핑을 서버가 갖는 이유:** 티어는 가격 정책이라 나중에 바뀔 수 있습니다(예: 포수를 야수 요금으로). 클라이언트가 매핑표를 복사해 두면 정책 변경이 배포 두 번으로 갈라지고, 그 사이 화면의 금액과 청구액이 어긋납니다. 그래서 §5의 응답에 `feeTier`를 실어 내려줍니다.
>
> **`leagues.default_fees`는 기본값일 뿐 정산 근거가 아닙니다.** 실제 금액은 경기 개설 시 `game_positions.participation_fee`로 복사되고(§5), 예약 시 `reservations.total_fee`로 다시 고정됩니다(§6). 리그 기본값을 나중에 바꿔도 기존 경기·예약에 소급되지 않습니다.

**`GET /api/v1/leagues/:id` Response**

```tsx
{
  id: string; hostId: number; name: string; region: string;   // (v6.3) hostId는 정수 (§0.3)
  stadiumName: string;
  intro: string | null;                    // (v6)
  defaultFees: Record<FeeTier, number>;    // (v6)
  bank: BankDto;   // bankId를 조인해서 내려줌 (참가비 안내 화면에 그대로 필요)
  createdAt: string;
}
```

**`PATCH /api/v1/leagues/:id`** — **(v6)**

```tsx
// Request (부분 업데이트)
{
  name?: string; region?: string; stadiumName?: string;
  intro?: string; bankId?: string;
  defaultFees?: Record<FeeTier, number>;
}
// Response: LeagueDto
```

> **(v6) A-8은 한 화면에서 리그 정보와 입금 계좌를 함께 저장합니다.** 계좌가 별도 엔티티(§3)라 저장 경로가 둘로 갈리므로, **프론트가 두 번 호출**합니다.
>
> - 계좌 수정: `PATCH /banks/:id`(계좌 3필드) → `PATCH /leagues/:id`(나머지)
> - 계좌 최초 등록: `POST /banks` → 받은 `id`로 `PATCH /leagues/:id { bankId }`
>
> 서버에 합성 엔드포인트를 두지 않는 이유는 `banks`가 리그 소유가 아니기 때문입니다(§3 확정) — 리그 수정 권한으로 남의 계좌를 고칠 수 있게 되면 안 됩니다.

**`GET /api/v1/leagues/:id/dashboard` Response** — **(v6)** A-2 홈

```tsx
{
  pendingPayments: number;   // 입금 확인이 필요한 예약 수 (RESERVED + PAYMENT_SUBMITTED)
  openGames: number;         // 모집중(OPEN) 경기 수
  imminentGames: number;     // 48시간 이내 시작하는 경기 수
  upcoming: GameSummaryDto[];              // 가까운 순 3건 (§5)
  pendingPreview: ReservationSummaryDto[]; // 신청 시각 오름차순 3건 (§6)
}
```

> **`pendingPayments`는 A-2 전용이 아닙니다.** 어드민 셸이 **모든 화면에서** 사이드바·하단 탭에 미처리 배지를 그리므로(어드민 화면설계서 §하단 탭) 이 값은 사실상 매 페이지 호출됩니다. 집계 쿼리를 가볍게 유지하고, 입금 확정·거절 직후에는 반드시 무효화되도록 캐시 수명을 짧게 두세요.

에러: `403 FORBIDDEN` (role ≠ HOST), `404 BANK_NOT_FOUND` (존재하지 않는 bankId)

> ✅ **확정:** 리그 내 모든 경기는 같은 경기장에서 진행 — `stadium_name`을 `games`가 아닌 `leagues`에 두는 것으로 확정.
> 

---

## 5. Games

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/games` | 없음 | 경기 목록 (필터: `region`·`level`·`date`·`hideClosed`) |
| GET | `/api/v1/games/:id` | 없음 | 경기 상세 (자리 단위 응답) |
| GET | `/api/v1/leagues/:leagueId/games` | JwtAuthGuard + OwnershipGuard | **(v6)** A-3 어드민 경기 목록 (`?status=open\|upcoming\|ended`) |
| POST | `/api/v1/leagues/:leagueId/games` | JwtAuthGuard + OwnershipGuard | 경기 개설 |
| PATCH | `/api/v1/games/:id` | JwtAuthGuard + OwnershipGuard | 경기 수정 (OPEN 상태만) |
| POST | `/api/v1/games/:id/close` | JwtAuthGuard + OwnershipGuard | 주최자 수동 마감 |
| POST | `/api/v1/games/:id/cancel` | JwtAuthGuard + OwnershipGuard | 경기 취소 (활성 예약 연쇄 CANCELLED) |

**`GET /api/v1/games` — (v6) 목록 응답**

```tsx
// Query: ?region=&level=&date=&hideClosed=true
{ items: GameSummaryDto[] }

// GameSummaryDto — P-3 경기 카드 · A-3 어드민 목록 · A-2 대시보드가 공유
{
  id: string;
  gameDate: string; gameTime: string; durationMin: number;
  stadiumName: string;                     // (v6) 경기별 값이 있으면 그것, 없으면 리그값
  leagueName: string;
  region: string;
  recommendedLevel: LevelEnum | null;      // (v6) 제한 아님 — 표시·필터 전용
  status: GameStatus;
  feeRange: { min: number; max: number };  // (v5) 카드에는 min만 "13,000원부터"로 표시
  teams: {                                 // (v6) 카드의 `선공 4/11 · 후공 6/11`
    HOME: { occupied: number; capacity: number };
    AWAY: { occupied: number; capacity: number };
  };
  emptySlots: { team: Team; position: Position }[];   // (v6) 빈 포지션 칩 — 최대 4개까지만
}
```

> **(v6) 목록 DTO를 명시합니다.** 이전 판에는 목록 응답 형태가 정의돼 있지 않아 `feeRange`만 언급됐는데, P-3 카드는 팀별 채움 수와 빈 포지션 칩을 그립니다(화면설계서 §3). 상세를 열지 않고 카드에서 바로 보여야 하는 값이라 목록에서 집계해 내려줍니다.
>
> **`emptySlots`는 상한을 둡니다.** 카드에는 최대 2개만 그리고 나머지는 `+3` 형태로 접히므로, 서버가 전부 내려줄 이유가 없습니다. 22자리가 전부 비어 있는 경기에서 배열이 길어지는 것만 막으면 됩니다.
>
> **`hideClosed=true`는 `status = OPEN`만 남깁니다.** P-3의 "마감된 경기 숨기기" 토글입니다.

**`GET /api/v1/leagues/:leagueId/games` — (v6) A-3 어드민 경기 목록**

```tsx
// Query: ?status=open | upcoming | ended
{ items: (GameSummaryDto & { pendingPayments: number })[] }
```

| `status` | 대상 | 정렬 |
| --- | --- | --- |
| `open` | 아직 시작 안 함 + `OPEN` | 시작 시각 오름차순 |
| `upcoming` | 아직 시작 안 함 + `OPEN`이 아님 (마감·취소) | 시작 시각 오름차순 |
| `ended` | 종료 시각(`gameTime + durationMin`) 경과 | 시작 시각 **내림차순** |

> **공개 목록과 나누는 이유:** `GET /games`는 리그 필터가 없고 종료된 경기를 노출하지 않지만, A-3은 **내 리그의 지난 경기까지** 봐야 하고 항목마다 미처리 입금 건수를 답니다. 같은 엔드포인트에 `leagueId`와 `includeEnded`를 붙여 분기시키면 공개 API에 소유권 판정이 섞입니다.

**`POST /api/v1/leagues/:leagueId/games`**

```tsx
// Request
{
  gameDate: string;       // ISO date
  gameTime: string;       // HH:mm
  durationMin?: number;   // default 120
  recommendedLevel?: LevelEnum;       // (v6) 개명 — 권장 급수. 신청을 막지 않습니다
  stadiumName?: string;               // (v6) 생략 시 리그의 stadiumName 사용
  notice?: string;                    // (v6) 경기 공지 — P-4 상세에 노출
  dugout?: { HOME: string; AWAY: string };   // (v6) 덕아웃 위치 (예: 1루측 / 3루측)
  fees?: Record<FeeTier, number>;     // (v6) 생략 시 리그 defaultFees 복사
  positions: {                        // (v5) game_positions 동시 생성
    team: Team;                       // 'HOME' | 'AWAY'
    position: Position;
    capacity: number;
  }[];
}
// Response: GameDetailDto (positions 포함)
```

> **(v6) 참가비 입력 단위가 티어로 바뀝니다.** `defaultParticipationFee`와 `positions[].participationFee`를 제거하고 `fees: Record<FeeTier, number>` 하나로 받습니다. 서버가 `POSITION_FEE_TIER`(§4)로 각 `game_positions.participation_fee`를 채웁니다 — **저장 단위는 v5 그대로 (팀×포지션)** 이고 입력 단위만 티어입니다.
>
> **트레이드오프를 명시합니다:** 이 계약에서는 "홈 유격수 15,000원 / 원정 유격수 18,000원"처럼 **같은 포지션을 팀별로 다르게** 매길 수 없습니다. A-4에 그런 입력이 없고(티어 4칸이 전부), 실제 모집에서도 팀에 따라 참가비가 갈리지 않기 때문입니다. 필요해지면 `fees`를 `Record<Team, Record<FeeTier, number>>`로 넓히면 됩니다 — 저장 스키마는 이미 그 단위라 마이그레이션이 필요 없습니다.
>
> **(v6) `stadiumName`은 nullable override입니다.** "리그 내 모든 경기는 같은 경기장"이 원칙이지만(§4 확정), A-4는 구장명을 직접 입력받고 최근 사용 구장을 추천합니다 — 우천 대체 구장처럼 예외가 실제로 생깁니다. 원칙은 **기본값**으로 남기고 경기별 예외만 열어 둡니다.

> ERD 변경 반영: `stadiumName`과 입금 계좌 3필드(`depositBank/Account/Holder`)는 `leagues`(+`banks`)로 이동했으므로 경기 생성 요청에서 제거했습니다. 경기 상세 화면에서 경기장/계좌를 보여줘야 하면 `GameDetailDto`가 league를 조인해서 내려줍니다.
> 

에러: `403 FORBIDDEN` (league.host_id ≠ user.id), `422 VALIDATION_FAILED` (`capacity ≤ 0` / **(v6)** `fees`의 값이 음수 / **(v5)** `(team, position)` 쌍 중복 / **(v6)** `fees`가 없고 리그 `defaultFees`도 비어 있음)

> **(v6) 참가비 0원을 허용합니다.** A-6에 **「입금 불필요」 섹션**이 따로 있습니다 — 무료 자리(주최자 지인·대체 인원 등)가 실제로 생기고, 이 예약은 입금 대조 없이 바로 승인됩니다(§6). 0을 막으면 그 화면이 성립하지 않으므로 음수만 거부합니다.
>
> **(v6) 계좌 없이 경기를 만들 수 없습니다.** A-4는 리그에 입금 계좌가 없으면 저장을 막고 A-8로 보냅니다 — 입금 안내(P-6)에 찍을 계좌가 없는 경기는 신청을 받아도 결제가 성립하지 않기 때문입니다. 서버도 같은 조건을 `422 LEAGUE_BANK_REQUIRED`로 막습니다.

> **(v4)** 경기 개설 시 `positions[]`의 `capacity`만큼 `game_position_slot` 빈 행이 같은 트랜잭션에서 생성됩니다 (ERD §2.6).
> 
> **(v6) `fees`는 요청 DTO에만 존재합니다** (v5의 `defaultParticipationFee`를 대체). 서버가 티어 금액을 각 `game_positions.participation_fee`로 복사하고 `games`에는 저장하지 않습니다 — 경기 단위 참가비 컬럼이 제거됐기 때문입니다 (ERD §2.4). 같은 사실을 두 곳에 두지 않는다는 원칙이며, 경기 단위 참가비 표시가 필요하면 `positions[]`의 `MIN`/`MAX`(= `feeRange`)로 구합니다. 응답의 `fees`(§`GameDetailDto`)도 저장값이 아니라 `game_positions`에서 티어별로 되접은 파생값입니다.
> 
> **(v5) `(team, position)` 쌍이 유니크**하므로 같은 `position`을 홈·원정에 각각 하나씩, 최대 2개 넣을 수 있습니다.

**`PATCH /api/v1/games/:id`** — **(v4)** 정원 변경 규칙

`positions[].capacity`를 늘리면 슬롯 행이 추가되고, 줄이면 잘려나가는 구간의 슬롯이 삭제됩니다. **이미 점유된 자리가 잘려나가는 축소는 거부**합니다 (ERD §2.6). **(v5)** 이 판정은 `(team, position)` 단위로 독립적입니다 — 홈 유격수 정원을 줄여도 원정 유격수는 영향받지 않습니다.

**(v6) `fees` 변경은 슬롯을 건드리지 않으며, 이미 존재하는 예약의 금액도 바뀌지 않습니다** — `reservations.total_fee`가 신청 시점 금액으로 고정돼 있기 때문입니다 (ERD §2.6·§2.7). 입금 안내를 이미 받은 사용자에게 소급 청구가 발생하지 않습니다.

> **(v6) 신청자가 한 명이라도 있으면 `fees`를 바꿀 수 없습니다** — `409 FEE_LOCKED`. 위 문단대로 기존 예약 금액은 그대로 두므로, 같은 경기 같은 자리인데 먼저 신청한 사람과 나중에 신청한 사람의 금액이 갈립니다. 어드민 화면설계서 §A-4가 이 경우 참가비 입력을 아예 잠그는 것으로 확정했고, 서버도 같은 조건을 막습니다. 금액을 정말 바꿔야 하면 경기를 취소하고 다시 만듭니다.

에러: `403 FORBIDDEN`, `409 GAME_NOT_OPEN` (OPEN 상태만 수정 가능), `409 CAPACITY_BELOW_OCCUPIED` (축소 구간에 점유된 자리 존재), **(v6)** `409 FEE_LOCKED` (점유된 자리가 있는데 `fees` 변경 시도)

**`GET /api/v1/games/:id` Response**

```tsx
{
  id: string; leagueId: string;
  gameDate: string; gameTime: string; durationMin: number;
  recommendedLevel: LevelEnum | null;       // (v6) 개명 — 신청을 막지 않습니다
  stadiumName: string;                      // (v6) 경기별 값이 있으면 그것, 없으면 리그값
  notice: string | null;                    // (v6) 경기 공지
  dugout: { HOME: string; AWAY: string } | null;   // (v6)
  feeRange: { min: number; max: number };   // (v5) participationFee 집계. 단일가면 min === max
  fees: Record<FeeTier, number>;            // (v6) P-4 상단 "티어 4종 요약" 블록
  status: GameStatus;
  league: {                 // 계좌 정보는 league 조인으로 제공 (ERD 변경)
    id: string; name: string; stadiumName: string; bank: BankDto;
  };
  positions: {              // (v5) team 추가 — 같은 position이 팀별로 최대 2행
    team: Team; position: Position;
    feeTier: FeeTier;                       // (v6) 매핑은 서버가 소유 (§4)
    capacity: number; occupiedCount: number; remaining: number;
    participationFee: number;
    slots: {                                // (v6) 자리 단위 — 포지션 보드 한 행 = 이 배열의 한 원소
      slotNo: number;
      participantName: string | null;       // 비어 있으면 신청 가능한 자리
      reservationId: string | null;
      isMine: boolean;                      // 요청자의 활성 예약에 속한 자리 (비로그인이면 항상 false)
      isProxy: boolean;                     // 예약자 본인이 아닌 대리 신청분 (A-7에서 `대리` 표시)
    }[];
  }[];
}
```

> **(v6) `slots[]`가 이 응답의 핵심입니다.** 집계 3종(`capacity`·`occupiedCount`·`remaining`)만으로는 **포지션 보드를 그릴 수 없습니다.** P-4는 자리 한 줄마다 참가자 이름을 찍고, 내 예약에 속한 자리에는 `내 신청` 배지를 붙입니다(화면설계서 §3.2). "3루 2자리 중 1자리 참"이 아니라 "3루 = 김철수"가 화면에 필요한 값입니다. 집계는 카드 요약(§`GameSummaryDto`)용으로 남기고, 상세는 자리를 그대로 내려줍니다.
>
> **이름 노출은 상태와 무관합니다.** 활성 예약(`RESERVED`·`PAYMENT_SUBMITTED`·`APPROVED`)이 자리를 점유하고 있으면 입금 전이어도 이름이 내려갑니다 — 화면설계서 §P-4 노출 원칙입니다. 자리가 잡혔다는 사실 자체를 숨기면 다른 사용자가 이미 찬 자리를 고르게 됩니다.
>
> **`isMine`·`isProxy`는 요청자 기준 파생값입니다.** 비로그인 요청에서는 둘 다 `false`로 내려갑니다. `isProxy`는 `participantName ≠ 예약자 닉네임`이 아니라 **자리 순서**로 판정합니다 — 예약의 첫 자리가 본인, 나머지가 대리입니다(화면설계서 §3.2. 이름이 같아도 동명이인일 수 있으므로 문자열 비교로 판정하지 않습니다).
>
> **(v4) `approvedCount` → `occupiedCount`로 개명.** v4에서 자리는 APPROVED가 아니라 **RESERVED 시점에 점유**되므로 기존 이름이 실제 값과 어긋납니다. `occupiedCount` = `reservation_id IS NOT NULL`인 행 수, `remaining` = `reservation_id IS NULL`인 행 수입니다.

> **이 응답의 정확도가 v4에서 필수 요건이 됩니다.** "포지션 무관" 신청이 금지되어 사용자가 포지션을 직접 골라야 하는데, 잔여석이 부정확하면 고른 즉시 `POSITION_FULL`로 실패합니다. 신청 화면은 이 응답에서 `remaining > 0`인 포지션만 노출해야 합니다.
> 
> **(v5) `participationFee`가 항목마다 내려갑니다.** 사용자가 자리를 고르는 시점에 그 자리의 가격을 알아야 하므로, 클라이언트는 선택한 자리들의 단가를 합산해 **신청 전에 예상 총액을 보여줘야 합니다.** 서버가 확정한 금액은 신청 응답의 `totalFee`이며, 둘이 다르면 그 사이에 주최자가 단가를 수정한 것이므로 서버 값을 따릅니다.
> 
> **(v5) `feeRange`는 목록 화면용 파생값입니다.** `games`에 참가비 컬럼이 없으므로(ERD §2.4) 경기 단위 가격 표시는 이 집계로만 가능합니다. `GET /api/v1/games` 목록 응답에도 같은 필드를 내려 "20,000원~35,000원" 형태로 표시합니다.

**`POST /api/v1/games/:id/cancel`** — 연쇄 처리 주의사항: 이 엔드포인트는 트랜잭션 내에서 game.status=CANCELLED 갱신과 함께 활성 예약(RESERVED·PAYMENT_SUBMITTED·APPROVED) 전체를 CANCELLED로 일괄 전이시키고, 각 예약자에게 알림을 생성한다.

에러: `409 GAME_ALREADY_CLOSED`

---

## 6. Reservations

상태 전이 가드 조건(ERD 3.2)을 엔드포인트별 에러 케이스로 그대로 매핑합니다.

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| POST | `/api/v1/games/:gameId/reservations` | JwtAuthGuard + RolesGuard('PLAYER') | 예약 신청 (`reserve()`) |
| GET | `/api/v1/reservations/me` | JwtAuthGuard | 내 예약 목록 |
| GET | `/api/v1/games/:gameId/reservations` | JwtAuthGuard + OwnershipGuard | 경기별 신청자 목록 (A-5) |
| GET | `/api/v1/leagues/:leagueId/reservations` | JwtAuthGuard + OwnershipGuard | **(v6)** 리그 전체 예약 (A-6 입금 확인) |
| PATCH | `/api/v1/reservations/:id/payment-submitted` | JwtAuthGuard + OwnershipGuard(reserver) | 입금 완료 체크 |
| PATCH | `/api/v1/reservations/:id/approve` | JwtAuthGuard + OwnershipGuard(host) | 승인 (`approve()`) |
| PATCH | `/api/v1/reservations/:id/reject` | JwtAuthGuard + OwnershipGuard(host) | 거절 |
| PATCH | `/api/v1/reservations/:id/cancel` | JwtAuthGuard + OwnershipGuard(reserver) | 취소 |
| POST | `/api/v1/games/:gameId/attendance` | JwtAuthGuard + OwnershipGuard(host) | **(v6)** A-7 자리 단위 일괄 출석 |
| PATCH | `/api/v1/reservations/:id/attended` | JwtAuthGuard + OwnershipGuard(host) | 참가 확인 (단건 정정용) |
| PATCH | `/api/v1/reservations/:id/no-show` | JwtAuthGuard + OwnershipGuard(host) | 노쇼 처리 (단건 정정용) |

**`POST /api/v1/games/:gameId/reservations`**

```tsx
// Request
{
  // (v6) 길이 N = 점유할 자리 수. 중복 허용(같은 자리 여러 개)
  slots: { team: Team; position: Position; participantName: string }[];
  depositorName: string;
}
// 예) {
//   slots: [
//     { team:'HOME', position:'LF', participantName:'김야구' },   // ← 첫 원소가 신청자 본인
//     { team:'HOME', position:'LF', participantName:'박동행' },
//     { team:'AWAY', position:'CF', participantName:'이친구' },
//   ],
//   depositorName: '김야구',
// }

// Response: ReservationDto
{
  id: string; gameId: string; status: 'RESERVED';
  createdAt: string; expiresAt: string;
  depositorName: string;
  slotCount: number;
  slots: {                                    // 실제로 점유한 자리
    team: Team; position: Position; slotNo: number;
    participantName: string;                  // (v6)
    feeTier: FeeTier; fee: number;            // (v6) 자리별 금액 — P-6 슬롯별 내역
  }[];
  totalFee: number;                           // (v5) 점유 자리별 금액의 합계
}
```

> **(v6) `participantName`이 자리마다 붙습니다 — 이번 개정의 가장 큰 변경입니다.** 화면설계서 §3.2(2026-08-02 확정)는 한 예약이 여러 자리를 잡을 때 **자리마다 참가자 이름을 받는 것**으로 정했습니다. 이전 판 §10의 "동반 신청자 신원을 저장하지 않습니다"는 이 확정 이전의 서술이며, 그대로 두면 다음이 전부 불가능합니다.
>
> | 화면 | 필요한 것 |
> | --- | --- |
> | P-4 경기 상세 | 자리마다 참가자 이름 (보드 한 줄 = 한 명) |
> | P-5 신청 폼 | 자리별 이름 입력 — 첫 자리는 본인 닉네임 프리필 |
> | P-6 입금 안내 · P-8 예약 상세 | 자리별 내역 (포지션 + 이름 + 금액) |
> | A-5 신청 현황 · A-7 출석 체크 | 그 이름으로 출석·노쇼를 찍음 |
>
> **대리 신청 대상은 계정이 없어도 됩니다** — 이름 문자열만 저장하며 `users`와 연결하지 않습니다. 그래서 평가(§7)는 계정이 있는 참가자만 대상이고, 노쇼 카운트는 **예약자 본인 계정에만** 누적됩니다(§3.2 확정 — 데려온 사람이 책임집니다).
>
> **배열 순서가 의미를 가집니다.** `slots[0]`이 신청자 본인이고 나머지가 대리분입니다. `GameDetailDto.slots[].isProxy`(§5)가 이 순서로 판정되므로, 서버는 **요청 순서를 그대로 보존**해 슬롯에 기록해야 합니다.
>
> **(v6) 자리별 금액을 응답에 싣습니다.** P-6이 "합계 + 자리별 내역"을 보여주므로(§3.2), `totalFee`만으로는 화면을 채울 수 없습니다. `fee`는 점유 시점 금액이며 이후 주최자가 `fees`를 바꿔도 변하지 않습니다.

> **(v5) `positions: Position[]` → `slots: { team, position }[]`로 변경.** 팀 구분이 생겨 포지션만으로는 점유 대상이 특정되지 않습니다("유격수 1자리"가 홈인지 원정인지 알 수 없음). 필드명도 `slots`로 바꿔 응답의 `slots[]`와 대응시켰습니다 — 요청은 "어떤 자리를 원하는지", 응답은 "어떤 자리를 잡았는지"로 같은 단위입니다.
> 
> **(v5) `totalFee`는 곱셈이 아니라 합계입니다.** v4의 `participationFee × slotCount`는 단가가 균일할 때만 성립했습니다. 자리마다 단가가 다르므로 **점유한 자리 각각의 `participationFee`를 합산**하며, 이 값은 `reservations.total_fee`에 고정 저장되어 이후 주최자가 단가를 수정해도 변하지 않습니다 (ERD §2.7).
> 
> **(v4) `preferredPositions` → `positions`로 개명.** "희망 목록"이 아니라 "점유 대상"이므로 이름이 의미를 오도하지 않아야 합니다. 신청이 성공했다는 것은 **자리를 이미 잡았다**는 뜻입니다.
> 
> **"포지션 무관"은 지원하지 않습니다.** 무관을 뜻하는 특수값(`'ANY'`, `'ALL'`, `null`, 빈 문자열)을 정의하지 않으며, **(v5)** `Team`·`Position` enum 밖의 값은 전부 `VALIDATION_FAILED`로 거부됩니다. 서버 측 자동 배정도 없습니다 — 클라이언트가 `GET /games/:id`의 `remaining > 0`인 **자리**(`{team, position}`) 중에서 골라 요청해야 합니다. **팀도 무관을 지원하지 않습니다** — "아무 팀이나"를 허용하면 자동 배정이 필요해지고, 이는 도입하지 않기로 확정한 사항입니다.

에러 (가드 조건 위반 시 `reserve()` 트랜잭션 순서대로):

| code | statusCode | 조건 |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 | **(v5)** `slots` 누락 / 빈 배열 / 원소가 객체가 아님 / `team`이 `Team` enum 밖 / `position`이 `Position` enum 밖 (**무관 표현 시도 포함**) · **(v6)** `participantName` 누락·공백 / `depositorName` 누락 |
| `GAME_NOT_OPEN` | 409 | 경기 status ≠ OPEN |
| `USER_SUSPENDED` | 403 | is_suspended = true |
| `TIME_SLOT_CONFLICT` | 409 | 동일 시간대 다른 활성 예약 존재 |
| `DUPLICATE_RESERVATION` | 409 | 동일 경기 활성 예약 이미 존재 |
| `POSITION_NOT_OFFERED` | 409 | **(v4 신규 / v5: 팀 포함)** 해당 경기가 모집하지 않는 `(team, position)` 요청 |
| `POSITION_FULL` | 409 | **(v4 이동: 승인 → 신청 / v5: 팀 포함)** 요청 `(team, position)`의 잔여 자리 0 |

> **(v6) `LEVEL_NOT_ELIGIBLE` 삭제 — 급수 제한 폐지.** 화면설계서 §3.3(2026-08-03 확정)이 "급수는 제한이 아니라 정보"로 정하면서 **이 에러와 서버의 `required_level` 검증을 폐기**했습니다. 근거는 대리 신청과 충돌하기 때문입니다 — 인원 상한이 없으므로(§10-10) **신청자 1명만 급수를 통과하면 나머지 10명이 프리패스**가 되고, 강제되지 않는 규칙이 UI에만 남습니다.
>
> 남는 것: 프로필 `self_level`, 경기의 `recommendedLevel` 표기, P-3 급수 필터. **전부 탐색 보조이며 신청을 막지 않습니다.** 남는 제재는 `is_suspended`(노쇼 누적) 하나뿐이고, 해제는 어드민 수동 처리입니다.
>
> **(v4) `GAME_FULL` 삭제.** 전체 정원 가드가 개별 자리 점유로 대체됐습니다 — 빈 자리가 하나도 없으면 `POSITION_FULL`로 거부됩니다 (ERD §3.2).
> 
> **`POSITION_NOT_OFFERED`와 `POSITION_FULL`은 반드시 구분합니다.** 전자는 "다른 포지션을 고르세요", 후자는 "그 자리는 찼습니다"로 사용자 대응이 다릅니다. 무관 옵션을 없애 사용자가 직접 고르게 한 이상 이 둘을 뭉뚱그리면 안 됩니다.

**실패 응답에 실패한 자리를 담습니다** — 이번 개정의 핵심 목적("3자리 중 1자리만 잡혔다"를 마지막 화면에서 발견하는 상황 방지):

```json
{
  "data": null,
  "error": {
    "code": "POSITION_FULL",
    "message": "일부 자리가 마감되었습니다.",
    "statusCode": 409,
    "detail": { "failedSlots": [{ "team": "AWAY", "position": "CF" }] }
  }
}
```

> **이 응답을 받은 시점에 점유된 자리는 하나도 없습니다.** 신청은 전부 성공 아니면 전부 실패이며, 한 자리라도 실패하면 트랜잭션이 롤백되어 앞서 잡힌 자리도 함께 해제됩니다 (ERD §4.1). 클라이언트는 `failedSlots`를 근거로 즉시 다른 자리를 고르도록 안내하면 됩니다. `POSITION_NOT_OFFERED`도 동일하게 `detail.failedSlots`를 내려줍니다.
> 
> **(v5) `failedPositions` → `failedSlots`로 변경, 원소에 `team` 포함.** 포지션만 내려주면 "원정 중견수는 찼지만 홈 중견수는 남았다"를 클라이언트가 구분할 수 없어, 사용자가 같은 실패를 반복하게 됩니다. 팀까지 담아야 §5 `GameDetailDto.positions[]`의 항목과 1:1로 대응시켜 "이 자리 대신 저 자리"를 정확히 안내할 수 있습니다.

**`GET /api/v1/reservations/me`** — **(v6)** P-7 내 예약 목록

```tsx
// Query: ?status=ongoing | done | closed
{ items: ReservationSummaryDto[] }

// ReservationSummaryDto — P-7 카드 · A-2 대시보드 · A-6 목록이 공유
{
  id: string;
  status: ReservationStatus;
  createdAt: string; expiresAt: string | null;
  depositorName: string;
  slotCount: number; totalFee: number;
  slots: { team: Team; position: Position; participantName: string }[];  // (v6)
  game: {                       // (v6) 카드에 경기 정보가 필요 — 예약만으로는 못 그림
    id: string;
    gameDate: string; gameTime: string;
    stadiumName: string; leagueName: string;
    status: GameStatus;
  };
  reviewed: boolean;            // (v6) ATTENDED 건의 평가 작성 여부 (§7)
}
```

| `status` | 포함 상태 | 정렬 |
| --- | --- | --- |
| `ongoing` | `RESERVED` · `PAYMENT_SUBMITTED` · `APPROVED` | 신청 시각 **오름차순** (급한 것부터) |
| `done` | `ATTENDED` | 신청 시각 내림차순 |
| `closed` | `EXPIRED` · `CANCELLED` · `REJECTED` · `NO_SHOW` | 신청 시각 내림차순 |

> **(v6) 예약 카드에 경기 정보를 조인해 내려줍니다.** P-7 카드는 "8월 6일 19:00 · 상암구장 · 2자리"를 한 줄로 보여줍니다. 예약 목록과 경기 상세를 프론트가 각각 호출해 합치면 카드 N개에 요청 N+1번입니다.

**`GET /api/v1/reservations/:id` Response** — **(v6)** P-8 예약 상세

```tsx
ReservationSummaryDto & {
  slots: {                      // 상세는 금액까지
    team: Team; position: Position; slotNo: number;
    participantName: string; feeTier: FeeTier; fee: number;
  }[];
  rejectReason: RejectReason | null;     // (v6) REJECTED 건
  history: {                             // (v6) 상태 변경 이력 — P-8 타임라인
    status: ReservationStatus;
    at: string;
    actor: 'PLAYER' | 'HOST' | 'SYSTEM';
    reason?: RejectReason;
  }[];
  game: GameSummaryDto & { bank: BankDto; notice: string | null };  // 재입금 안내용
}
```

> **(v6) `history[]`를 위해 이력 테이블이 필요합니다** — `reservation_status_history(reservation_id, status, actor, reason, created_at)`. 현재 스키마는 `reservations.status` 현재값만 들고 있어서 "언제 승인됐는지"를 복원할 수 없습니다. P-8은 상태 타임라인을 그리는 화면입니다(화면설계서 §P-8).
>
> 표시 문구(`입금 확인을 기다리고 있어요` 같은)는 프론트가 상태로 만듭니다. 서버는 **무엇이 언제 누구에 의해** 바뀌었는지만 내려주면 됩니다.

**(v6) 종료된 예약의 자리 스냅샷**

`reject`·`cancel`·만료·경기 취소는 `releaseSlots()`로 점유를 해제합니다(§아래). 해제하면 `game_position_slot`에서 그 예약의 자취가 사라지므로, **종료된 예약은 "어떤 자리를 잡았었는지"를 조회할 수 없게 됩니다.**

그런데 P-7 `closed` 탭과 P-8은 취소·거절·만료 건에서도 자리 목록을 그대로 보여줍니다. 그래서 **해제와 같은 트랜잭션에서 자리 정보를 스냅샷으로 옮깁니다.**

```ts
// reservation_slot_snapshot (신규) — 또는 reservations.slots_snapshot JSONB
{ reservationId, seq, team, position, participantName, feeTier, fee }
```

> `total_fee`가 금액을 스냅샷하는 것과 **같은 이유, 같은 방식**입니다(ERD §2.7). 금액만 남기고 자리를 버리면 "45,000원짜리 뭔가를 신청했었다"까지만 복원됩니다.
>
> 조회 시 활성 예약은 `game_position_slot`에서, 종료 예약은 스냅샷에서 읽습니다 — `ReservationDto.slots[]`의 형태는 둘이 같아야 하고, 프론트는 어느 쪽에서 왔는지 알 필요가 없습니다.

**`GET /api/v1/leagues/:leagueId/reservations`** — **(v6)** A-6 입금 확인

```tsx
// Query: ?status=pending | done &gameId=&q=&cursor=&limit=
{ items: (ReservationSummaryDto & { nickname: string })[]; nextCursor: string | null }
```

| 파라미터 | 의미 |
| --- | --- |
| `status=pending` | `RESERVED` + `PAYMENT_SUBMITTED` — 주최자가 처리해야 할 건 |
| `status=done` | 그 외 전부 (승인·거절·취소·만료) |
| `gameId` | 경기 필터 (A-6 상단 칩). 없으면 **리그 전체 경기 합산** |
| `q` | **입금자명 부분 일치** — 은행 앱의 입금자명으로 찾습니다 |

정렬은 신청 시각 **오름차순**(먼저 신청한 사람 먼저 처리).

> **(v6) 경기별 조회(`GET /games/:gameId/reservations`)로는 A-6을 만들 수 없습니다.** 주최자의 실제 작업은 "은행 앱에 찍힌 입금 5건을 오늘 예약과 대조"이고, 그 5건은 **여러 경기에 흩어져 있습니다.** 경기별 엔드포인트만 있으면 프론트가 경기 수만큼 호출해 클라이언트에서 합쳐야 하고, 그러면 정렬·페이지네이션·입금자명 검색이 전부 성립하지 않습니다. 어드민 화면설계서가 A-6에 ★를 붙인 화면입니다.
>
> `nickname`을 함께 내려주는 이유는 **입금자명과 계정 닉네임이 자주 다르기** 때문입니다(가족 명의 이체 등). A-6 카드의 제목은 입금자명이고, 닉네임은 대조용 보조 정보입니다.

**`POST /api/v1/games/:gameId/attendance`** — **(v6)** A-7 출석 체크

```tsx
// Request — 양 팀 전원을 한 번에 제출합니다
{
  marks: {
    team: Team; position: Position; slotNo: number;
    result: 'PRESENT' | 'NO_SHOW';
  }[];
}
// Response
{
  updated: number;                 // 상태가 바뀐 예약 수
  suspendedUserIds: string[];      // 이번 처리로 정지된 사용자 (no_show_count ≥ 2)
}
```

**처리 규칙**

1. 각 마크를 해당 자리(`game_position_slot.attendance`)에 기록합니다.
2. 예약 단위로 집계해 상태를 전이합니다 — **모든 자리가 `PRESENT`면 `ATTENDED`, 하나라도 `NO_SHOW`면 `NO_SHOW`**.
3. `NO_SHOW`로 전이한 예약의 **예약자 본인에게만** `no_show_count++` (자리 수와 무관하게 예약당 1). 2회 이상이면 `is_suspended = true`.
4. 전부 한 트랜잭션입니다.

에러: `403 FORBIDDEN`, `409 GAME_NOT_ENDED`(경기일 미경과), `409 NOT_APPROVED`(APPROVED가 아닌 예약의 자리가 포함됨), `422 VALIDATION_FAILED`(존재하지 않는 자리 / **점유된 자리 중 빠진 것이 있음**)

> **(v6) 출석은 자리 단위, 상태는 예약 단위입니다.** 3자리를 잡은 예약에서 1명만 안 왔을 때, 예약 단위 엔드포인트(`PATCH /reservations/:id/no-show`)로는 이걸 표현할 수 없습니다 — 3명 전부 노쇼가 되거나 전부 참가가 됩니다. 대리 신청에 인원 상한이 없는 이상(§10-10) 흔한 경우입니다.
>
> **노쇼 카운트는 예약자에게 1회만 붙습니다.** 동행자는 계정이 없어 제재할 대상이 없고, 화면설계서 §3.2가 "데려온 사람이 책임진다"로 확정했습니다. 다만 3자리 중 3명이 안 왔다고 정지가 3배로 빨라지지는 않습니다 — 억울한 경우는 어드민이 수동 해제합니다(§3.3).
>
> **제출은 1회, 부분 제출은 받지 않습니다.** A-7의 팀 탭은 필터일 뿐 제출 단위가 아니며, 화면이 양 팀 전원 체크를 강제합니다. 서버도 점유된 자리가 `marks`에서 빠지면 `422`로 거부해 "반대 탭 인원이 조용히 누락되는" 사고를 막습니다.
>
> 개별 `PATCH /reservations/:id/attended`·`no-show`는 **사후 정정용으로 남깁니다** — 제출 후 "한 명 잘못 찍었다"를 고치는 경로이고, A-7의 정상 흐름은 이 일괄 엔드포인트입니다.

**`PATCH /api/v1/reservations/:id/approve`**

```tsx
// Request: {} (body 없음)
// Response: ReservationDto (status=APPROVED)
```

에러:

| code | statusCode | 조건 |
| --- | --- | --- |
| `NOT_PENDING_PAYMENT` | 409 | **(v6)** status ∉ { `RESERVED`, `PAYMENT_SUBMITTED` } |

> **(v6) `RESERVED` 상태에서도 승인할 수 있습니다** (기존 `NOT_PAYMENT_SUBMITTED` → `NOT_PENDING_PAYMENT`). 주최자가 실제로 하는 일은 **은행 앱 입금 내역과 예약을 대조**하는 것이고, 사용자가 「입금했어요」를 누르지 않고 돈만 보내는 경우가 흔합니다. A-6은 `RESERVED`("아직 입금 전")와 `PAYMENT_SUBMITTED`("입금했다고 알려온 건")를 **같은 대기 목록에 두고 둘 다에 승인·거절 버튼을 답니다.** 사용자의 자기 신고를 승인의 전제 조건으로 두면, 돈은 들어왔는데 승인할 수 없는 상태가 생깁니다.
>
> **참가비 0원 예약도 같은 경로로 승인합니다** — 대조할 입금이 없을 뿐 상태 전이는 같습니다.
>
> **(v4) 승인은 입금 확인만 담당합니다.** 포지션은 신청 시점에 이미 확정되므로 `assignedPosition` 요청 필드가 사라졌고, `POSITION_NOT_PREFERRED`·`POSITION_FULL` 에러도 신청 단계로 이동했습니다. **승인 단계에서 자리 부족으로 실패하는 경우는 더 이상 없습니다** (ERD §4.2).

**`PATCH /api/v1/reservations/:id/no-show`**

```tsx
// Request: {} (body 없음)
// Response: ReservationDto (status=NO_SHOW) + { userSuspended: boolean }
```

> 부수 효과: `no_show_count++`, 2회 이상 시 `is_suspended=true` — 응답에 `userSuspended` 플래그를 포함해 프론트에서 즉시 안내 가능.
> 

에러: `409 NOT_APPROVED`, `409 GAME_NOT_ENDED` (경기일 미경과)

**`PATCH /api/v1/reservations/:id/reject`** — **(v6)** 사유 필수

```tsx
// Request
{ reason: RejectReason }
// Response: ReservationDto (status=REJECTED)

export enum RejectReason {
  NOT_DEPOSITED   = 'NOT_DEPOSITED',    // 미입금
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',  // 금액 불일치
  DUPLICATE       = 'DUPLICATE',        // 중복 신청
  OTHER           = 'OTHER',            // 기타
}
```

> **(v6) 거절에는 사유가 반드시 붙습니다.** A-6의 거절 다이얼로그는 사유 4종 중 하나를 고르게 하고 **"사유는 신청자에게 그대로 전달돼요"** 라고 안내합니다. 사유를 저장하지 않으면 P-8의 `REJECTED` 예약에 "왜 거절됐는지"가 비고, 사용자는 재신청 여부를 판단할 수 없습니다 — `미입금`이면 다시 넣으면 되고 `중복 신청`이면 그럴 필요가 없습니다.
>
> 사유는 `reservations.reject_reason`에 저장하고 `ReservationDto.rejectReason`·`history[].reason`·알림(§8)에 실어 보냅니다. 자유 텍스트는 받지 않습니다 — 알림톡 템플릿이 고정 문구라 enum이어야 매핑됩니다.

**공통 (payment-submitted / reject / cancel / attended)**

| 엔드포인트 | 필요 상태 | 주요 에러 |
| --- | --- | --- |
| payment-submitted | RESERVED | `409 NOT_RESERVED`, `409 RESERVATION_EXPIRED` |
| reject | **(v6)** RESERVED / PAYMENT_SUBMITTED | **(v6)** `409 NOT_PENDING_PAYMENT`, `422 VALIDATION_FAILED`(`reason` 누락) |
| cancel | RESERVED / PAYMENT_SUBMITTED | `409 ALREADY_TERMINAL` |
| attended | APPROVED | `409 NOT_APPROVED`, `409 GAME_NOT_ENDED` |

> **(v6) 거절도 `RESERVED`에서 가능합니다.** 사유 4종에 **「미입금」이 있다는 것 자체가** 입금 자기 신고를 하지 않은 예약(`RESERVED`)을 거절 대상으로 전제합니다. 승인과 대칭입니다.

> **(v4) 슬롯 해제.** `reject`·`cancel`, 그리고 만료 Cron(`EXPIRED`)과 경기 취소(`POST /games/:id/cancel`)는 상태 전이와 **같은 트랜잭션에서 점유 슬롯을 해제**해야 합니다 (ERD §4.2.1 `releaseSlots()`). 해제를 빠뜨리면 상태만 종료되고 자리는 영구히 잠깁니다. `attended`·`no-show`는 경기 종료 후이므로 해제하지 않습니다.
>
> **(v6) 해제와 같은 트랜잭션에서 자리 스냅샷을 남깁니다.** 위 §"종료된 예약의 자리 스냅샷" 참고 — 해제만 하고 스냅샷을 빠뜨리면 P-7 `closed` 탭과 P-8에서 자리 목록이 빈 채로 그려집니다.

---

## 7. Evaluations

| Method | Path | Guard | 설명 |
| --- | --- | --- | --- |
| GET | `/api/v1/games/:gameId/participants` | JwtAuthGuard + AttendedGuard | **(v6)** 평가 대상 참가자 목록 |
| POST | `/api/v1/games/:gameId/evaluations` | JwtAuthGuard + AttendedGuard | 평가 작성 (**(v6)** 일괄) |
| GET | `/api/v1/games/:gameId/evaluations` | JwtAuthGuard + AttendedGuard | 같은 경기 참가자끼리 조회 |
| GET | `/api/v1/users/:id/evaluations/summary` | 없음 | 선수 카드용 평균 점수 (공개) |

**`GET /api/v1/games/:gameId/participants` Response** — **(v6)** P-9 평가 대상

```tsx
{
  items: {
    userId: number;                 // (v6.3) 정수 (§0.3)
    nickname: string;
    team: Team; position: Position;
    reviewedByMe: boolean;    // 요청자가 이미 평가한 대상
  }[];
  bestPlayerVotesLeft: number;   // 남은 베스트플레이어 투표 수 (0~2)
}
```

**포함 규칙**

- 해당 경기에서 `ATTENDED`인 예약의 **자리** 중,
- **요청자 본인 제외**,
- **계정이 있는 참가자만** — 즉 각 예약의 `slots[0]`(예약자 본인)에 해당하는 자리만. 대리 신청분(`slots[1..]`)은 이름 문자열뿐이라 평가 대상이 아닙니다(화면설계서 §3.2).

> **(v6) 평가 대상 목록을 서버가 줘야 합니다.** 기존 `GET /games/:gameId/evaluations`는 **작성된 평가 목록**이지 참가자 목록이 아닙니다. P-9은 "이 경기에서 내가 평가할 수 있는 사람"을 한 명씩 넘기며 3척도를 매기는 화면이라, 그 명단이 없으면 화면이 시작되지 않습니다.
>
> **`reviewedByMe`가 P-7의 「평가하기」 배지 근거이기도 합니다.** 예약 목록의 `reviewed`(§6)는 이 경기에서 평가 대상 전원을 평가했는지로 계산합니다.
>
> `AttendedGuard`는 여기에도 걸립니다 — 참가하지 않은 사람이 참가자 명단을 조회할 이유가 없습니다.

**`POST /api/v1/games/:gameId/evaluations`** — **(v6)** 일괄 제출

```tsx
// Request — 한 경기의 평가를 한 번에 제출합니다
{
  items: {
    evaluateeId: number;        // (v6.3) 정수 (§0.3)
    mannerScore: number;        // 1~5
    skillMatchScore: number;    // 1~5
    punctualityScore: number;   // 1~5
    isBestPlayer?: boolean;
  }[];
}
// Response: { items: EvaluationDto[] }
```

> **(v6) 배열로 받고 전부 성공 아니면 전부 실패입니다.** P-9은 참가자를 한 명씩 넘기며 작성한 뒤 **마지막에 한 번 제출**합니다. 이걸 대상 수만큼 개별 요청으로 쪼개면, 4번째에서 `BEST_PLAYER_LIMIT_REACHED`가 나도 앞의 3건은 이미 저장돼 있어 되돌릴 방법이 없습니다.
>
> **베스트플레이어 2명 제한이 요청 하나 안에서 검증돼야 하는 이유이기도 합니다** — 제한이 (평가자 × 경기) 단위 누적값이라, 요청이 갈라지면 부분 저장된 앞 요청이 뒤 요청의 검증 결과를 바꿉니다. `items` 안의 `isBestPlayer=true` 개수와 기존 저장분의 합이 2를 넘으면 트랜잭션 전체를 거부합니다.

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
    gameId: string | null;                       // (v6) 알림 → 화면 이동에 필요
    reason: RejectReason | null;                 // (v6) REJECTED 알림의 사유 (§6)
    isRead: boolean;
    sendStatus: 'PENDING' | 'SENT' | 'FAILED';   // 신규: 카카오 알림톡 발송 상태
    createdAt: string;
  }[];
  unreadCount: number;
}
```

> **(v6) 알림 문구(title·body)는 서버가 내려주지 않습니다.** 프론트가 `type`(+`reason`)으로 문구를 만듭니다 — 알림함(P-11)의 표현이 카카오 알림톡 템플릿과 같을 이유가 없고, 문구를 서버에 두면 카피 수정에 배포가 필요해집니다. 서버는 **무슨 일이 일어났는지**만 내려주면 됩니다.
>
> **(v6) `reason`을 싣는 이유:** 거절 알림에서 "사유는 신청자에게 그대로 전달돼요"(A-6)가 성립하려면 알림이 사유를 알아야 합니다. `reservationId`로 다시 조회하게 하면 알림함 목록에서 N번 요청이 됩니다.
>
> **(v6) `WAITLIST_PROMOTED`는 프론트에 대응 화면이 없습니다.** 대기열이 MVP 밖이라(P1-2) 이 타입이 실제로 발송되면 알림함에서 알 수 없는 항목이 됩니다 — MVP에서는 발송하지 않습니다.

> `NotificationsService`가 알림 생성과 동시에 카카오 알림톡 API를 호출한다. 발송 실패 시 `sendStatus=FAILED`로 남기고, 재시도 큐(예: `@nestjs/schedule` cron으로 5분 간격 재시도)를 두는 것을 권장. 알림톡 템플릿 코드는 `NotificationType`별로 1:1 매핑(예: `APPROVED` → 템플릿 A) — 템플릿 심사·코드 값은 카카오 비즈니스 채널 등록 후 확정.
> 

---

## 9. DTO ↔ 테이블 매핑 요약

| DTO | 소스 테이블 | 비고 |
| --- | --- | --- |
| `UserSummaryDto` | users (일부) | 로그인 응답용 최소 필드 |
| `UserDetailDto` | users (전체) | 본인 조회/수정용 |
| `BankDto` | banks | **신규** |
| `LeagueDto` | leagues + banks(조인) | `bankId` → `bank: BankDto`로 응답 시 조인. **(v6)** `intro`·`defaultFees` 추가 |
| `LeagueDashboardDto` | 집계 쿼리 (reservations + games) | **(v6)** A-2. 어드민 셸 배지가 매 페이지 호출 |
| `GameSummaryDto` | games + game_positions + game_position_slot(집계) + leagues(조인) | **(v6)** P-3 카드·A-3·A-2 공용. 팀별 채움 수와 빈 자리 칩까지 목록에서 집계 |
| `ReservationSummaryDto` | reservations + 자리(활성=슬롯 / 종료=스냅샷) + games(조인) | **(v6)** P-7·A-6·A-2 공용 |
| `ParticipantDto` | reservations(ATTENDED) + game_position_slot + users | **(v6)** P-9 평가 대상. 각 예약의 `slots[0]`만 (대리분은 계정 없음) |
| `GameDetailDto` | games + game_positions + **game_position_slot** + leagues(조인) | **(v4)** 잔여석 = `game_position_slot`에서 `reservation_id IS NULL`인 행 수 집계 (기존 `capacity - approvedCount` 산식 폐기). stadiumName·계좌는 league 조인으로 제공. **(v5)** 집계 단위가 `game_positions` 행(= 팀×포지션) — `GROUP BY gp.id`로 슬롯을 세고 `team`·`position`·`participationFee`는 그 행에서 읽는다. `feeRange`는 `participation_fee`의 `MIN`/`MAX` — `games`에 참가비 컬럼 없음 |
| `ReservationDto` | reservations + **game_position_slot** | **(v4)** `slotCount`, `slots`, `totalFee` 포함. 점유 포지션은 슬롯에서 조회 (`preferred_positions`·`assigned_position` 컬럼 제거됨). **(v5)** `slots: { team, position, slotNo }[]` — 슬롯은 `game_position_id`만 갖고 `team`·`position`은 `game_positions` 조인으로 채운다 (ERD §2.6). `totalFee`는 `reservations.total_fee` 컬럼을 그대로 반환 (조회 시 재계산하지 않음 — 단가 수정에 소급되지 않도록) |
| `EvaluationDto` | evaluations |  |
| `ReservationSlotSnapshot` | **(v6)** reservation_slot_snapshot | 해제된 자리의 team·position·participantName·fee 보존 |
| `ReservationStatusHistory` | **(v6)** reservation_status_history | P-8 타임라인. status·actor·reason·created_at |
| `NotificationDto` | notifications | `reservationId`, `sendStatus`(카카오 알림톡 발송 상태) 포함. **(v6)** `gameId`·`reason` 추가, 문구는 미포함(프론트 생성) |

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
| 8 | **(v4)** 복수 자리 신청 | 1건의 예약이 N자리를 **원자적으로** 점유 — 부분 성공 없음 | §6 |
| 9 | **(v4)** 포지션 무관 신청 | **금지** — 구체 포지션만 지정, 무관 특수값 미정의, 서버 자동 배정 없음 | §6 |
| 10 | **(v4)** 예약당 자리 수 상한 | **상한 없음** (`slotCount ≥ 1`) — 한 명이 빈 자리를 전부 점유할 수 있다는 트레이드오프 인지함 | §6 |
| 11 | **(v4)** 포지션 확정 시점 | 주최자 승인 → **신청 시점**으로 이동. 승인은 입금 확인만 담당 | §6 |
| 12 | **(v6)** 동반 신청자 신원 | **자리마다 참가자 이름을 저장합니다**(이전 판의 "저장하지 않음"을 뒤집음). 계정 연결은 없고 이름 문자열만 — 화면설계서 §3.2 확정 | §5·§6 |
| 13 | **(v6)** 급수 제한 | **폐지.** `LEVEL_NOT_ELIGIBLE`·`required_level` 검증 삭제, `recommendedLevel`(표시·필터 전용)로 개명 — 화면설계서 §3.3 확정 | §5·§6 |
| 14 | **(v6)** 경기 상세 응답 단위 | 포지션 집계 → **자리 단위**(`positions[].slots[]`). 집계만으로는 포지션 보드를 그릴 수 없음 | §5 |
| 15 | **(v6)** 예약 상태 이력 | `reservation_status_history` 신설 — P-8 타임라인 | §6 |
| 16 | **(v6)** 종료 예약의 자리 | 해제와 같은 트랜잭션에서 **스냅샷 보존** (`total_fee`와 같은 이유) | §6 |
| 17 | **(v6)** 출석 처리 단위 | 예약 단위 개별 → **자리 단위 일괄 1회**(`POST /games/:id/attendance`). 노쇼 카운트는 예약자에게 예약당 1회 | §6 |
| 18 | **(v6)** 승인·거절 가능 상태 | `PAYMENT_SUBMITTED`만 → **`RESERVED`도 허용**. 사용자가 자기 신고를 하지 않아도 입금은 들어옴 | §6 |
| 19 | **(v6)** 거절 사유 | `RejectReason` enum 4종 **필수**, 알림에 실어 전달 | §6·§8 |
| 20 | **(v6)** 참가비 입력 단위 | 포지션별 금액 → **티어 4종**(`FeeTier` 신설). 저장은 v5 그대로 (팀×포지션) | §4·§5 |
| 21 | **(v6)** 인증 토큰 전달 | body 전용 → **httpOnly 쿠키 병행**. 카카오 콜백은 302 리다이렉트로 온보딩 분기 | §1 |
| 22 | **(v6)** 평가 제출 | 1건씩 → **경기 단위 일괄**(부분 저장 방지, 베스트플레이어 2명 제한 검증) | §7 |

**남은 확인 사항 (경미):**

- §7의 베스트플레이어 제한을 "평가자당 2명"으로 해석해 반영했습니다. 만약 "경기당 전체 2명"이 의도였다면 다시 알려주세요.
- **(v6에서 해소됨)** ~~동반 신청자 신원을 저장하지 않습니다~~ → 자리마다 `participant_name`을 저장합니다(§6). 다만 **계정과 연결하지는 않으므로** 평가(§7)와 노쇼 카운트(§6)는 여전히 예약자 1인 기준입니다 — 이건 화면설계서 §3.2가 의도한 트레이드오프입니다("데려온 사람이 책임진다").
- **(v6) ERD 문서가 아직 이 개정을 반영하지 않았습니다.** 문서 상단 "v6가 요구하는 ERD 변경" 목록의 11개 항목(신규 테이블 2개 + 컬럼 9개)을 ERD에 반영해야 구현을 시작할 수 있습니다.
- **(v6) 문의하기 경로가 여전히 미정입니다.** 정지 안내가 뜨는 화면 3곳(P-4·P-5·P-10)이 전부 "문의하기"를 노출하는데 그 버튼이 어디로 갈지 정해지지 않았습니다(어드민 §6-1). 정지 해제가 어드민 수동 처리인 이상 이 경로가 없으면 §3.3의 구제 절차가 성립하지 않습니다.
- 카카오 알림톡 템플릿 코드는 카카오 비즈니스 채널 심사 이후에나 확정되므로, 이 부분은 실제 연동 단계에서 값을 채워야 합니다.