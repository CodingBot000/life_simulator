# React + Vite Frontend Refactor and LLM Provider Mode Work Order

작성 시각: 2026-05-04 19:47:36 KST

## 목적

Next.js에서 React + Vite SPA로 전환된 `frontend/`를 현재 상태에 맞게 정리하고, 백엔드 LLM 실행 방식을 명시적으로 선택할 수 있게 만든다.

이 작업의 핵심은 두 가지다.

- 프론트엔드: Vite 브라우저 앱과 레거시 Node/worker/script 코드의 경계를 분리하고, `src/App.tsx`에 몰려 있는 API, hook, UI 책임을 단계적으로 나눈다.
- 백엔드: public GitHub 로컬 실행, 면접관 실행, AWS 배포를 모두 지원하도록 `codex`, `openai`, `mock` provider mode를 도입한다.

## 현재 상태 요약

- 루트 작업 디렉터리: `/Users/switch/Development/Web/life_simulator`
- 프론트엔드: `frontend/`
- 백엔드: `backend/`
- 현재 프론트 런타임:
  - React + Vite
  - `frontend/index.html`
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/styles/globals.css`
- 현재 프론트 API 호출:
  - `VITE_API_BASE_URL`, 기본값 `http://localhost:8080`
  - `GET /api/cases`
  - `POST /api/simulate`
  - streaming 요청 시 `x-simulate-stream: ndjson`
  - rate limit용 `x-session-id`
  - locale용 `x-ui-locale`
- 현재 `frontend/src/App.tsx`는 약 2,300라인이며 아래 책임을 모두 가진다.
  - API base URL 처리
  - browser session id 처리
  - `/api/cases` fetch
  - `/api/simulate` fetch
  - NDJSON progress stream parser
  - form state
  - preset state
  - progress state
  - result card UI 전체
- 현재 `frontend/tsconfig.json`은 `frontend/**/*.ts`, `frontend/**/*.tsx` 전체를 포함한다.
  - Vite 브라우저 앱과 legacy Node scripts/workers/server code가 같은 TS project에 묶여 있다.
  - `types`에 `node`와 `vite/client`가 같이 들어 있다.
- 현재 백엔드 LLM 실행은 Codex CLI 중심이다.
  - `backend/src/main/java/com/lifesimulator/backend/config/SimulatorProperties.java`
  - `backend/src/main/java/com/lifesimulator/backend/llm/CodexCliClient.java`
  - `backend/src/main/java/com/lifesimulator/backend/simulation/StageExecutionService.java`
  - `backend/src/main/resources/application.yml`
- 현재 `StageExecutionService`에는 Codex 전용 prompt 문구가 박혀 있다.
  - `Use Codex CLI subscription authentication only. Do not ask for OPENAI_API_KEY.`
- 현재 `MetricsController`는 provider를 `codex`로 고정 출력한다.
- AWS 배포 목표는 OpenAI API key 기반 실행이다.
- public GitHub 사용자는 다음 방식 중 하나로 구동할 수 있어야 한다.
  - Codex CLI 인증
  - OpenAI API key
  - key 없이 mock/demo mode

## 최종 목표

### Frontend 목표

- Vite 앱 전용 타입체크와 legacy Node 코드 타입체크를 분리한다.
- `src/App.tsx`를 얇은 orchestration component로 만든다.
- API 호출과 NDJSON stream parsing을 `src/lib/api/*`로 이동한다.
- case preset과 simulation submit 상태 전이를 hook으로 분리한다.
- progress, preset form, result cards를 `src/components/simulation/*`로 이동한다.
- 기존 화면 동작과 API request contract는 유지한다.
- `OPENAI_API_KEY`를 프론트에서 읽거나 노출하지 않는다.
- UI 문구는 백엔드 provider mode를 전제로 정확하게 유지한다.

### Backend 목표

- `SIMULATOR_LLM_PROVIDER=codex|openai|mock`를 도입한다.
- 로컬 기본값은 `codex`로 유지한다.
- AWS 배포는 `openai` provider를 사용하도록 설정 가능하게 한다.
- public repo 사용자는 secret 없이 `mock` provider로 smoke test할 수 있게 한다.
- `StageExecutionService`는 `CodexCliClient`가 아니라 provider-neutral LLM interface에 의존한다.
- Codex 전용 prompt 문구를 제거한다.
- metrics와 progress event의 provider/model 정보가 실제 활성 provider와 일치한다.
- API response shape, progress event shape, rate limit behavior는 유지한다.

