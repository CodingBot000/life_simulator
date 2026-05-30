# Next.js to React + Vite Migration Work Order

작성 시각: 2026-05-04 18:54:27 KST

## 목적

`frontend/`의 현재 Next.js App Router UI를 React + Vite SPA로 전환한다. Spring Boot `backend/`가 API를 소유하는 구조는 유지하고, 프론트엔드는 순수 클라이언트 UI와 백엔드 호출만 담당하게 만든다.

이 문서는 새 세션에서 바로 참조해 작업할 수 있도록 현재 구조, 보존해야 할 계약, 파일 이동, 검증 절차를 모두 포함한 작업 지시서다.

## 현재 상태 요약

- 루트 작업 디렉터리: `/Users/switch/Development/Web/life_simulator`
- 프론트엔드: `frontend/`
- 백엔드: `backend/`
- 현재 UI 진입점:
  - `frontend/app/layout.tsx`
  - `frontend/app/page.tsx`
  - `frontend/app/globals.css`
  - `frontend/src/components/providers/ui-locale-provider.tsx`
- 현재 Spring Boot API:
  - `GET /api/cases`
  - `POST /api/simulate`
  - `GET /api/metrics`
  - `GET /api/monitoring/metrics`
  - `GET /api/monitoring/alerts`
  - `GET /api/monitoring/critical-cases`
  - `GET /api/monitoring/report`
- `POST /api/simulate`는 현재 IP 기준/sessionId 기준 레이트리밋이 적용되어 있다.
- 프론트는 `/api/simulate` 호출 시 `x-session-id` 헤더를 보내야 한다.
- 로그인/API key 인증은 아직 적용하지 않는다.

## 최종 목표

- `frontend`에서 Next.js 의존성을 제거한다.
- `frontend`를 React + Vite SPA로 실행한다.
- 기존 UI 화면과 주요 사용자 흐름을 유지한다.
- `NEXT_PUBLIC_API_BASE_URL` 대신 `VITE_API_BASE_URL`을 사용한다.
- `@/*` alias는 계속 `frontend/src/*`를 가리키게 한다.
- Spring Boot 백엔드 API 계약은 변경하지 않는다.
- OpenAI API key 또는 Next BFF/API route를 새로 만들지 않는다.

## 비목표

- 로그인 기능 구현.
- 백엔드 인증/API key 인증 구현.
- Spring Boot API response shape 변경.
- 시뮬레이션 로직 변경.
- 레거시 `frontend/src/server/*`, `frontend/scripts/*`, `frontend/workers/*` 전체 삭제.
- React Router 도입. 현재 화면은 단일 페이지라 라우터 없이 시작한다.

## 보존해야 할 계약

### API base URL

현재:

```ts
process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
```

전환 후:

```ts
import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
```

### `/api/simulate` 헤더

반드시 유지:

```http
Content-Type: application/json
x-simulate-stream: ndjson
x-session-id: <browser-local-session-id>
x-ui-locale: ko | en
```

`x-session-id`는 백엔드 sessionId 기준 rate limit에 사용된다. Vite 전환 중 삭제하지 않는다.

### NDJSON progress stream

`frontend/app/page.tsx`의 `readSimulationProgressStream` 동작을 유지한다.

- `request_started`
- `routing_resolved`
- `stage_started`
- `stage_completed`
- `error`
- `result`

최종 `result.response`를 `SimulationResponse`로 사용한다.

### Locale

`UiLocaleProvider`의 localStorage key 유지:

```ts
life-simulator.ui-locale
```

`document.documentElement.lang` 업데이트 동작 유지.

### Session ID

현재 session storage key 유지:

```ts
life-simulator-session-id
```

가능하면 별도 util로 분리하되 key 이름은 바꾸지 않는다.

## 권장 작업 순서

## Phase 1: Vite 프로젝트 골격 도입

작업:

- `frontend/index.html`을 추가한다.
- `frontend/src/main.tsx`를 추가한다.
- `frontend/src/App.tsx`를 추가한다.
- `frontend/app/layout.tsx`의 책임을 `src/main.tsx`로 옮긴다.
- `frontend/app/globals.css`를 `frontend/src/styles/globals.css`로 옮긴다.
- `frontend/app/page.tsx`는 처음에는 `frontend/src/App.tsx`로 이동해도 된다.

권장 `index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AI agent chain powered decision simulation MVP" />
    <title>Decision Life Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

권장 `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { UiLocaleProvider } from "@/components/providers/ui-locale-provider";
import App from "@/App";

import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiLocaleProvider>
      <App />
    </UiLocaleProvider>
  </StrictMode>,
);
```

주의:

- `layout.tsx`의 `Metadata` export는 Vite에서 쓰지 않는다. `index.html`의 `<title>`과 `<meta>`로 대체한다.
- `"use client"` 지시문은 Vite에서는 필요 없다. 제거해도 된다.

검증:

- `cd frontend && npm run typecheck`

## Phase 2: package.json 전환

작업:

- Next 실행 scripts 제거 또는 Vite scripts로 교체.
- Vite dependency 추가.
- Next dependency 제거.
- `server-only`는 실제 import가 없으면 제거한다.

권장 scripts:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview --host 0.0.0.0",
  "typecheck": "tsc --noEmit"
}
```

