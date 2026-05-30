# Legacy TypeScript Server Pipeline Removal Work Order

작성 시각: 2026-05-04 21:36:12 KST

## 목적

React + Vite frontend와 Spring Boot backend 전환 이후 `frontend/` 안에 남아 있는 legacy TypeScript server pipeline을 제거한다.

핵심 기준은 다음이다.

- `frontend/`는 브라우저 React + Vite 앱과 frontend-only API client만 가진다.
- 실제 server/runtime API는 `backend/` Spring Boot가 담당한다.
- 로컬 테스트와 remote 배포 후 테스트는 Spring Boot backend API와 Vite frontend 기준으로 통과해야 한다.
- 삭제 후 `frontend/src/server`나 legacy worker/script 때문에 `frontend`가 server처럼 보이지 않아야 한다.

## 현재 기준 상태

- 기준 커밋: `c275997 refactor: migrate frontend to vite and add llm providers`
- 브랜치: `main`
- 원격: `origin/main` push 완료
- 남아 있는 문서성 변경:
  - `AGENTS.md`
  - `README.md`
  - `backend/README.md`
  - `frontend/README.md`
  - `frontend/playground/README.md`
  - `skills/planner/SKILL.md`
  - `skills/tester/SKILL.md`
  - `docs/refact/` ignored

이 작업에서 `docs/refact` 문서는 커밋 대상이 아니다. 문서성 파일 커밋 여부는 사용자가 별도로 지시하지 않으면 보류한다.

## 판단

`frontend/src/server/`는 Next.js 잔재는 아니다. `next/server`, `NextRequest`, `NextResponse`, App Router route handler는 없다.

하지만 현재 구조에서는 legacy TypeScript server pipeline 잔재다. Spring Boot backend가 이미 다음 역할을 담당한다.

| legacy frontend path | current owner |
| --- | --- |
| `frontend/src/server/agent/*` | `backend/src/main/java/com/lifesimulator/backend/simulation/*` |
| `frontend/src/server/llm/*` | `backend/src/main/java/com/lifesimulator/backend/llm/*` |
| `frontend/src/server/routing/*` | `backend/src/main/java/com/lifesimulator/backend/routing/*` |
| `frontend/src/server/guardrail/*` | `backend/src/main/java/com/lifesimulator/backend/guardrail/*` |
| `frontend/src/server/cases/*` | `backend/src/main/java/com/lifesimulator/backend/cases/*` |
| `frontend/src/server/logging/*` | `backend/src/main/java/com/lifesimulator/backend/logging/*` |
| `frontend/src/server/monitoring/*` | `backend/src/main/java/com/lifesimulator/backend/monitoring/*` |
| `frontend/src/server/drift/*`, `frontend/workers/*` | `backend/src/main/java/com/lifesimulator/backend/worker/*` |

## 비목표

- Spring Boot backend 기능 삭제.
- `frontend/playground/inputs/cases` 삭제.
- backend prompt/resource 삭제.
- remote 배포 자동화 전체 구현.
- OpenAI/Codex provider 정책 변경.
- React UI redesign.
- docs/refact 문서 커밋.

## 반드시 유지할 것

- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/**`
- `frontend/src/hooks/**`
- `frontend/src/lib/api/**`
- `frontend/src/lib/simulation/**`
- `frontend/src/lib/priorities.ts`
- `frontend/src/lib/types.ts`
- `frontend/src/lib/output-locale.ts` if imported by current app code
- `frontend/src/styles/globals.css`
- `frontend/playground/inputs/cases/**`
- `frontend/scripts/run-simulate.ts`
- `frontend/scripts/seed-inputs.json`
- `backend/**`

`run-simulate.ts`는 legacy server pipeline이 아니라 Spring Boot `/api/simulate` endpoint smoke script이므로 유지한다.

## 삭제 후보

### 1. 확정 삭제

- `frontend/src/server/**`
- `frontend/src/server/.DS_Store`
- `frontend/workers/**`
- `frontend/tsconfig.legacy.json`

### 2. legacy server pipeline에 묶인 frontend lib

아래 파일들은 현재 Vite app 타입체크 대상이 아니고 legacy server pipeline에서만 의미가 있다. 삭제 전 `rg`로 남은 import가 없는지 확인하고 함께 제거한다.

- `frontend/src/lib/agent.ts`
- `frontend/src/lib/openai.ts`
- `frontend/src/lib/prompts.ts`
- `frontend/src/lib/guardrail-eval.ts`
- `frontend/src/lib/logger/**`
- `frontend/src/lib/monitoring/**`

주의: `frontend/src/lib/types.ts`, `frontend/src/lib/priorities.ts`, `frontend/src/lib/api/**`, `frontend/src/lib/simulation/**`는 유지한다.

### 3. server pipeline script

아래는 `frontend/src/server` 또는 legacy logger/monitoring lib에 직접 묶여 있다. 삭제 또는 package script 제거 대상이다.

- `frontend/scripts/resolve_playground_routing.ts`
- `frontend/scripts/resolve_playground_guardrail.ts`
- `frontend/scripts/resolve_playground_reflection.ts`
- `frontend/scripts/eval_guardrail.ts`
- `frontend/scripts/eval_guardrail_calibration.ts`
- `frontend/scripts/eval_guardrail_thresholds.ts`
- `frontend/scripts/optimize_guardrail_thresholds.ts`
- `frontend/scripts/relabel_guardrail_datasets.ts`
- `frontend/scripts/re_eval_online_anomalies.ts`
- `frontend/scripts/seed-anomalies.ts`
- `frontend/scripts/seed-reeval.ts`
- `frontend/scripts/run-reeval.ts`
- `frontend/scripts/verify-monitoring.ts`
- `frontend/scripts/analyze-reeval-mismatches.ts`
- `frontend/scripts/compare-guardrail-adjustment.ts`
- `frontend/scripts/analyze-review-overtrigger.ts`
- `frontend/scripts/analyze-baseline-v4.ts`
- `frontend/scripts/analyze-baseline-v5.ts`
- `frontend/scripts/analyze-baseline-v6.ts`
- `frontend/scripts/analyze-baseline-v7.ts`
- `frontend/scripts/analyze-baseline-v8.ts`
- `frontend/scripts/compute_guardrail_result.ts`
- `frontend/scripts/monitoringScriptUtils.ts`

유지:

- `frontend/scripts/run-simulate.ts`
- `frontend/scripts/seed-inputs.json`

### 4. legacy playground runner

`frontend/playground/inputs/cases/**`는 유지한다. backend가 `/api/cases`에서 이 데이터를 읽는다.

아래 shell runner는 old TS/prompt pipeline 실행기이므로 삭제 후보로 본다.

- `frontend/playground/scripts/**`

삭제 후 `frontend/playground/README.md`는 stale reference가 남을 수 있다. 문서 커밋 정책 때문에 본 작업 커밋에는 포함하지 않거나, 사용자가 허용하면 별도 docs commit으로 처리한다.

## package.json 정리

### scripts

삭제:

- `typecheck:legacy`
- `worker:log`
- `worker:drift`
- `worker:eval`
- `eval:guardrail`
- `eval:guardrail-calibration`
- `eval:guardrail-thresholds`
- `relabel:guardrail-datasets`
- `optimize:guardrail`
- `re-eval:online-anomalies`
- `seed:anomalies`
- `seed:reeval`
- `run:reeval`
- `verify:monitoring`
- `analyze:reeval`
- `compare:guardrail-adjustment`
- `analyze:review-overtrigger`
- `analyze:baseline-v4`
- `analyze:baseline-v5`
- `analyze:baseline-v6`
- `analyze:baseline-v7`
- `analyze:baseline-v8`

유지:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc -p tsconfig.app.json --noEmit && vite build",
  "preview": "vite preview --host 0.0.0.0",
  "start": "vite preview --host 0.0.0.0",
  "typecheck": "npm run typecheck:app",
  "typecheck:app": "tsc -p tsconfig.app.json --noEmit",
  "run:simulate": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/run-simulate.ts"
}
```

### dependencies

삭제 후보:

- `ajv`
- `openai`
- `pg`
- `prom-client`

삭제 후보 dev dependency:

- `@types/pg`

보수적으로 유지:

- `@types/node`

이유: `run-simulate.ts`와 Vite config 등 Node 실행 파일이 아직 남아 있다. 나중에 scripts를 완전히 없애면 별도 제거를 검토한다.

권장 명령:

```sh
cd frontend
npm uninstall ajv openai pg prom-client @types/pg
```

## tsconfig 정리

- `frontend/tsconfig.legacy.json` 삭제.
- `frontend/tsconfig.json`은 app reference만 남기거나 단순 app config aggregator로 유지.

권장:

```json
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    }
  ]
}
```

`frontend/tsconfig.app.json`은 browser app 대상만 계속 포함한다.

## 작업 순서

### Phase 0. Preflight

1. 현재 브랜치와 원격 동기화 확인.

```sh
git status --short --branch --untracked-files=all
git log --oneline --decorate --max-count=3
```

2. 문서성 변경이 이미 남아 있음을 확인하고 커밋 대상에서 제외한다.

```sh
git status --ignored --short docs/refact
```

3. 삭제 전 import 상태를 확인한다.

```sh
rg -n "src/server|@/lib/(agent|openai|prompts|guardrail-eval|logger|monitoring)" frontend --glob '!node_modules/**' --glob '!dist/**'
```

### Phase 1. 삭제

삭제는 `rm -rf`보다 `git rm`을 우선 사용한다.

```sh
git rm -r frontend/src/server
git rm -r frontend/workers
git rm frontend/tsconfig.legacy.json
git rm frontend/src/lib/agent.ts frontend/src/lib/openai.ts frontend/src/lib/prompts.ts frontend/src/lib/guardrail-eval.ts
git rm -r frontend/src/lib/logger frontend/src/lib/monitoring
git rm frontend/scripts/resolve_playground_routing.ts frontend/scripts/resolve_playground_guardrail.ts frontend/scripts/resolve_playground_reflection.ts
git rm frontend/scripts/eval_guardrail.ts frontend/scripts/eval_guardrail_calibration.ts frontend/scripts/eval_guardrail_thresholds.ts
git rm frontend/scripts/optimize_guardrail_thresholds.ts frontend/scripts/relabel_guardrail_datasets.ts frontend/scripts/re_eval_online_anomalies.ts
git rm frontend/scripts/seed-anomalies.ts frontend/scripts/seed-reeval.ts frontend/scripts/run-reeval.ts frontend/scripts/verify-monitoring.ts
git rm frontend/scripts/analyze-reeval-mismatches.ts frontend/scripts/compare-guardrail-adjustment.ts frontend/scripts/analyze-review-overtrigger.ts
git rm frontend/scripts/analyze-baseline-v4.ts frontend/scripts/analyze-baseline-v5.ts frontend/scripts/analyze-baseline-v6.ts frontend/scripts/analyze-baseline-v7.ts frontend/scripts/analyze-baseline-v8.ts
git rm frontend/scripts/compute_guardrail_result.ts frontend/scripts/monitoringScriptUtils.ts
git rm -r frontend/playground/scripts
```

삭제 후 남겨야 하는 script:

```sh
rg --files frontend/scripts
```

기대값:

- `frontend/scripts/run-simulate.ts`
- `frontend/scripts/seed-inputs.json`

### Phase 2. package/tsconfig 수정

1. `frontend/package.json` scripts 정리.
2. legacy dependency 제거.

```sh
cd frontend
npm uninstall ajv openai pg prom-client @types/pg
```

3. `frontend/tsconfig.json` references에서 `tsconfig.legacy.json` 제거.
4. `frontend/README.md`, `AGENTS.md`, `skills/*` 등에 stale reference가 남는지 확인한다. 단, 문서 커밋 정책 때문에 본 코드 커밋에 포함할지 여부는 사용자의 별도 지시에 따른다.

### Phase 3. 잔재 검색

아래 명령이 코드/설정 파일에서 결과를 내면 안 된다. 문서 파일은 별도 판단한다.

```sh
rg -n "frontend/src/server|src/server|typecheck:legacy|worker:log|worker:drift|worker:eval|eval:guardrail|verify:monitoring" frontend package.json --glob '!node_modules/**' --glob '!dist/**'
rg -n "\"(ajv|openai|pg|prom-client)\"" frontend/package.json frontend/package-lock.json
```

frontend code 기준으로도 확인한다.

```sh
rg -n "from \"(ajv|openai|pg|prom-client)|from '(ajv|openai|pg|prom-client)|src/server|@/lib/(agent|openai|prompts|guardrail-eval|logger|monitoring)" frontend/src frontend/scripts --glob '!node_modules/**'
```

## 자동 검증

### Frontend

```sh
cd frontend
npm run typecheck
npm run build
```

기대:

- `typecheck`는 app-only typecheck로 통과.
- `build`는 `tsconfig.app.json`과 `vite build` 통과.

빌드 후 생성된 `frontend/dist/`는 검증 산출물이므로 커밋하지 않는다. 필요하면 검증 후 삭제한다.

```sh
rm -rf frontend/dist
```

### Backend

```sh
cd backend
./mvnw test
```

기대:

- provider mode 테스트 포함 전체 통과.

## 로컬 정상구동 smoke

### 1. 포트 확인

```sh
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

이미 다른 서버가 떠 있으면 재사용하거나 다른 포트를 쓴다.

### 2. backend mock mode 실행

```sh
cd backend
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
```

### 3. backend API 확인

```sh
curl -sS http://localhost:8080/api/cases
curl -sS http://localhost:8080/api/metrics
```

기대:

- `/api/cases`는 `{ "cases": [...] }` 반환.
- `/api/metrics`는 `provider="mock",model="spring-mock"` 포함.

### 4. streaming simulate 확인

```sh
cd frontend
npm run run:simulate
```

또는 직접 curl:

```sh
curl -sS -N -X POST http://localhost:8080/api/simulate \
  -H 'Content-Type: application/json' \
  -H 'x-simulate-stream: ndjson' \
  -H 'x-session-id: legacy-removal-smoke' \
  -H 'x-ui-locale: ko' \
  --data '{"userProfile":{"age":32,"job":"developer","risk_tolerance":"medium","priority":["stability","income","work_life_balance"]},"decision":{"optionA":"현재 회사에 남는다","optionB":"스타트업으로 이직한다","context":"현재 연봉은 안정적이지만 성장 정체를 느끼고 있다."}}'
```

기대:

- `request_started`
- `routing_resolved`
- `stage_started`
- `stage_completed`
- `result`

### 5. frontend dev server 확인

```sh
cd frontend
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

브라우저에서 확인:

- `http://localhost:5173`
- case preset 목록 로딩.
- 언어 토글 동작.
- 시뮬레이션 제출.
- progress strip 업데이트.
- result cards 표시.
- Error UI가 parser error가 아니라 backend message를 표시.

### 6. frontend preview 확인

remote 배포는 일반적으로 dev server가 아니라 build artifact 기준이므로 preview smoke도 수행한다.

```sh
cd frontend
npm run build
npm run preview -- --port 4173
```

브라우저에서 확인:

- `http://localhost:4173`
- dev server와 동일한 smoke flow.

검증 후 `frontend/dist/`는 삭제하거나 ignored 상태로 남긴다. 커밋하지 않는다.

## remote 배포 후 테스트 계획

remote 환경의 실제 플랫폼에 맞춰 아래 값을 설정한다.

### Backend env

mock smoke:

```env
SIMULATOR_LLM_PROVIDER=mock
```

AWS/OpenAI 운영:

```env
SIMULATOR_LLM_PROVIDER=openai
OPENAI_API_KEY=<secret manager/runtime secret>
SIMULATOR_OPENAI_MODEL=gpt-5.3
```

주의:

- `OPENAI_API_KEY`는 backend runtime secret으로만 주입한다.
- frontend build env에 `OPENAI_API_KEY`나 `VITE_OPENAI_*`를 만들지 않는다.

### Frontend env

```env
VITE_API_BASE_URL=<remote backend base url>
```

### Remote smoke checklist

1. `GET <backend>/api/cases`
2. `GET <backend>/api/metrics`
3. `POST <backend>/api/simulate` with `x-simulate-stream: ndjson`
4. Open `<frontend>` in browser.
5. Preset load 확인.
6. Submit simulation.
7. Progress update 확인.
8. Final result cards 확인.
9. Browser devtools console에 missing chunk, CORS, env, 404 에러가 없는지 확인.
10. Backend logs에 secret fragment가 노출되지 않는지 확인.

## 커밋 범위

코드/설정 커밋 대상:

- 삭제된 legacy TS server pipeline files.
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- 삭제된 `frontend/tsconfig.legacy.json`

문서 커밋 제외:

- `docs/refact/**`
- 기존 미커밋 Markdown 문서 변경.
- `AGENTS.md`, `skills/*`는 사용자가 명시적으로 커밋 허용하지 않으면 제외.

스테이징 확인:

```sh
git diff --cached --name-only | rg '(^docs/|\.md$|^AGENTS\.md$|^skills/)'
```

기대:

- 결과 없음.

## 완료 기준

- `frontend/src/server/`가 없다.
- `frontend/workers/`가 없다.
- `frontend/package.json`에 legacy worker/eval/typecheck script가 없다.
- `frontend/tsconfig.legacy.json`이 없다.
- `frontend` dependency에서 `ajv`, `openai`, `pg`, `prom-client`, `@types/pg`가 제거된다.
- `rg "src/server"`가 frontend 코드/설정에서 결과를 내지 않는다.
- `cd frontend && npm run typecheck` 통과.
- `cd frontend && npm run build` 통과.
- `cd backend && ./mvnw test` 통과.
- backend mock mode에서 `/api/cases`, `/api/metrics`, streaming `/api/simulate` smoke 통과.
- Vite dev server에서 UI smoke 통과.
- Vite preview server에서 UI smoke 통과.
- remote 배포 후 backend/frontend smoke checklist 통과.

## 리스크

### README/AGENTS stale reference

문서성 파일을 커밋하지 않으면 repository 설명에는 legacy script가 잠시 남을 수 있다. 사용자 정책상 docs를 커밋하지 않는다면 감수한다. 필요 시 별도 문서 정리 커밋으로 처리한다.

### frontend package가 너무 작아지는 문제

legacy dependency 제거 후 Vite app이 `react`, `react-dom`, `vite`, `typescript`, Tailwind/PostCSS만으로 빌드되는지 확인해야 한다. `npm run build`가 최종 판정이다.

### remote CORS/env 문제

legacy 삭제와 무관하게 remote frontend의 `VITE_API_BASE_URL`과 backend CORS allowed origin이 맞지 않으면 UI smoke가 실패할 수 있다. remote 테스트에서 CORS 에러를 별도 확인한다.

### monitoring/eval scripts 손실

frontend legacy monitoring/eval scripts는 삭제된다. backend의 `/api/monitoring/*`, `backend/worker/*`, `./mvnw test`가 현재 유지 대상이다.