## 비목표

- 로그인/사용자 인증 구현.
- 프론트에서 OpenAI API를 직접 호출.
- `OPENAI_API_KEY`를 `VITE_*` 환경변수로 노출.
- Spring Boot API response shape 변경.
- 시뮬레이션 domain schema 변경.
- UI redesign.
- React Router 도입.
- legacy `frontend/src/server/*`, `frontend/scripts/*`, `frontend/workers/*` 전체 삭제.
- AWS 배포 자동화 전체 구현. 이 문서에서는 provider 설정과 문서화까지만 포함한다.

## 반드시 보존할 계약

### Frontend API base URL

```ts
import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
```

### `/api/simulate` request headers

반드시 유지한다.

```http
Content-Type: application/json
x-simulate-stream: ndjson
x-session-id: <browser-local-session-id>
x-ui-locale: ko | en
```

### Browser storage keys

반드시 유지한다.

```ts
life-simulator-session-id
life-simulator.ui-locale
```

### NDJSON progress event types

반드시 유지한다.

- `request_started`
- `routing_resolved`
- `stage_started`
- `stage_completed`
- `error`
- `result`

최종 `result.response`를 `SimulationResponse`로 사용한다.

### Backend API endpoints

변경하지 않는다.

- `GET /api/cases`
- `POST /api/simulate`
- `GET /api/metrics`
- `GET /api/monitoring/metrics`
- `GET /api/monitoring/alerts`
- `GET /api/monitoring/critical-cases`
- `GET /api/monitoring/report`

## 권장 최종 구조

### Frontend

```text
frontend/
  index.html
  vite.config.ts
  tsconfig.base.json
  tsconfig.app.json
  tsconfig.legacy.json
  tsconfig.json
  src/
    main.tsx
    App.tsx
    hooks/
      use-case-presets.ts
      use-simulation-submit.ts
    lib/
      api/
        client.ts
        session.ts
        cases.ts
        simulation.ts
        simulation-stream.ts
      priorities.ts
      types.ts
    components/
      providers/
        ui-locale-provider.tsx
      simulation/
        simulation-page.tsx
        case-preset-panel.tsx
        simulation-form.tsx
        progress-stage-card.tsx
        loading-stage-strip.tsx
        result-panel.tsx
        routing-card.tsx
        state-context-card.tsx
        planner-card.tsx
        timeline-card.tsx
        risk-card.tsx
        reasoning-card.tsx
        advisor-card.tsx
        guardrail-card.tsx
        reflection-card.tsx
        shared.tsx
    styles/
      globals.css
```

### Backend

```text
backend/src/main/java/com/lifesimulator/backend/
  config/
    SimulatorProperties.java
  llm/
    LlmProviderMode.java
    LlmJsonClient.java
    CodexCliJsonClient.java
    OpenAiJsonClient.java
    MockJsonClient.java
    LlmClientConfig.java
  simulation/
    StageExecutionService.java
```

실제 파일명은 기존 naming style에 맞춰 조정해도 된다. 중요한 것은 `StageExecutionService`가 provider-specific client에 직접 의존하지 않는 것이다.

## Phase 1: TypeScript project 분리

### 목적

Vite 브라우저 앱과 legacy Node scripts/workers/server code가 같은 TypeScript project에 섞여 있는 문제를 해결한다.

### 작업

1. `frontend/tsconfig.base.json` 추가.
   - 공통 compiler options만 둔다.
   - `types`는 넣지 않는다.
   - `paths["@/*"] = ["./src/*"]` 유지.

2. `frontend/tsconfig.app.json` 추가.
   - `extends: "./tsconfig.base.json"`
   - browser app 전용.
   - `lib`: `dom`, `dom.iterable`, `esnext`
   - `types`: `vite/client`
   - include 후보:
     - `src/main.tsx`
     - `src/App.tsx`
     - `src/components/**/*.tsx`
     - `src/hooks/**/*.ts`
     - `src/lib/api/**/*.ts`
     - `src/lib/types.ts`
     - `src/lib/priorities.ts`

