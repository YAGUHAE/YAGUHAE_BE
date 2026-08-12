# YAGUHAE_BE

야구 커뮤니티 플랫폼 **야구해**의 백엔드 저장소입니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 런타임 | Node.js 24, pnpm 10 |
| 프레임워크 | NestJS 11 (전역 prefix `api/v1`) |
| DB | PostgreSQL 16, TypeORM (마이그레이션 기반, `synchronize: false`) |
| 배포 | Docker, Nginx(리버스 프록시), GitHub Actions, GHCR, AWS EC2 |

## 로컬 실행

```bash
cp .env.example .env       # 필요한 값 수정
docker compose up -d       # PostgreSQL 기동
pnpm install
pnpm migration:run
pnpm start:dev             # http://localhost:4000/api/v1
```

## 자주 쓰는 명령어

```bash
pnpm start:dev             # 개발 서버 (watch)
pnpm build                 # 프로덕션 빌드
pnpm lint                  # 린트 + 자동 수정
pnpm lint:check            # 린트 검사만 (CI와 동일)
pnpm format:check          # 포맷 검사만 (CI와 동일)
pnpm test                  # 단위 테스트
pnpm test:e2e              # e2e 테스트 (DB 필요)

pnpm migration:generate src/database/migrations/<이름>   # 엔티티 변경분 마이그레이션 생성
pnpm migration:run                                       # 마이그레이션 적용
pnpm migration:revert                                    # 직전 마이그레이션 되돌리기
```

## 헬스체크

| 경로 | 용도 |
|---|---|
| `GET /api/v1/health` | Liveness (DB 조회 없음) |
| `GET /api/v1/health/ready` | Readiness (DB 연결 확인, 실패 시 503) |

## CI/CD

브랜치 전략은 `dev`(개발 통합) → `main`(배포)입니다.

- **CI** (`.github/workflows/ci.yml`) — `dev`/`main` 대상 PR·푸시에서 포맷·린트·빌드·단위/e2e 테스트와 Docker 이미지 빌드를 검증합니다.
- **CD** (`.github/workflows/cd.yml`) — `main` 푸시 시 이미지를 GHCR에 푸시하고 EC2에 배포한 뒤 헬스체크로 검증합니다. `dev`는 CI 검증까지만 수행합니다.

운영 환경은 EC2 한 대에서 compose로 `postgres` → `migration` → `app` → `nginx` 순서로 기동되며, 외부에 노출되는 것은 nginx(80)뿐입니다.

```
외부 ──80──→ nginx ──4000──→ app ──5432──→ postgres
```

nginx 설정은 [`nginx/conf.d/default.conf`](nginx/conf.d/default.conf)에서 버전 관리되고 배포 시 함께 전송됩니다.

서버 준비 절차, 필요한 GitHub Secrets, 롤백 방법은 [`docs/배포 가이드.md`](docs/배포%20가이드.md)를 참고하세요.

## 문서

- [배포 가이드](docs/배포%20가이드.md)
- [API 명세서](docs/API%20명세서.md)
- [ERD](docs/ERD.md)
- [커밋/이슈/PR 컨벤션](CONTRIBUTING.md)
