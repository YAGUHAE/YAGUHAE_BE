# Contributing

야구해(YAGUHAE_BE) 백엔드 저장소의 커밋/이슈/PR 규칙입니다.

## 커밋 메시지 컨벤션

```
<type>: <한국어 설명>
```

- `type`은 영어 소문자, 설명은 한국어로 작성합니다.
- 사용 가능한 type:
  - `feat`: 새로운 기능 추가
  - `fix`: 버그 수정
  - `refactor`: 동작 변화 없는 코드 개선
  - `chore`: 빌드/설정/의존성 등 코드 외적인 변경
  - `test`: 테스트 추가/수정
  - `docs`: 문서 추가/수정
- 예시 (실제 커밋 이력):
  - `chore: 프로젝트 초기 세팅`
  - `chore: api prefix api/v1으로 수정`
  - `docs: API 명세서 & ERD 문서 추가`

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
- ERD: [`docs/ERD.md`](docs/ERD.md)