3. `frontend/tsconfig.legacy.json` 추가.
   - `extends: "./tsconfig.base.json"`
   - Node script/worker/legacy server code 전용.
   - `types`: `node`
   - include 후보:
     - `scripts/**/*.ts`
     - `workers/**/*.ts`
     - `src/server/**/*.ts`
     - `src/guardrail/**/*.ts`
     - `src/config/**/*.ts`
     - legacy Node에서 쓰는 `src/lib/**/*.ts`
   - 단, `src/lib/api/**`처럼 browser-only 코드가 생기면 legacy include에서 제외한다.

4. `frontend/tsconfig.json`은 solution/config aggregator로 바꾼다.
   - 선택지 A: references 사용.
   - 선택지 B: 기존 명령이 단순하게 유지되도록 app config로 유지하고 별도 legacy config를 둔다.
   - 추천은 아래 scripts와 같이 명확히 분리하는 방식이다.

5. `frontend/package.json` scripts 수정.

권장:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -p tsconfig.app.json --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "start": "vite preview --host 0.0.0.0",
    "typecheck": "npm run typecheck:app && npm run typecheck:legacy",
    "typecheck:app": "tsc -p tsconfig.app.json --noEmit",
    "typecheck:legacy": "tsc -p tsconfig.legacy.json --noEmit"
  }
}
```

### 주의

- app tsconfig에는 `node` types를 넣지 않는다.
- legacy tsconfig에는 `vite/client` types를 넣지 않는다.
- 이 단계에서 legacy Node 코드를 삭제하지 않는다.

### 검증

```sh
cd frontend
npm run typecheck:app
npm run typecheck:legacy
npm run typecheck
npm run build
```

## Phase 2: API 계층 분리

### 목적

`src/App.tsx`에서 API base URL, session id, JSON parsing, NDJSON parsing을 분리한다. 동시에 JSON error handling 중복과 brittle parsing을 줄인다.

### 추가 파일

- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/api/session.ts`
- `frontend/src/lib/api/cases.ts`
- `frontend/src/lib/api/simulation.ts`
- `frontend/src/lib/api/simulation-stream.ts`

### `client.ts` 책임

- `VITE_API_BASE_URL` 처리.
- trailing slash 제거.
- `apiUrl(path: string)` 제공.
- safe JSON parsing helper 제공.
- non-JSON 또는 empty response body를 명확한 에러로 처리.
- backend error shape에서 `error`, `error_code`, `trace_id`, `rate_limit_scope` 추출.

권장 shape:

```ts
export class ApiError extends Error {
  status: number;
  code: string | null;
  traceId: string | null;
}

export async function readJsonResponse<T>(response: Response): Promise<T>;
export function apiUrl(path: string): string;
```

### `session.ts` 책임

- `life-simulator-session-id` key 유지.
- `getSimulatorSessionId()` 이동.
- storage 접근 실패 시 fallback id 반환.

### `cases.ts` 책임

- `GET /api/cases` 호출.
- `CasePreset[]` 반환.
- `AbortSignal` 지원.

권장:

```ts
export async function fetchCasePresets(signal?: AbortSignal): Promise<CasePreset[]>;
```

### `simulation-stream.ts` 책임

- `readSimulationProgressStream` 이동.
- line buffer 처리 유지.
- JSON parse error 발생 시 어떤 line에서 실패했는지 최소한의 메시지를 제공.
- `SimulationProgressEvent` 타입 사용.

### `simulation.ts` 책임

- `POST /api/simulate` 호출.
- stream/non-stream response 모두 처리.
- 아래 headers 유지.

```http
Content-Type: application/json
x-simulate-stream: ndjson
x-session-id: <id>
x-ui-locale: ko | en
```

권장:

```ts
export async function runSimulation(
  request: SimulationRequest,
  params: {
    locale: PriorityLocale;
    signal?: AbortSignal;
    onProgressEvent?: (event: SimulationProgressEvent) => void;
  },
): Promise<SimulationResponse>;
```

### `App.tsx` 변경

