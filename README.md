# Life Simulator

This repository is being refactored from a single Next.js project into a frontend/backend split.

## Layout

- `frontend/`: current Next.js application and legacy TypeScript server pipeline.
- `backend/`: Spring Boot backend that owns the new API migration path.
- `docs/refact/`: dated refactoring notes and Codex work orders.

## Local Development

Start the backend first:

```sh
cd backend
./mvnw spring-boot:run
```

Start the frontend:

```sh
cd frontend
npm run dev
```

The frontend defaults to `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`.
Local LLM execution defaults to Codex CLI subscription auth with `gpt-5.3-codex-spark`, low reasoning, low verbosity, and `service_tier=fast`.
