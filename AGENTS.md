# AGENTS

## Project Structure

- `app/`: Next.js App Router pages and API routes. Main endpoints include `app/api/simulate/route.ts` and `app/api/metrics/route.ts`.
- `src/server/`: server-side simulation pipeline, routing, guardrails, LLM providers, logging, monitoring, resilience, drift, and queue logic.
- `src/lib/`: shared types, prompts, monitoring helpers, locale/output helpers, and logger utilities.
- `src/components/`: UI-only shared React components.
- `workers/`: log, drift, and eval workers.
- `scripts/`: guardrail, monitoring, anomaly, reevaluation, and analysis scripts.
- `db/migrations/`: Postgres schema migration.
- `prompts/`: prompt source files used by the simulation flow.
- `outputs/`: generated logs, queue files, monitoring outputs, and eval artifacts.

## Confirmed Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Dev server (Turbopack): `npm run dev:turbo`
- Build: `npm run build`
- Start production build: `npm run start`
- Typecheck: `npm run typecheck`
- Workers: `npm run worker:log`, `npm run worker:drift`, `npm run worker:eval`
- Targeted scripts:
  - `npm run verify:monitoring`
  - `npm run eval:guardrail`
  - `npm run eval:guardrail-calibration`
  - `npm run eval:guardrail-thresholds`
  - `npm run run:simulate`
  - `npm run run:reeval`
  - `npm run re-eval:online-anomalies`

## Build, Test, Lint, Typecheck

- Build: use `npm run build`
- Typecheck: use `npm run typecheck`
- Lint: no lint script is configured in `package.json`
- Tests: no single repo-wide automated test runner is configured in `package.json`
- Validation in this repo is command selection plus targeted scripts and manual endpoint/UI checks

## Code Change Principles

- Keep diffs small and local to the owning path.
- Preserve API route contracts unless the task explicitly changes them.
- For changes in `src/server/`, keep logging, metrics, guardrail, retry/timeout, and queue side effects intact unless the task is specifically about changing them.
- Reuse existing types and prompt contracts instead of adding parallel shapes.
- Treat `outputs/` as generated/runtime data, not source of truth for code changes.
- Do not invent commands, directories, or framework layers that are not present in this repo.

## Response Format

- State the files changed.
- State the validation actually run.
- State any checks that could not be run.
- Call out residual risk briefly when behavior depends on env, workers, model access, or DB availability.

## Skill Usage

- Use `skills/planner` for complex or cross-cutting work: when the request spans API routes, `src/server/`, prompts, workers, or DB/monitoring side effects.
- Use `skills/reviewer` before closing risky changes or when a request explicitly asks for review.
- Use `skills/tester` when the changed path needs an explicit verification plan or targeted script selection.
- Use `skills/implementer` for normal code changes after the owning files and validation path are clear.
- For UI implementation work in `app/*` or `src/components/*`, default to `skills/implementer` for the change and `skills/tester` for validation.
- When a request is design- or UX-heavy rather than a narrow implementation fix, first propose using the `ui-designer` agent from `.codex/agents` before making broader visual or interaction changes.