- `API_BASE_URL`, `apiUrl`, `getSimulatorSessionId`, `readSimulationProgressStream` 제거.
- `fetch(apiUrl(...))` 직접 호출 제거.
- API 호출은 `fetchCasePresets`, `runSimulation`만 사용.

### 검증

```sh
cd frontend
npm run typecheck:app
npm run build
```

수동 smoke:

- backend 실행.
- Vite dev server 실행.
- `/api/cases` 프리셋 목록 표시 확인.
- `/api/simulate` 실행.
- progress strip stage update 확인.
- rate limit error가 UI에서 parser error로 깨지지 않는지 확인.

## Phase 3: Hook 분리

### 목적

`App.tsx`의 상태 전이를 custom hook으로 분리한다. UI component는 상태를 보여주고 event callback만 호출하게 만든다.

### 추가 파일

- `frontend/src/hooks/use-case-presets.ts`
- `frontend/src/hooks/use-simulation-submit.ts`

### `use-case-presets.ts` 책임

상태:

- `presets`
- `selectedCategory`
- `selectedPresetId`
- `selectedPreset`
- `presetCategories`
- `visiblePresets`
- `isPresetLoading`
- `presetError`

행동:

- 초기 preset 로드.
- category 변경.
- preset 적용.
- selected preset 다시 채우기.

기존 helper 이동 후보:

- `buildPrioritySlots`
- `buildFormState`
- `getLocalizedText`
- `listPresetCategories`

주의:

- `buildFormState`는 form hook과 공유될 수 있으므로 위치는 `src/lib/simulation/form.ts`로 둘 수도 있다.
- locale 변경 시 category labels가 갱신되어야 한다.
- preset 로드 실패와 abort를 구분한다.

### `use-simulation-submit.ts` 책임

상태:

- `result`
- `error`
- `isLoading`
- `progress`

행동:

- `submit(form, locale)`
- `resetResult()`
- `resetProgress()`

내부 동작:

- `buildPayload(form)` 사용.
- `runSimulation(...)` 사용.
- progress event는 `applyProgressEvent`로 누적.
- 새 submit 시작 시 이전 submit AbortController가 있으면 abort할지 결정한다.
  - 추천: form submit은 버튼 disabled로 중복 submit을 막고, component unmount 시 abort한다.

이동 후보:

- `createInitialProgressState`
- `applyProgressEvent`
- `getCurrentStage`
- `hasProgressHistory`
- `isProgressFinished`
- `getProgressHeadline`

이 함수들은 `src/lib/simulation/progress.ts` 또는 `src/hooks/use-simulation-submit.ts`에 둔다.

### `App.tsx` 변경

- `App.tsx`는 provider와 high-level page 조립만 담당한다.
- form state는 App에 남겨도 된다. 단, submit/result/progress state는 hook으로 분리한다.
- 단계적으로 줄인다. 한 번에 모든 UI를 이동하지 않아도 된다.

### 검증

```sh
cd frontend
npm run typecheck:app
npm run build
```

수동 smoke:

- preset 선택.
- category 변경.
- form 수정 시 이전 result/error clear.
- submit 성공.
- submit 실패.

## Phase 4: UI 컴포넌트 분리

### 목적

`src/App.tsx`에 들어 있는 화면 조각을 `src/components/simulation/*`로 이동한다. 이 단계는 behavior 변경 없이 mechanical extraction에 가깝게 진행한다.

### 이동 권장 순서

1. Shared primitives
   - `InputField`
   - `ScenarioBlock`
   - formatting helpers 중 UI 전용 helper
   - 파일 후보: `src/components/simulation/shared.tsx`

2. Progress UI
   - `ProgressStageCard`
   - `LoadingStageStrip`
   - 파일 후보:
     - `progress-stage-card.tsx`
     - `loading-stage-strip.tsx`

3. Result cards
   - `RoutingCard`
   - `StateContextCard`
   - `PlannerCard`
   - `TimelineCard`
   - `RiskCard`
   - `ReasoningLensCard`
   - `ReasoningCard`
   - `AdvisorCard`
   - `GuardrailCard`
   - `ReflectionCard`
   - 파일 후보는 card별 1파일 또는 관련 card 묶음 1파일.

