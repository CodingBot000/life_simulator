# Life Simulator Backend

Spring Boot backend for the Life Simulator migration.

## Run Without Database

```sh
./mvnw spring-boot:run
```

This keeps the API usable with in-memory/fallback behavior.

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

## Codex CLI

The backend defaults to Codex CLI subscription authentication. It does not require `OPENAI_API_KEY`.
Stage calls use `gpt-5.3-codex-spark`, low reasoning/verbosity, fast service tier, read-only sandboxing, and ephemeral CLI sessions by default.

## Worker Jobs

Backend worker jobs run through the same Spring Boot app with a job argument:

```sh
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=log"
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=drift --bucket-hours=24"
./mvnw spring-boot:run -Dspring-boot.run.arguments="--backend.job=eval --limit=50"
```

`drift` and `eval` require `BACKEND_DATABASE_ENABLED=true`. Log persistence is inline, so the `log` job is a compatibility no-op.
