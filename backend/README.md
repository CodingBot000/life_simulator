# Life Simulator Backend

Spring Boot backend for the Life Simulator migration.

## Run Without Database

```sh
./mvnw spring-boot:run
```

This keeps the API usable with in-memory/fallback behavior.
YouTube search reads `YOUTUBE_API_KEY` from the process environment or from `backend/.env`.
Naver search reads `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` the same way.

For YouTube recommendation search, set:

```sh
YOUTUBE_API_KEY=...
```

## Run With Local Postgres

Create a local database and user, then enable the backend database profile through environment variables:

```sh
export BACKEND_DATABASE_ENABLED=true
export BACKEND_DATABASE_URL=jdbc:postgresql://localhost:5432/life_simulator_dev
export BACKEND_DATABASE_USERNAME=life_sim_user
export BACKEND_DATABASE_PASSWORD=life_sim_password
./mvnw spring-boot:run
```

When `BACKEND_DATABASE_ENABLED=true`, Flyway applies migrations from `src/main/resources/db/migration`.

## LLM Provider Mode

The backend uses OpenAI API mode by default. Choose a different model runner with `SIMULATOR_LLM_PROVIDER`.

### Mock smoke test

```sh
SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
```

This requires no model credentials and is the fastest public-repo smoke path.

### Codex CLI

```sh
SIMULATOR_LLM_PROVIDER=codex ./mvnw spring-boot:run
```

Codex mode uses local Codex CLI subscription authentication and does not require `OPENAI_API_KEY`.
Stage calls use `gpt-5.3-codex-spark`, low reasoning/verbosity, fast service tier, read-only sandboxing, and ephemeral CLI sessions by default.

### OpenAI API

```sh
SIMULATOR_LLM_PROVIDER=openai OPENAI_API_KEY=... ./mvnw spring-boot:run
```

Use OpenAI mode for AWS/cloud deployments. Inject `OPENAI_API_KEY` into the backend runtime environment through your deployment secret mechanism. Do not expose it through frontend `VITE_*` variables.

## Worker Jobs

Backend worker jobs run through the same Spring Boot app with a job argument:

```sh
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=log"
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=drift --bucket-hours=24"
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=eval --limit=50"
```

`drift` and `eval` require `BACKEND_DATABASE_ENABLED=true`. Log persistence is inline, so the `log` job is a compatibility no-op.