4. Form UI
   - case preset panel.
   - user profile form.
   - decision form.
   - submit footer.
   - 파일 후보:
     - `case-preset-panel.tsx`
     - `simulation-form.tsx`

5. Page composition
   - `SimulationPage`
   - `App`는 `return <SimulationPage />` 수준까지 줄일 수 있다.

### 주의

- className, text, data shape를 동시에 바꾸지 않는다.
- 대규모 디자인 변경 금지.
- card props는 기존 domain type을 재사용한다.
- 컴포넌트 파일이 500-800라인을 넘기면 더 나눈다.

### 검증

```sh
cd frontend
npm run typecheck:app
npm run build
```

가능하면 browser smoke:

- `http://localhost:5173`
- mobile width에서 text overflow 여부 확인.
- result cards가 기존 순서로 표시되는지 확인.

## Phase 5: Backend LLM provider mode 도입

### 목적

면접관/public GitHub 사용자/AWS 배포자가 실행 방식을 명확히 선택할 수 있게 한다. 이 작업은 단순 UI copy 수정이 아니라 backend provider architecture 정리다.

### Provider mode 정의

환경변수:

```env
SIMULATOR_LLM_PROVIDER=codex
# allowed: codex | openai | mock
```

기본값:

- local default: `codex`
- AWS/prod recommended: `openai`
- CI/public smoke recommended: `mock`

### 환경변수 권장안

#### Codex mode

```env
SIMULATOR_LLM_PROVIDER=codex
SIMULATOR_CODEX_COMMAND=codex
SIMULATOR_CODEX_MODEL=gpt-5.3-codex-spark
SIMULATOR_CODEX_TIMEOUT=75s
SIMULATOR_CODEX_FALLBACK_ON_ERROR=true
```

#### OpenAI API mode

```env
SIMULATOR_LLM_PROVIDER=openai
OPENAI_API_KEY=
SIMULATOR_OPENAI_MODEL=gpt-5.3
SIMULATOR_OPENAI_TIMEOUT=75s
SIMULATOR_OPENAI_FALLBACK_ON_ERROR=true
```

구현 시점에는 공식 OpenAI Java SDK/API 문서를 확인하고 현재 권장 client 방식을 사용한다. API key는 backend runtime secret으로만 주입한다. 프론트 `VITE_*` env로 만들지 않는다.

#### Mock mode

```env
SIMULATOR_LLM_PROVIDER=mock
SIMULATOR_MOCK_MODEL=spring-mock
```

Mock mode는 API key 없이 `/api/cases`, `/api/simulate`, progress stream, result rendering을 smoke test할 수 있어야 한다. public GitHub 면접관이 secret 없이 구동 확인할 수 있는 경로다.

### Backend configuration 변경

대상:

- `backend/src/main/java/com/lifesimulator/backend/config/SimulatorProperties.java`
- `backend/src/main/resources/application.yml`

작업:

1. `SimulatorProperties`에 provider enum 추가.

```java
public enum LlmProvider {
  CODEX,
  OPENAI,
  MOCK
}
```

2. root 또는 nested config에 provider field 추가.

```java
private LlmProvider llmProvider = LlmProvider.CODEX;
```

Spring relaxed binding으로 `SIMULATOR_LLM_PROVIDER=codex`가 bind 되도록 `application.yml`에 연결한다.

3. 기존 `codex` config는 유지한다.
   - backward compatibility를 위해 `SIMULATOR_CODEX_ENABLED`는 당장 삭제하지 않는다.
   - 단, provider selection은 `SIMULATOR_LLM_PROVIDER`가 우선한다.

4. `openai` config 추가.
   - model
   - timeout
   - fallbackOnError
   - apiKey env name 또는 apiKey value
   - 가능하면 `OPENAI_API_KEY`를 직접 읽도록 둔다.

### Backend LLM client interface

추가 후보:

- `backend/src/main/java/com/lifesimulator/backend/llm/LlmJsonClient.java`
- `backend/src/main/java/com/lifesimulator/backend/llm/LlmClientConfig.java`

권장 interface:

```java
public interface LlmJsonClient {
  JsonNode completeJson(String prompt, JsonNode schema);
  String providerName();
  String modelName();
  boolean fallbackOnError();
}
```

주의:

