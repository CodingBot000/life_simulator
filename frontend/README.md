# life_simulator frontend

This folder contains the React + Vite UI. Server ownership lives in `../backend`.

## Current role

- Render the Life Simulator UI.
- Call the Spring Boot backend through `VITE_API_BASE_URL`.
- Keep the legacy TypeScript server pipeline only as migration reference until it is fully deleted.

## Environment

Copy `.env.local.example` into `.env.local` and set only the fields you need.

Key variables:

- `VITE_API_BASE_URL`: backend base URL, default `http://localhost:8080`.
- `SIMULATE_BASE_URL`: backend base URL for legacy monitoring scripts, default `http://127.0.0.1:8080`.

Do not put `OPENAI_API_KEY` in frontend `VITE_*` variables. LLM provider mode is selected by the backend.

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

The Vite dev server runs on `http://localhost:5173` by default.

Verify the frontend:

```bash
npm run typecheck
npm run build
```

## API

The frontend does not own API routes. These endpoints are served by the backend:

- `GET /api/cases`
- `POST /api/simulate`
- `GET /api/metrics`
- `GET /api/monitoring/metrics`
- `GET /api/monitoring/alerts`
- `GET /api/monitoring/critical-cases`
- `GET /api/monitoring/report`
