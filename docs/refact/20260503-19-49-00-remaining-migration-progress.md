# Remaining Migration Progress

작성 시각: 2026-05-03 19:49:00 KST

## 완료

- 백엔드에 stage별 prompt 리소스를 복사했다.
- `/api/simulate` 실행을 전체 응답 1회 호출 방식에서 stage별 실행 구조로 변경했다.
- stage별 Codex CLI 호출은 각 stage fallback object에서 생성한 JSON schema를 사용한다.
- stage별 Codex CLI 호출은 빠른 개발 테스트를 위해 `gpt-5.3-codex-spark`, low reasoning/verbosity, fast service tier, `--ephemeral`을 사용한다.
- Codex CLI 호출 실패 또는 비활성화 시 stage별 deterministic fallback을 유지한다.
- guardrail을 별도 `GuardrailEvaluationService`로 분리하고 risk score, confidence, ambiguity, conflict를 반영하도록 보강했다.
- light/standard/careful 경로에서는 advisor 후 파생 guardrail을 만들고, full 경로에서는 advisor 전에 guardrail을 만든다.
- 프론트의 Next.js API route 파일을 제거했다. API는 Spring Boot backend가 소유한다.
- legacy monitoring script 기본 base URL을 backend `http://127.0.0.1:8080`로 변경했다.
- backend worker job을 추가했다.
  - `--backend.job=log`: inline persistence 확인용 no-op
  - `--backend.job=drift --bucket-hours=24`: DB 기반 drift snapshot 저장
  - `--backend.job=eval --limit=50`: anomaly event 기반 eval sample 저장

## 남은 확인

- 로컬 Postgres가 실행되면 `BACKEND_DATABASE_ENABLED=true`로 migration, simulate insert, monitoring query, drift/eval job을 실제 DB에서 검증한다.
- live Codex CLI full 경로는 DB 준비 후 짧은 케이스로 추가 검증한다.
- 기존 TypeScript server/worker 코드는 프론트 폴더에 migration reference로 남아 있다. 백엔드 parity가 충분해진 뒤 삭제한다.

## 검증 완료

- `cd backend && ./mvnw test`
- `codex login status`: ChatGPT 로그인 확인
- `codex exec ... --ephemeral --output-schema`: 빠른 옵션 조합 live schema 응답 확인
- `SIMULATOR_CODEX_ENABLED=true SIMULATOR_CODEX_FALLBACK_ON_ERROR=false BACKEND_DATABASE_ENABLED=false ./mvnw spring-boot:run`
  - `POST /api/simulate` light 케이스: fallback 없이 Codex stage 실행 성공
- `SIMULATOR_CODEX_ENABLED=false BACKEND_DATABASE_ENABLED=false ./mvnw spring-boot:run`
  - `POST /api/simulate` light 케이스: `execution_mode=light`, `guardrail.final_mode=normal`
  - `POST /api/simulate` full 케이스: `execution_mode=full`, `guardrail.final_mode=cautious`
  - `GET /api/monitoring/metrics`, `GET /api/monitoring/report`, `GET /api/monitoring/alerts`, `GET /api/monitoring/critical-cases` 응답 shape 확인
  - `GET /actuator/health`: `UP`
- `cd frontend && npm run build`
- `cd frontend && npm run typecheck`

## 커밋 지점

- stage별 backend 실행 구조, guardrail 분리, worker job, frontend API route 제거를 하나의 migration 단위로 커밋한다.
