# Life Simulator

This repository is split into a React + Vite frontend and a Spring Boot backend.

## Layout

- `frontend/`: React + Vite application and legacy TypeScript server pipeline.
- `backend/`: Spring Boot backend that owns the new API migration path.
- `docs/refact/`: dated refactoring notes and Codex work orders.

## Local Development

For normal local execution, set `OPENAI_API_KEY` in `backend/.env` and keep `SIMULATOR_LLM_PROVIDER=openai`.
The API key belongs only in the backend environment.

For a quick smoke test without model credentials, start the backend in mock mode:

```sh
cd backend
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
```

For Codex CLI subscription auth instead of OpenAI API billing, explicitly use `SIMULATOR_LLM_PROVIDER=codex`.

Start the frontend:

```sh
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` by default and reads the backend URL from `VITE_API_BASE_URL`, falling back to `http://localhost:8080`.
Never put `OPENAI_API_KEY` in frontend `VITE_*` variables; the browser app only calls the backend.
