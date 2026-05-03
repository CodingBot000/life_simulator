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