유지할 scripts:

- `worker:log`
- `worker:drift`
- `worker:eval`
- `eval:guardrail`
- `eval:guardrail-calibration`
- `eval:guardrail-thresholds`
- `relabel:guardrail-datasets`
- `optimize:guardrail`
- `re-eval:online-anomalies`
- `run:simulate`
- `seed:anomalies`
- `seed:reeval`
- `run:reeval`
- `verify:monitoring`
- `analyze:*`

의존성 처리:

- 추가:
  - `@vitejs/plugin-react`
  - `vite`
- 제거:
  - `next`
  - `server-only`, 실제 사용처가 없을 때만
- 유지:
  - `react`
  - `react-dom`
  - `tailwindcss`
  - `@tailwindcss/postcss`
  - `typescript`
  - legacy scripts가 아직 쓰는 `openai`, `pg`, `prom-client`, `ajv`는 이번 단계에서 무리하게 제거하지 않는다.

검증:

- `cd frontend && npm install`
- `cd frontend && npm run typecheck`

## Phase 3: Vite config와 TypeScript config

작업:

- `frontend/vite.config.ts` 추가.
- `frontend/tsconfig.json`에서 Next plugin과 `.next` include 제거.
- `frontend/next-env.d.ts` 삭제.
- `frontend/next.config.mjs` 삭제.

권장 `vite.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
```

권장 `tsconfig.json` 수정:

- 유지:
  - `strict: true`
  - `moduleResolution: "bundler"`
  - `jsx: "react-jsx"`
  - `paths["@/*"] = ["./src/*"]`
- 제거:
  - `plugins: [{ "name": "next" }]`
  - include의 `next-env.d.ts`
  - include의 `.next/types/**/*.ts`
  - include의 `.next/dev/types/**/*.ts`

