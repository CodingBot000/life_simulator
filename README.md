# Life Simulator

This repository is split into a React + Vite frontend and a Spring Boot backend.

## Layout

- `frontend/`: React + Vite application and legacy TypeScript server pipeline.
- `backend/`: Spring Boot backend that owns the new API migration path.
- `docs/refact/`: dated refactoring notes and Codex work orders.

## Local Development

For normal local execution, authenticate with the local Codex CLI and run the backend without `OPENAI_API_KEY`.
The backend defaults to `SIMULATOR_LLM_PROVIDER=codex`, so local simulations use Codex CLI subscription authentication.

For a quick smoke test without model credentials, start the backend in mock mode:

```sh
cd backend
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
```

For OpenAI API billing instead of Codex CLI subscription auth, explicitly run the backend with `SIMULATOR_LLM_PROVIDER=openai` and set `OPENAI_API_KEY` in the backend process environment.

Start the frontend:

```sh
cd frontend
npm run dev
```

For local development, the backend runs on `http://localhost:48087` and the frontend runs on `http://localhost:47174`.
The frontend reads the backend URL from `VITE_API_BASE_URL`, falling back to `http://localhost:48087` for localhost.
Never put `OPENAI_API_KEY` in frontend `VITE_*` variables; the browser app only calls the backend.
