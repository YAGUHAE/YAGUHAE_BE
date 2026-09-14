# Contributing

야구해(YAGUHAE_BE) 백엔드 저장소의 커밋/이슈/PR 규칙입니다.

## 커밋 메시지 컨벤션

**Conventional Commits** 형식을 따릅니다. Husky가 자동으로 커밋 메시지를 검증합니다.

### 기본 형식

```
<type>(<scope>): <subject>
```

### Type (필수)

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 동작 변화 없는 코드 개선
- `perf`: 성능 개선
- `style`: 코드 스타일 변경 (기능 변화 없음)
- `test`: 테스트 추가/수정
- `docs`: 문서 추가/수정
- `chore`: 빌드/설정/의존성 등 코드 외적인 변경
- `ci`: CI/CD 설정 변경

### Scope (선택, 권장)

변경 범위를 나타냅니다. 예: `(auth)`, `(user)`, `(database)` 등

### Subject (필수)

- 한국어로 작성
- 명령조 사용 (e.g., "추가" not "추가됨")
- 마침표(.)로 끝내지 않음

### 예시

✅ **올바른 형식:**
```
feat(auth): 로그인 기능 추가
fix(user): 프로필 조회 에러 수정
docs(api): API 명세서 업데이트
chore(deps): 의존성 업데이트
```

❌ **잘못된 형식:**
```
추가: 로그인 기능
Add login feature
feat: 추가됨.
```

### Husky 자동 검증

커밋 시 Husky의 `commit-msg` 훅이 자동으로 메시지를 검증합니다.
- 규칙을 위반하면 커밋이 실패합니다.
- Pre-commit 훅도 함께 실행되어 ESLint와 Prettier를 자동으로 실행합니다.

## 이슈 작성 가이드

- 새 이슈는 제공된 템플릿(버그 리포트 / 기능 요청)을 사용합니다.
- 제목은 템플릿의 프리픽스(`[Bug]`, `[Feat]`)를 유지합니다.
- 관련 라벨(`bug`, `enhancement` 등)을 확인하고 필요하면 추가합니다.

## PR 작성 가이드

- PR 템플릿의 변경 사항 / 관련 이슈 / 변경 유형 / 체크리스트를 빠짐없이 채웁니다.
- 가능하면 이슈를 먼저 만들고 PR 본문에 `Closes #이슈번호`로 연결합니다.
- 머지 전 `pnpm lint`, `pnpm test`가 통과하는지 확인합니다.
- 커밋 메시지는 위 컨벤션을 따릅니다. 하나의 논리적 변경 단위로 커밋을 나누는 것을 권장합니다.

## 문서(`docs/`) 기여 규칙

- `docs/ERD.md`, `docs/API 명세서.md` 등 프로젝트 문서를 추가/수정할 때는 커밋 타입을 `docs`로 사용합니다 (예: `docs: 팀 엔티티 ERD 갱신`).
- API 스펙이나 엔티티 구조를 변경하는 코드 변경(`feat`/`fix`/`refactor`)이 있다면, 관련 문서(`docs/API 명세서.md`, `docs/ERD.md`)도 **같은 PR 안에서** 함께 갱신합니다. 문서만 따로 나중에 갱신하지 않습니다.
- 문서 전용 변경(코드 변경 없이 오탈자 수정, 설명 보강 등)은 별도 PR로 분리해도 무방하며, 이 경우 커밋은 `docs` 타입만 사용합니다.

## 관련 문서

- NestJS 백엔드 코드 컨벤션: [`.claude/skills/nestjs-backend/SKILL.md`](.claude/skills/nestjs-backend/SKILL.md)
- API 명세: [`docs/API 명세서.md`](docs/API%20명세서.md)
- 카카오 로그인 설정: [`docs/카카오 로그인 설정.md`](docs/카카오%20로그인%20설정.md)
- ERD: [`docs/ERD.md`](docs/ERD.md)
