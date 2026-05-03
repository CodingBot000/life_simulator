# AGENTS

## Project Structure

- `frontend/`: current Next.js App Router application. It keeps the previous `app/`, `src/`, `workers/`, `scripts/`, `prompts/`, `db/`, `playground/`, and generated output layout until the later React+Vite migration.
- `frontend/app/`: Next.js pages and legacy API routes. During migration, UI calls should prefer the Spring Boot backend through `NEXT_PUBLIC_API_BASE_URL`.
- `frontend/src/server/`: legacy TypeScript simulation pipeline, routing, guardrails, LLM providers, logging, monitoring, resilience, drift, and queue logic.
- `frontend/src/lib/`: shared frontend/legacy types, prompts, monitoring helpers, locale/output helpers, and logger utilities.
- `frontend/src/components/`: UI-only shared React components.
- `backend/`: Spring Boot backend. New API migration work should land here first.
- `backend/src/main/java/com/lifesimulator/backend/`: Spring Boot controllers, services, config, case catalog, simulation, and Codex CLI adapter.
- `docs/refact/`: dated refactoring analysis and migration work orders. Use `YYYYMMDD-HH-mm-ss-file-name.md`.

## Confirmed Commands

- Frontend install: `cd frontend && npm install`
- Frontend dev server: `cd frontend && npm run dev`
- Frontend dev server (Turbopack): `cd frontend && npm run dev:turbo`
- Frontend build: `cd frontend && npm run build`
- Frontend production build: `cd frontend && npm run start`
- Frontend typecheck: `cd frontend && npm run typecheck`
- Backend dev server: `cd backend && ./mvnw spring-boot:run`
- Backend build/test: `cd backend && ./mvnw test`
- Workers: `cd frontend && npm run worker:log`, `cd frontend && npm run worker:drift`, `cd frontend && npm run worker:eval`
- Targeted scripts:
  - `cd frontend && npm run verify:monitoring`
  - `cd frontend && npm run eval:guardrail`
  - `cd frontend && npm run eval:guardrail-calibration`
  - `cd frontend && npm run eval:guardrail-thresholds`
  - `cd frontend && npm run run:simulate`
  - `cd frontend && npm run run:reeval`
  - `cd frontend && npm run re-eval:online-anomalies`

## Build, Test, Lint, Typecheck

- Frontend build: use `cd frontend && npm run build`
- Frontend typecheck: use `cd frontend && npm run typecheck`
- Backend build/test: use `cd backend && ./mvnw test`
- Frontend lint: no lint script is configured in `frontend/package.json`
- Tests: no single repo-wide automated test runner is configured
- Validation in this repo is command selection plus targeted scripts and manual endpoint/UI checks

## Code Change Principles

- Keep diffs small and local to the owning path.
- Preserve API route contracts unless the task explicitly changes them.
- For changes in `frontend/src/server/` or backend simulation paths, keep logging, metrics, guardrail, retry/timeout, and queue side effects intact unless the task is specifically about changing them.
- Reuse existing types and prompt contracts instead of adding parallel shapes.
- Treat `frontend/outputs/` as generated/runtime data, not source of truth for code changes.
- Do not invent commands, directories, or framework layers that are not present in this repo.
- Keep source files under 500-800 lines; split controllers, services, adapters, and domain helpers by role.
- Keep Codex CLI subscription auth as the default LLM path for local development. Do not require `OPENAI_API_KEY` unless a task explicitly re-enables OpenAI API mode.

## Response Format

- State the files changed.
- State the validation actually run.
- State any checks that could not be run.
- Call out residual risk briefly when behavior depends on env, workers, model access, or DB availability.

## Skill Usage

- Use `skills/planner` for complex or cross-cutting work: when the request spans API routes, `frontend/src/server/`, `backend/`, prompts, workers, or DB/monitoring side effects.
- Use `skills/reviewer` before closing risky changes or when a request explicitly asks for review.
- Use `skills/tester` when the changed path needs an explicit verification plan or targeted script selection.
- Use `skills/implementer` for normal code changes after the owning files and validation path are clear.
- For UI implementation work in `frontend/app/*` or `frontend/src/components/*`, default to `skills/implementer` for the change and `skills/tester` for validation.
- When a request is design- or UX-heavy rather than a narrow implementation fix, first propose using the `ui-designer` agent from `.codex/agents` before making broader visual or interaction changes.
