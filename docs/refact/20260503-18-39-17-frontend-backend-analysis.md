# Frontend to Backend Migration Analysis

작성 시각: 2026-05-03 18:39:17 KST

## 현재 구조 요약

- 기존 프로젝트는 Next.js App Router 기반이며 UI와 API route가 같은 프로젝트에 있다.
- 현재 Next.js 프로젝트는 `frontend/`로 이동했다.
- 신규 Spring Boot 백엔드는 `backend/`에 구성한다.
- 루트는 모노레포 역할을 하며 `frontend/`, `backend/`, `docs/refact/`, `.codex/`, `skills/`, `AGENTS.md`를 중심으로 유지한다.

## 유지해야 할 인증/모델 정책

- 로컬 개발 테스트 LLM 실행은 Codex CLI 인증을 사용한다.
- `OPENAI_API_KEY`는 현재 시점에서 요구하지 않는다.
- 임시 개발 기본 모델은 응답속도 우선으로 `gpt-5.3-codex-spark`를 사용한다.
- Codex CLI 실행 시 빠른 응답을 위해 다음 설정을 기본값으로 둔다.
  - `model_reasoning_effort="low"`
  - `model_verbosity="low"`
  - `service_tier="fast"`
- Docker는 Codex CLI 로그인 세션 공유가 불명확하므로 Spring Boot 로컬 실행 경로에는 두지 않는다.

## 프론트엔드 호출면

- `frontend/app/page.tsx`
  - `GET /api/cases`: 케이스 프리셋 목록 로딩.
  - `POST /api/simulate`: NDJSON 스트리밍으로 진행 상태와 최종 결과 수신.
- 브라우저 호출은 `NEXT_PUBLIC_API_BASE_URL`을 통해 Spring Boot로 보내야 한다.
- React+Vite 전환 전까지 UI 컴포넌트와 타입은 기존 `frontend/src/lib/types.ts` 계약을 유지한다.

## 백엔드로 이동할 책임

- API route
  - `frontend/app/api/simulate/route.ts`
  - `frontend/app/api/cases/route.ts`
  - `frontend/app/api/metrics/route.ts`
  - `frontend/app/api/monitoring/*/route.ts`
- 시뮬레이션 오케스트레이션
  - `frontend/src/server/agent/simulation-service.ts`
  - `frontend/src/server/agent/execution-context.ts`
  - `frontend/src/server/agent/derived-results.ts`
- LLM Provider
  - `frontend/src/server/llm/client.ts`
  - `frontend/src/server/llm/model-registry.ts`
  - `frontend/src/server/llm/providers/codex-cli.ts`
  - `frontend/src/server/llm/providers/mock.ts`
  - `frontend/src/server/llm/providers/openai.ts`는 현재 비활성 정책으로 유지 또는 후순위 제거 대상.
- 라우팅/비용/복원력
  - `frontend/src/server/routing/request-router.ts`
  - `frontend/src/server/cost/cost-policy.ts`
  - `frontend/src/server/resilience/*`
- 가드레일
  - `frontend/src/server/guardrail/service.ts`
  - `frontend/src/guardrail/*`
  - `frontend/src/config/guardrail-thresholds.ts`
- 로깅/모니터링/큐
  - `frontend/src/server/logging/*`
  - `frontend/src/server/monitoring/prometheus.ts`
  - `frontend/src/server/queue/file-queue.ts`
  - `frontend/src/lib/monitoring/*`
- 워커/스크립트
  - `frontend/workers/*`
  - `frontend/scripts/*`
  - Spring Boot 이전 후 별도 JVM worker, scheduled job, 또는 CLI task로 재설계 필요.
- 데이터/프롬프트
  - `frontend/prompts/*`
  - `frontend/playground/inputs/cases/*`
  - `frontend/data/*.jsonl`
  - `frontend/db/migrations/*`

## API 계약

- `POST /api/simulate`
  - 요청: `SimulationRequest`
  - 응답: `SimulationResponse`
  - 스트리밍: `x-simulate-stream: ndjson`일 때 `SimulationProgressEvent`를 줄 단위 JSON으로 반환.
  - 주요 헤더: `x-request-id`, `x-trace-id`, `x-llm-model`, `x-llm-execution-mode`, `x-llm-selected-path`, `x-llm-stage-model-plan`
- `GET /api/cases`
  - 응답: `{ cases: CasePreset[] }`
- `GET /api/metrics`
  - Prometheus text format 유지.
- `GET /api/monitoring/metrics`, `/alerts`, `/critical-cases`, `/report`
  - 기존 dashboard/운영 문서 계약을 깨지 않도록 shape 유지.

## 1차 백엔드 구현 범위

- Spring Boot `backend/` 골격.
- `GET /api/cases`를 Spring Boot에서 제공.
- `POST /api/simulate`를 Spring Boot에서 제공.
- Codex CLI provider를 Java에서 실행.
- Codex 실패 시 개발 흐름이 멈추지 않도록 deterministic fallback을 제공하되, 기본 경로는 Codex CLI 호출이다.
- monitoring/metrics endpoint는 shape 보존용 stub로 시작하고, 로그/DB 기반 집계는 후속 마이그레이션으로 넘긴다.

## 주요 리스크

- 기존 TypeScript simulation pipeline은 다단계 schema/prompt/guardrail/logging coupling이 강하다.
- Java로 단번에 완전 이식하면 회귀 범위가 크므로 API 계약 우선, 이후 stage별 이식이 안전하다.
- Codex CLI는 로컬 로그인 상태와 네트워크 상태에 영향을 받는다.
- DB, worker, monitoring 집계는 현재 Spring Boot 1차 구현에서 완전 이전되지 않는다.
- 기존 `frontend/app/api/*` route는 한동안 fallback 경로로 남겨야 한다.
