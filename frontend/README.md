# life_simulator frontend

This folder contains the current Next.js UI. Server ownership is moving to `../backend`.

## Current role

- Render the Life Simulator UI.
- Call the Spring Boot backend through `NEXT_PUBLIC_API_BASE_URL`.
- Keep the legacy TypeScript server pipeline only as migration reference until it is fully deleted.

## Environment

Copy `.env.local.example` into `.env.local` and set only the fields you need.

Key variables:

- `NEXT_PUBLIC_API_BASE_URL`: backend base URL, default `http://localhost:8080`.
- `SIMULATE_BASE_URL`: backend base URL for legacy monitoring scripts, default `http://127.0.0.1:8080`.
- `LLM_PROVIDER_MODE`: retained for legacy scripts only. UI traffic should use the backend.
- `OPENAI_API_KEY`: leave empty unless you intentionally run old TypeScript OpenAI-mode scripts.

## Local run

Start the backend first:

```bash
cd ../backend
./mvnw spring-boot:run
```

Start the frontend:

```bash
npm install
npm run dev
```

Verify the frontend:

```bash
npm run typecheck
npm run build
```

## API

The frontend no longer owns Next.js API routes. These endpoints are served by the backend:

- `GET /api/cases`
- `POST /api/simulate`
- `GET /api/metrics`
- `GET /api/monitoring/metrics`
- `GET /api/monitoring/alerts`
- `GET /api/monitoring/critical-cases`
- `GET /api/monitoring/report`
