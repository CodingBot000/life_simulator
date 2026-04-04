# life_simulator

`life_simulator` is still a Next.js app, but it now runs through a production-oriented LLMOps path that stays manageable for a solo operator.

## What changed

- All structured LLM calls go through `src/server/llm/client.ts`.
- `/api/simulate` now follows an adaptive pipeline: auth/input validation -> rate limit -> state loader -> routing -> selective stage execution -> guardrail/advisor/reflection response -> async logging enqueue -> metrics emit.
- Dual-write logging is supported: existing file artifacts remain in `outputs/online_logs/*`, and Postgres inserts are enabled when `DATABASE_URL` is set.
- Drift, log, and eval workers live under `workers/*`.
- Prometheus metrics are exposed at `/api/metrics`.

## Environment

Copy `.env.local.example` into `.env.local` and set only the fields you need.

Key variables:

- `LLM_PROVIDER_MODE`: `codex`, `mock`, or `openai`. If omitted, the app defaults to `codex`.
- `OPENAI_API_KEY`: required only when `LLM_PROVIDER_MODE=openai`.
- `LOW_COST_MODEL`, `PREMIUM_MODEL`: optional stage-plan overrides. In `codex` mode, legacy names like `gpt-5` and `gpt-5-mini` are normalized to `gpt-5.4` and `gpt-5.4-mini`.
- `DATABASE_URL`: optional. When present, request/stage/guardrail/anomaly/drift/eval rows are inserted into Postgres.
- `LLMOPS_INLINE_QUEUE_DRAIN=true`: useful locally if you want API calls to drain the log queue immediately without a separate worker.

## Local run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply the Postgres schema only if you want DB persistence:

   ```bash
   psql "$DATABASE_URL" -f db/migrations/20260403_init_production_llmops.sql
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

   `codex` mode assumes `codex login status` succeeds on the host machine. The current Docker setup does not share Codex subscription auth into the container.

4. Optional workers:

   ```bash
   npm run worker:log
   npm run worker:drift
   EVAL_WORKER_LIMIT=10 npm run worker:eval
   ```

5. Verify the codebase:

   ```bash
   npm run typecheck
   ```

## Local Docker

- Docker local dev uses `Dockerfile`, `docker-compose.yml`, and `.env.example`.
- Copy `.env.example` to `.env`, then run `docker compose up -d --build`.
- The current container path is not wired for `Codex CLI` subscription auth, so use host `npm run dev` for `LLM_PROVIDER_MODE=codex`. Docker is still suitable for `mock` or explicit `openai` mode.
- Prometheus is exposed at `http://localhost:9090`.
- Grafana is exposed at `http://localhost:3001` and auto-loads the provisioned `Life Simulator LLMOps` dashboard.
- The detailed runbook lives at `docs/local_docker_run.md` and is intentionally kept outside git tracking because `docs/` is ignored in this repository.

## Operations

- API route: `POST /api/simulate`
- Metrics: `GET /api/metrics`
- File-based online logs: `outputs/online_logs/*`
- Queue backlog: `outputs/queues/llm_log_jobs/pending`
- Drift outputs: `outputs/online_logs/drift_metrics`
- Eval samples: `outputs/online_logs/eval_samples`

## Audit extension points

When you paste in a later audit document, the main places to extend are:

- `src/server/routing/request-router.ts`: execution mode selection and stage-by-stage model planning.
- `src/server/llm/model-registry.ts`: provider mode defaults, model aliases, fallback mapping.
- `src/server/guardrail/service.ts`: deterministic guardrail event shaping.
- `src/server/logging/service.ts`: extra DB columns or new log/event sinks.
- `src/server/drift/drift-thresholds.ts`: baseline and threshold adjustments.
- `src/server/drift/drift-detector.ts`: new anomaly formulas or new aggregate metrics.
