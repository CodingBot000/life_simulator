# life_simulator

`life_simulator` is still a Next.js app, but it now runs through a production-oriented LLMOps path that stays manageable for a solo operator.

## What changed

- All structured LLM calls go through `src/server/llm/client.ts`.
- `/api/simulate` now follows a fixed pipeline: auth/input validation -> rate limit -> execution context -> routing -> agent stages -> deterministic guardrail -> final response -> async logging enqueue -> metrics emit.
- Dual-write logging is supported: existing file artifacts remain in `outputs/online_logs/*`, and Postgres inserts are enabled when `DATABASE_URL` is set.
- Drift, log, and eval workers live under `workers/*`.
- Prometheus metrics are exposed at `/api/metrics`.

## Environment

Copy `.env.local.example` into `.env.local` and set only the fields you need.

Key variables:

- `OPENAI_API_KEY`: required only when `LLM_PROVIDER_MODE=openai`.
- `LLM_PROVIDER_MODE`: `mock` or `openai`. If omitted, the app falls back to `mock` when no OpenAI key exists.
- `LOW_COST_MODEL`, `PREMIUM_MODEL`: optional overrides for routing.
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

- `src/server/routing/request-router.ts`: model tiering and path selection.
- `src/server/llm/model-registry.ts`: costs, timeouts, fallback mapping.
- `src/server/guardrail/service.ts`: deterministic guardrail event shaping.
- `src/server/logging/service.ts`: extra DB columns or new log/event sinks.
- `src/server/drift/drift-thresholds.ts`: baseline and threshold adjustments.
- `src/server/drift/drift-detector.ts`: new anomaly formulas or new aggregate metrics.
