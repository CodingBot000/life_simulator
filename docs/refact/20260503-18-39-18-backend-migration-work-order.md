# Spring Boot Backend Migration Work Order

작성 시각: 2026-05-03 18:39:18 KST

## 목적

Next.js 내부 API와 TypeScript 서버 파이프라인을 Spring Boot 백엔드로 단계적으로 이전한다. 로컬 개발에서는 Codex CLI 인증을 계속 사용하고, 현재 단계에서는 별도 과금되는 `OPENAI_API_KEY`를 요구하지 않는다.

## 공통 규칙

- 파일당 500-800라인 이하를 지킨다. 500라인을 넘기면 역할 분리 가능성을 먼저 검토한다.
- controller, service, adapter, domain factory, config, repository 역할을 섞지 않는다.
- API response shape는 기존 `frontend/src/lib/types.ts`와 호환되게 유지한다.
- `/api/simulate`의 NDJSON progress event 계약을 유지한다.
- Codex CLI 기본 모델은 임시로 `gpt-5.3-codex-spark`를 쓴다.
- Codex CLI 기본 설정은 `model_reasoning_effort=low`, `model_verbosity=low`, `service_tier=fast`를 쓴다.
- OpenAI API provider는 명시 요청 전까지 백엔드 기본 경로에 넣지 않는다.
- Docker 설정은 Codex CLI host login 공유 문제 해결 전까지 추가하지 않는다.
- `outputs/` 계열은 런타임/생성 데이터로 보고 소스 설계의 근거로 삼지 않는다.
- 변경 후 검증은 변경면에 맞춘 최소 명령으로 한다.

## Phase 1: Repository Split

작업:

- `frontend/`를 만들고 기존 Next.js 프로젝트 파일을 이동한다.
- `backend/`를 만들고 Spring Boot Maven Wrapper 기반 프로젝트를 만든다.
- 루트 `docs/refact/`를 만든다.
- 루트 `AGENTS.md`, `.gitignore`, `README.md`를 모노레포 기준으로 갱신한다.

검증:

- `git status --short`로 이동 누락 확인.
- `cd frontend && npm run typecheck`
- `cd backend && ./mvnw test`

커밋 포인트:

```sh
git add AGENTS.md README.md .gitignore frontend backend docs/refact
git commit -m "refactor: split frontend and backend workspaces"
```

## Phase 2: Backend API Shell

작업:

- `CasesController`에서 `GET /api/cases` 제공.
- `SimulationController`에서 `POST /api/simulate` JSON/NDJSON 제공.
- `MetricsController`에서 `GET /api/metrics` 제공.
- `MonitoringController`에서 monitoring endpoint shape를 임시 보존한다.
- CORS는 `localhost:3000`, `127.0.0.1:3000`을 허용한다.

검증:

- `cd backend && ./mvnw test`
- 백엔드 실행 후 `curl http://localhost:8080/api/cases`
- 백엔드 실행 후 `curl http://localhost:8080/api/metrics`

커밋 포인트:

```sh
git add backend
git commit -m "feat: add spring boot api shell"
```

## Phase 3: Codex CLI Adapter

작업:

- Java `CodexCliClient`를 구현한다.
- `codex login status`가 성공한 host 인증을 사용한다.
- `codex exec` 호출은 `--sandbox read-only`, `--output-schema`, `--output-last-message`를 사용한다.
- 빠른 개발 응답 설정을 기본값으로 둔다.
- timeout, command, model, fallback 여부는 `application.yml`에서 조정 가능하게 둔다.

검증:

- `codex login status`
- `cd backend && ./mvnw test`
- 실제 simulate 호출은 모델/네트워크 상태에 의존하므로 수동 확인으로 분리한다.

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/llm backend/src/main/resources/application.yml
git commit -m "feat: add codex cli backend adapter"
```

## Phase 4: Frontend API Boundary

작업:

- `frontend/app/page.tsx`가 `NEXT_PUBLIC_API_BASE_URL`을 통해 Spring Boot API를 호출하게 한다.
- 기본값은 `http://localhost:8080`으로 둔다.
- `.env.example`, `.env.local.example`에서 OpenAI API key placeholder를 제거하고 Codex CLI/spark 모델 기본값을 둔다.
- 기존 Next API route는 fallback으로 남기되 신규 개발은 backend에 한다.

검증:

- `cd frontend && npm run typecheck`
- backend와 frontend를 같이 실행한 뒤 브라우저에서 케이스 로딩 확인.
- `/api/simulate`는 Codex CLI 상태에 따라 응답 시간이 달라질 수 있으므로 fallback 응답 여부도 확인한다.

커밋 포인트:

```sh
git add frontend/app/page.tsx frontend/.env.example frontend/.env.local.example
git commit -m "refactor: route frontend api calls to spring backend"
```

## Phase 5: Full Simulation Port

작업:

- TypeScript `simulation-service.ts`를 Java service 단위로 쪼개서 이전한다.
- 추천 순서:
  - request validation
  - execution context
  - routing/cost policy
  - structured stage runner
  - prompt/schema loader
  - guardrail deterministic evaluator
  - advisor/reflection derived result
  - request envelope/logging
- prompt 파일은 `backend/src/main/resources/prompts/`로 복사하고 loader를 만든다.
- JSON schema는 Java resource로 관리한다.
- `frontend/src/lib/types.ts`와 백엔드 response fixture를 함께 비교한다.

검증:

- `cd backend && ./mvnw test`
- representative fixture로 `/api/simulate` JSON 응답 shape 비교.
- NDJSON progress event 순서 검증.

커밋 포인트:

```sh
git add backend
git commit -m "feat: port simulation orchestration to spring"
```

## Phase 6: Logging, Metrics, Workers

작업:

- 기존 Postgres migration을 Spring Boot Flyway 또는 plain SQL 실행 경로로 이전한다.
- request log envelope를 DB 또는 file queue로 저장한다.
- worker는 Spring scheduler, command runner, 또는 별도 worker module로 나눈다.
- monitoring snapshot, alerts, report endpoint를 stub에서 실제 집계로 교체한다.

검증:

- DB 연결 있는 환경에서 backend integration test.
- `/api/metrics`
- `/api/monitoring/metrics`
- anomaly/reeval fixture 기반 집계 확인.

커밋 포인트:

```sh
git add backend frontend/db frontend/scripts frontend/workers
git commit -m "feat: migrate logging and monitoring backend"
```

## Phase 7: Legacy Cleanup

작업:

- Spring Boot가 기능 동등성을 확보한 endpoint부터 `frontend/app/api/*`를 제거한다.
- React+Vite 전환 전에 Next 전용 server code 의존성을 끊는다.
- `openai` npm dependency는 더 이상 쓰지 않을 때 제거한다.

검증:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd backend && ./mvnw test`
- 수동 UI smoke test.

커밋 포인트:

```sh
git add frontend backend
git commit -m "refactor: remove migrated next api routes"
```