- `fallbackOnError()`를 client에 둘지 properties lookup으로 둘지는 구현자가 판단해도 된다.
- 중요한 것은 `StageExecutionService`가 provider별 client class를 직접 알지 않는 것이다.

### Codex client adapter

현재 `CodexCliClient`는 재사용한다.

선택지:

- 기존 `CodexCliClient`가 `LlmJsonClient`를 implement.
- 또는 `CodexCliJsonClient` wrapper를 추가하고 내부에서 `CodexCliClient` 사용.

기존 `CodexCliClientTests`는 유지한다.

### OpenAI client

추가 후보:

- `backend/src/main/java/com/lifesimulator/backend/llm/OpenAiJsonClient.java`

요구사항:

- `SIMULATOR_LLM_PROVIDER=openai`일 때만 사용한다.
- `OPENAI_API_KEY`가 없으면 명확하게 실패한다.
  - 권장: app startup 또는 첫 요청에서 `OpenAI API key is required when SIMULATOR_LLM_PROVIDER=openai.` 같은 메시지.
- prompt와 schema를 받아 JSON object를 반환한다.
- 응답이 JSON object가 아니면 명확한 exception을 던진다.
- timeout 적용.
- AWS에서는 key를 env 또는 secret manager로 주입한다.

주의:

- OpenAI dependency는 backend에만 추가한다.
- frontend dependency나 Vite env에 OpenAI key 관련 항목을 추가하지 않는다.
- 구현 시점에 공식 OpenAI Java SDK/API 문서를 확인한다.

### Mock client

추가 후보:

- `backend/src/main/java/com/lifesimulator/backend/llm/MockJsonClient.java`

요구사항:

- API key 없이 동작.
- 가능한 경우 `schema` 또는 현재 fallback response를 활용해 deterministic JSON을 반환한다.
- 최소 목표는 `/api/simulate`가 progress stream과 최종 result를 생성해 UI smoke test가 가능하게 하는 것이다.

구현 방식 후보:

- 후보 A: `StageExecutionService`의 기존 fallback JSON을 mock output으로 사용.
- 후보 B: stage별 간단한 deterministic output을 생성.

추천은 후보 A다. schema/output shape drift 위험이 작다.

### Provider selection

추가 후보:

- `backend/src/main/java/com/lifesimulator/backend/llm/LlmClientConfig.java`

작업:

- `@Configuration`에서 `SimulatorProperties`를 보고 active `LlmJsonClient` bean 생성.
- provider가 `codex`면 Codex client.
- provider가 `openai`면 OpenAI client.
- provider가 `mock`이면 Mock client.
- 잘못된 provider 값은 Spring binding 또는 validation에서 명확히 실패.

### StageExecutionService 변경

대상:

- `backend/src/main/java/com/lifesimulator/backend/simulation/StageExecutionService.java`

작업:

- `CodexCliClient` 직접 의존 제거.
- `LlmJsonClient` 의존.
- Codex 전용 prompt line 제거.

현재 문구 제거:

```text
Use Codex CLI subscription authentication only. Do not ask for OPENAI_API_KEY.
```

대체 후보:

```text
Return exactly one JSON object that matches the requested stage schema.
```

- `stageEvent`의 model은 `llmClient.modelName()` 사용.
- provider name이 필요하면 event에 `provider`를 추가할지 검토한다.
  - 현재 frontend type에는 provider field가 없으므로, 추가하면 optional이어야 한다.
  - API contract 변경을 피하려면 model string만 우선 정확히 유지한다.
- fallback reason은 provider-specific but user-safe한 메시지로 제한한다.
  - OpenAI key 전체나 secret fragment를 노출하지 않는다.

### MetricsController 변경

대상:

- `backend/src/main/java/com/lifesimulator/backend/api/MetricsController.java`

작업:

- provider=`codex` hardcode 제거.
- active provider/model 출력.

예:

```text
life_simulator_backend_info{provider="openai",model="gpt-5.3"} 1
```

### UI copy 변경

대상:

- `frontend/src/App.tsx`
- 컴포넌트 분리 후라면 `src/components/simulation/simulation-form.tsx` 등.

현재 stale copy:

```text
OpenAI API Key가 없거나 응답이 비정상이면 서버에서 명확한 에러를 반환합니다.
```

