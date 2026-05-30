# Stepwise Development Instructions

작성 시각: 2026-05-03 19:15:22 KST

## 공통 원칙

- 로컬 개발 LLM 호출은 Codex CLI 인증을 사용한다.
- 별도 과금되는 `OPENAI_API_KEY`를 요구하거나 기본 경로로 사용하지 않는다.
- 개발 테스트 기본 모델은 응답속도 우선으로 `gpt-5.3-codex-spark`를 사용한다.
- Codex CLI 실행 옵션은 낮은 reasoning, 낮은 verbosity, 빠른 service tier를 우선한다.
- 파일당 500-800라인 이하를 목표로 유지한다. 800라인을 넘기기 전에 역할별 클래스로 분리한다.
- 컨트롤러는 HTTP 계약만 담당하고, 비즈니스 로직은 service, 저장소 로직은 repository/gateway로 분리한다.
- API 응답 shape는 기존 프론트 UI가 소비하는 `SimulationResponse`, monitoring snapshot 계약을 깨지 않는다.
- `frontend/outputs`와 `outputs`는 런타임/검증 산출물로 취급한다. 마이그레이션 판단의 source of truth는 코드와 DB migration이다.

## Step 1. 구조 분리 기준 커밋

목표:

- 기존 Next.js 프로젝트가 `frontend/` 아래에서 동일하게 빌드되는 상태를 보존한다.
- Spring Boot 백엔드 초기 골격을 `backend/` 아래에 둔다.
- 이후 작업이 섞이지 않도록 구조 변경분을 먼저 커밋한다.

대상:

- `frontend/**`
- `backend/**`
- `README.md`
- `AGENTS.md`
- `.gitignore`
- `docs/refact/**`

완료 기준:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd backend && ./mvnw test`
- 백엔드 실행 후 `/api/cases`, `/api/metrics`, `/api/simulate` fallback smoke 통과

커밋 지시:

- 커밋 메시지: `refactor: split frontend and bootstrap backend`

## Step 2. 백엔드 로컬 Postgres 기반 설정

목표:

- Docker 없이 로컬 Postgres를 사용하는 백엔드 DB 설정을 추가한다.
- Spring Boot에서 migration을 관리하도록 Flyway를 붙인다.
- 기존 `frontend/db/migrations`의 LLMOps 테이블을 backend migration으로 복사한다.

대상:

- `backend/pom.xml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V1__init_llmops.sql`
- 필요 시 `backend/README.md`

완료 기준:

- `./mvnw test`가 DB 없이도 통과한다.
- 로컬 Postgres 연결정보를 주면 Spring Boot 실행 시 Flyway migration이 적용된다.

커밋 지시:

- 커밋 메시지: `feat: configure backend local postgres`

## Step 3. simulate 실행 envelope와 로그 저장

목표:

- `/api/simulate`가 응답만 반환하지 않고 request/stage/guardrail envelope를 생성한다.
- DB가 연결된 경우 `llm_request_logs`, `llm_stage_logs`, `llm_guardrail_events`, `llm_anomaly_events`, `llm_model_usage_daily`에 저장한다.
- DB가 없거나 저장 실패 시 사용자의 simulation 응답은 깨지지 않게 한다.

역할 분리:

- `SimulationService`: 실행 흐름과 응답 생성
- `SimulationResponseFactory`: UI 응답 shape 생성
- `SimulationEnvelopeFactory`: 로그/envelope 생성
- `SimulationLogService`: 저장 orchestration
- `SimulationLogRepository`: JDBC insert/upsert

완료 기준:

- `/api/simulate` fallback smoke가 기존 응답 shape를 유지한다.
- DB 연결 없는 상태에서 `./mvnw test` 통과
- DB 연결 있는 상태에서 요청 1건 후 request/stage/guardrail row 확인

커밋 지시:

- 커밋 메시지: `feat: persist simulation execution logs`

## Step 4. 기존 TypeScript pipeline parity 강화

목표:

- 기존 `frontend/src/server/agent/simulation-service.ts`의 단계 흐름을 Java 쪽에 단계별 서비스로 이전한다.
- 현재 1회 Codex 호출 + deterministic merge 방식에서, 단계별 prompt/schema 호출 구조로 전환한다.
- routing 결과에 따라 light/standard/careful/full 경로가 달라지는 동작을 맞춘다.

대상:

- `backend/src/main/java/com/lifesimulator/backend/simulation/**`
- `backend/src/main/java/com/lifesimulator/backend/routing/**`
- `backend/src/main/java/com/lifesimulator/backend/guardrail/**`
- `backend/src/main/resources/prompts/**`

완료 기준:

- 각 stage별 progress event가 기존 이름과 순서를 유지한다.
- light/standard/careful/full 샘플 요청별 selected_path가 기대와 맞는다.
- live Codex 호출은 짧은 케이스 1건으로만 검증하고, 실패 시 fallback-on-error 정책이 응답을 보존한다.

커밋 지시:

- 커밋 메시지: `feat: port simulation stages to backend`

## Step 5. monitoring API DB 집계 전환

목표:

- `/api/monitoring/metrics`, `/api/monitoring/alerts`, `/api/monitoring/critical-cases`, `/api/monitoring/report`를 DB 기반으로 전환한다.
- DB가 없을 때는 빈 snapshot을 반환하되 API shape는 유지한다.

역할 분리:

- `MonitoringController`: HTTP 계약
- `MonitoringQueryService`: window/range 집계
- `MonitoringAlertService`: alert rule 평가
- `MonitoringReportService`: 일간 report 조립
- `MonitoringRepository`: SQL query

완료 기준:

- DB 없는 상태에서 monitoring endpoints가 빈 snapshot으로 정상 응답한다.
- DB에 simulate log가 1건 이상 있으면 totals와 timeline에 반영된다.

커밋 지시:

- 커밋 메시지: `feat: back monitoring APIs with postgres`

## Step 6. Next.js API route 제거 준비

목표:

- 백엔드 parity가 확보된 endpoint부터 `frontend/app/api/*` 의존을 제거한다.
- React+Vite 전환 전 프론트는 UI와 API client 중심으로 얇게 만든다.

완료 기준:

- 프론트에서 Next API route 없이 `NEXT_PUBLIC_API_BASE_URL`로 백엔드를 호출한다.
- `npm run typecheck`, `npm run build` 통과

커밋 지시:

- 커밋 메시지: `refactor: remove migrated frontend api routes`