검증:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`

## Phase 4: App Router 파일 제거와 UI 이전

작업:

- `frontend/app/page.tsx` 내용을 `frontend/src/App.tsx`로 옮긴다.
- import 경로는 `@/*` alias를 유지한다.
- `frontend/app/layout.tsx` 삭제.
- `frontend/app/globals.css` 삭제 또는 이동 후 삭제.
- `frontend/app/icon.svg`는 필요하면 `frontend/public/`로 옮긴다.
- `frontend/public/favicon.ico`는 그대로 유지한다.

주의:

- `frontend/app/page.tsx`는 2,000라인 이상이다. 전환 작업과 구조 분리는 같은 커밋에 크게 섞지 않는 편이 안전하다.
- 1차 전환에서는 동작 보존을 우선하고, 컴포넌트 분리는 후속 Phase에서 한다.
- React는 텍스트를 자동 escape하므로 현재처럼 JSX interpolation을 쓰면 XSS 위험은 증가하지 않는다.

검증:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd frontend && npm run dev`
- 브라우저에서 `http://localhost:5173` 접속.

## Phase 5: 환경변수와 문서 갱신

작업:

- `frontend/.env.example`
- `frontend/.env.local.example`
- `frontend/README.md`
- 루트 `README.md`

변경:

- `NEXT_PUBLIC_API_BASE_URL`을 `VITE_API_BASE_URL`로 교체.
- 기본값은 `http://localhost:8080`.
- OpenAI API key는 프론트 UI 실행에 필요 없다고 명시.
- Vite dev server 기본 포트는 `5173`.

권장 env:

```env
VITE_API_BASE_URL=http://localhost:8080
```

검증:

- `.env.local`에 `VITE_API_BASE_URL`이 없어도 fallback으로 동작하는지 확인.
- `.env.local`에 값이 있을 때 해당 backend로 호출되는지 확인.

## Phase 6: 백엔드 CORS 업데이트

대상:

- `backend/src/main/java/com/lifesimulator/backend/config/CorsConfig.java`

작업:

- Vite dev server origin 추가:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- 기존 Next dev origin은 전환 완료 전까지 유지:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`

주의:

- CORS는 인증이 아니다.
- 클라우드 배포 때 실제 프론트 origin만 허용하도록 별도 설정화한다.

검증:

- `cd backend && ./mvnw test`
- backend와 Vite dev server를 같이 실행하고 `/api/cases` 호출이 브라우저에서 성공하는지 확인.

## Phase 7: Docker와 개발 명령 갱신

대상:

- `frontend/Dockerfile`
- `frontend/docker-compose.yml`
- 루트 또는 backend 관련 compose 문서

작업:

- 현재 Dockerfile의 `next dev` 실행을 Vite dev 또는 정적 preview 기준으로 바꾼다.
- `frontend/docker-compose.yml`의 `.next` volume 제거.
- `PORT=3000` 전제를 Vite 기본 포트 `5173` 또는 명시 포트로 바꾼다.
- `WATCHPACK_POLLING` 등 Next dev 전용 설정 제거.

주의:

- Docker에서 Codex CLI 인증을 공유하지 않는 정책은 유지한다.
- backend는 로컬 실행을 기본으로 두고, Docker 통합은 후순위로 둬도 된다.

검증:

- Docker를 수정했다면 `docker compose config` 확인.
- 실제 compose 실행은 환경에 따라 선택.

## Phase 8: 후속 구조 분리

이 Phase는 Vite 전환이 통과한 뒤 진행한다.

대상:

- `frontend/src/App.tsx`
- 신규 `frontend/src/lib/api/*`
- 신규 `frontend/src/hooks/*`
- 신규 `frontend/src/components/simulation/*`

권장 분리:

- `src/lib/api/client.ts`
  - `apiUrl`
  - `VITE_API_BASE_URL` 처리
- `src/lib/api/session.ts`
  - `life-simulator-session-id`
  - `getSimulatorSessionId`
- `src/lib/api/simulation-stream.ts`
  - `readSimulationProgressStream`
- `src/hooks/use-case-presets.ts`
  - `GET /api/cases`
- `src/hooks/use-simulation-submit.ts`
  - `POST /api/simulate`
- `src/components/simulation/*`
  - progress card
  - planner card
  - scenario cards
  - risk cards
  - advisor card
  - guardrail card
  - reflection card

주의:

- 분리 중 화면 문구와 CSS class를 대규모 변경하지 않는다.
- UI redesign은 별도 작업으로 둔다.

검증:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- 브라우저 smoke test.

## 파일별 처리 지침

### 삭제 대상

전환 완료 후 삭제:

- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`
- `frontend/app/globals.css`
- `frontend/app/icon.svg`, public으로 옮기지 않는 경우
- `frontend/next-env.d.ts`
- `frontend/next.config.mjs`

### 추가 대상

- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/styles/globals.css`

### 수정 대상

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/.env.example`
- `frontend/.env.local.example`
- `frontend/README.md`
- `README.md`
- `backend/src/main/java/com/lifesimulator/backend/config/CorsConfig.java`
- `frontend/Dockerfile`, Docker 작업을 포함하는 경우
- `frontend/docker-compose.yml`, Docker 작업을 포함하는 경우

## 검증 체크리스트

필수:

- `cd frontend && npm install`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd backend && ./mvnw test`

수동 확인:

- `cd backend && ./mvnw spring-boot:run`
- `cd frontend && npm run dev`
- `http://localhost:5173` 접속
- 케이스 프리셋 목록 로딩 확인
- 언어 토글 확인
- `/api/simulate` 실행 확인
- 진행 상태 NDJSON stage 표시 확인
- 최종 결과 표시 확인
- 여러 번 호출 시 rate limit error가 UI에서 깨지지 않는지 확인

선택:

- `cd frontend && npm run verify:monitoring`, monitoring UI/API를 건드렸을 때만
- `cd frontend && npm audit --omit=dev`, registry 상태가 정상일 때

## 완료 기준

- Next.js dependency 없이 `frontend`가 개발 서버로 실행된다.
- `frontend` production build가 생성된다.
- Spring Boot API 호출이 기존과 동일하게 동작한다.
- `x-session-id` 헤더가 `/api/simulate` 요청에 포함된다.
- `VITE_API_BASE_URL`로 API base URL을 변경할 수 있다.
- `NEXT_PUBLIC_API_BASE_URL`, `next-env.d.ts`, `next.config.mjs`, `app/` runtime 의존이 제거된다.
- 백엔드 CORS가 Vite dev origin을 허용한다.
- 새 구조와 실행 명령이 README에 반영된다.

## 권장 커밋 단위

1. `refactor(frontend): add vite entrypoint`
   - `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, CSS 이동
2. `refactor(frontend): replace next runtime with vite`
   - `package.json`, `package-lock.json`, `tsconfig.json`, Next 파일 삭제
3. `chore(frontend): update env and docs for vite`
   - env examples, README
4. `chore(backend): allow vite dev origin`
   - CORS update
5. `refactor(frontend): split simulation app components`
   - 선택적 후속 구조 분리

## 주의할 리스크

- Vite는 `process.env`를 브라우저에 제공하지 않는다. 모든 프론트 공개 env는 `import.meta.env.VITE_*`로 바꿔야 한다.
- `NEXT_PUBLIC_*` 이름은 Vite에서 자동 노출되지 않는다.
- Next `Metadata`와 `layout.tsx`는 Vite에서 사용할 수 없다.
- `app/page.tsx`의 `"use client"`는 제거 가능하지만, 제거 과정에서 다른 문자열/문구를 함께 바꾸지 않는다.
- 현재 레거시 `frontend/src/server/*`는 scripts/workers가 사용하므로, Vite 전환과 동시에 삭제하지 않는다.
- `docs/refact`는 `.gitignore` 대상이다. 문서를 커밋하려면 `git add -f docs/refact/<file>.md`가 필요하다.