권장 copy:

```text
모델 접근, 요청 제한, 실행 오류는 백엔드 응답으로 안내됩니다.
```

또는 provider mode를 살짝 노출하려면:

```text
백엔드의 모델 실행 모드에 따라 시뮬레이션이 수행되며, 오류는 응답 메시지로 안내됩니다.
```

주의:

- 프론트 화면에서 특정 provider를 강하게 말하지 않는다.
- 프론트는 `OPENAI_API_KEY` 존재 여부를 알 수 없고 알아서도 안 된다.

### Env examples and docs

대상:

- `backend/README.md`
- `README.md`
- `frontend/README.md`
- `frontend/.env.example`
- `frontend/.env.local.example`
- 필요하면 신규 `backend/.env.example`

권장 문서 구성:

1. Frontend env:

```env
VITE_API_BASE_URL=http://localhost:8080
```

2. Backend local Codex mode:

```env
SIMULATOR_LLM_PROVIDER=codex
SIMULATOR_CODEX_MODEL=gpt-5.3-codex-spark
```

3. Backend OpenAI API mode:

```env
SIMULATOR_LLM_PROVIDER=openai
OPENAI_API_KEY=...
SIMULATOR_OPENAI_MODEL=gpt-5.3
```

4. Backend mock mode:

```env
SIMULATOR_LLM_PROVIDER=mock
```

5. AWS deployment note:
   - `SIMULATOR_LLM_PROVIDER=openai`
   - `OPENAI_API_KEY`는 AWS Secrets Manager, SSM Parameter Store, ECS secret, Elastic Beanstalk env 등으로 주입.
   - 프론트 빌드에는 OpenAI key를 넣지 않는다.

### Backend tests

추가/수정 후보:

- `LlmClientConfigTests`
  - provider `codex` 선택.
  - provider `openai` 선택.
  - provider `mock` 선택.
  - invalid provider fail.
- `OpenAiJsonClientTests`
  - API key missing failure.
  - JSON parse failure.
  - timeout/config binding.
  - 실제 API 호출 없이 mocked HTTP/client 사용.
- `StageExecutionServiceTests`
  - provider-neutral `LlmJsonClient` mock으로 stage 실행.
  - fallbackOnError true/false behavior.
  - prompt에 Codex/OpenAI auth-specific 문구가 없는지.
- 기존 `CodexCliClientTests` 유지.
- `MetricsControllerTests`
  - provider/model label이 active config와 일치.

### 검증

```sh
cd backend
./mvnw test
```

수동 smoke:

```sh
# mock mode
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run

# codex mode
SIMULATOR_LLM_PROVIDER=codex ./mvnw spring-boot:run

# openai mode
SIMULATOR_LLM_PROVIDER=openai OPENAI_API_KEY=... ./mvnw spring-boot:run
```

각 mode에서 확인:

- `GET /api/cases`
- `POST /api/simulate`
- `x-simulate-stream: ndjson`
- progress event 표시.
- final result 표시.
- `/api/metrics` provider/model label 확인.

## Phase 6: Documentation and public GitHub run path 정리

### 목적

면접관이 public GitHub를 받아 실행할 때 선택지가 명확해야 한다.

### README에 포함할 실행 모드

#### 빠른 smoke test: mock

```sh
cd backend
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run

cd ../frontend
npm install
npm run dev
```

#### 로컬 Codex CLI mode

전제:

- Codex CLI 설치.
- 로컬 Codex subscription auth 완료.

```sh
cd backend
SIMULATOR_LLM_PROVIDER=codex ./mvnw spring-boot:run
```

#### OpenAI API mode

전제:

- `OPENAI_API_KEY` 준비.

```sh
cd backend
SIMULATOR_LLM_PROVIDER=openai OPENAI_API_KEY=... ./mvnw spring-boot:run
```

#### Frontend

```sh
cd frontend
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

### 문서 주의사항

- OpenAI API key를 프론트 `.env`에 넣지 말라고 명시한다.
- `frontend/.env.example`은 가능하면 Vite 공개 env만 남긴다.
- legacy scripts용 env가 필요하다면 `legacy` 섹션으로 분리한다.
- AWS는 `openai` provider 권장이라고 명시한다.

## Phase 7: End-to-end validation checklist

### 필수 자동 검증

```sh
cd frontend
npm run typecheck:app
npm run typecheck:legacy
npm run typecheck
npm run build

cd ../backend
./mvnw test
```

### 권장 수동 검증

1. backend mock mode 실행.
2. frontend Vite dev server 실행.
3. `http://localhost:5173` 접속.
4. case preset 목록 로딩 확인.
5. language toggle 확인.
6. simulation submit.
7. progress stage strip 업데이트 확인.
8. final result cards 표시 확인.
9. rate limit error 표시 확인.
10. `/api/metrics` provider/model 확인.

### Provider별 검증

#### Mock

- secret 없이 실행.
- UI smoke test 통과.

#### Codex

- Codex CLI 인증이 된 로컬에서 실행.
- prompt에 OpenAI key 요구 문구가 없는지 확인.
- timeout/fallback behavior 확인.

#### OpenAI

- `OPENAI_API_KEY` 없이 실행할 때 명확한 에러.
- `OPENAI_API_KEY`가 있을 때 simulation 성공.
- secret이 로그, response, UI에 노출되지 않는지 확인.

## 권장 커밋 단위

1. `refactor(frontend): split vite and legacy tsconfigs`
   - `tsconfig.base.json`
   - `tsconfig.app.json`
   - `tsconfig.legacy.json`
   - package scripts

2. `refactor(frontend): extract api client and simulation stream`
   - `src/lib/api/*`
   - `App.tsx` API 호출 제거

3. `refactor(frontend): extract simulation hooks`
   - `use-case-presets`
   - `use-simulation-submit`
   - progress helpers

4. `refactor(frontend): split simulation components`
   - `src/components/simulation/*`
   - `App.tsx` 축소

5. `refactor(backend): add llm provider mode`
   - provider config
   - provider-neutral interface
   - codex adapter
   - mock provider
   - openai provider
   - `StageExecutionService`
   - metrics update

6. `docs: document frontend and backend run modes`
   - root README
   - frontend README
   - backend README
   - env examples

## 리스크와 완화책

### App.tsx split 중 UI regression

완화:

- API/hook/UI extraction을 별도 commit으로 나눈다.
- className/text 변경을 최소화한다.
- 각 단계마다 `npm run build`.

### tsconfig split 후 legacy script typecheck failure

완화:

- app build는 app tsconfig만 사용한다.
- legacy typecheck는 별도 script로 유지한다.
- legacy code가 browser-only `src/lib/api/*`를 import하지 않도록 경계 유지.

### OpenAI provider implementation drift

완화:

- 구현 시점에 공식 OpenAI Java SDK/API 문서를 확인한다.
- OpenAI client는 backend 내부 adapter로 격리한다.
- provider interface를 domain-neutral하게 유지한다.

### Secret exposure

완화:

- `OPENAI_API_KEY`는 backend env only.
- `VITE_*`로 OpenAI key를 만들지 않는다.
- error message/log에 key 값을 포함하지 않는다.
- public `.env.example`에는 blank placeholder만 둔다.

### AWS와 local default 차이

완화:

- local default는 `codex`.
- AWS docs는 `SIMULATOR_LLM_PROVIDER=openai`를 명시.
- mock mode를 public smoke path로 제공.

## 완료 기준

- `frontend/src/App.tsx`가 orchestration 중심으로 줄어든다.
- API client와 stream parser가 `src/lib/api/*`에 있다.
- case preset과 submit/progress state가 hooks에 있다.
- simulation UI card들이 `src/components/simulation/*`에 있다.
- app tsconfig와 legacy tsconfig가 분리된다.
- frontend build는 app tsconfig 기준으로 통과한다.
- backend에서 `SIMULATOR_LLM_PROVIDER=codex|openai|mock` 선택이 가능하다.
- provider-specific secret이 frontend로 노출되지 않는다.
- `StageExecutionService` prompt에서 Codex/OpenAI auth-specific 문구가 제거된다.
- `/api/metrics`의 provider/model label이 실제 active provider와 일치한다.
- README가 mock, codex, openai 실행 방식을 모두 설명한다.
- 필수 검증 명령이 통과한다.
