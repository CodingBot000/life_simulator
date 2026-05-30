# Security and Refactor Priority Audit

작성 시각: 2026-05-04 18:16:28 KST

## 목적

Next.js 풀스택 구조를 `frontend/`와 `backend/`로 분리한 뒤 남은 보안 이슈와 리팩토링 대상을 우선순위별로 정리한다. 이 문서는 코드 변경 지시서가 아니라 후속 작업 백로그의 기준 문서다.

## 점검 범위

- Spring Boot API 경계: `backend/src/main/java/com/lifesimulator/backend/api/*`
- Codex CLI 실행 경계: `backend/src/main/java/com/lifesimulator/backend/llm/CodexCliClient.java`
- 시뮬레이션 검증/오케스트레이션: `backend/src/main/java/com/lifesimulator/backend/simulation/*`
- 로깅/모니터링 저장 경계: `backend/src/main/java/com/lifesimulator/backend/logging/*`, `backend/src/main/java/com/lifesimulator/backend/monitoring/*`
- 프론트엔드 API 호출 및 레거시 잔여 코드: `frontend/app/page.tsx`, `frontend/src/server/*`, `frontend/scripts/*`, `frontend/workers/*`
- 런타임 산출물/레포 hygiene: `.gitignore`, `frontend/outputs/`, `frontend/playground/outputs/`

## 우선순위 기준

- P1: 외부 노출 또는 악의적 입력이 있으면 비용, 데이터, 실행 경계에 직접 영향을 주는 항목. 운영/공유 환경 전 우선 처리.
- P2: 민감 정보 노출, 운영 데이터 관리, 장애 진단 안정성에 영향을 주는 항목. P1 이후 바로 처리.
- P3: 유지보수성, 마이그레이션 완성도, 배포 품질을 낮추는 항목. 보안 기본선 이후 단계적으로 처리.

## P1: 운영 노출 전 차단해야 할 항목

### 1. Codex CLI 실행 격리 (적용완료)

대상:

- `backend/src/main/java/com/lifesimulator/backend/llm/CodexCliClient.java`
- `backend/src/main/java/com/lifesimulator/backend/simulation/StageExecutionService.java`

문제:

- `/api/simulate` 사용자 입력이 stage prompt에 포함된다.
- Codex CLI 프로세스가 별도 작업 디렉터리 없이 현재 백엔드 프로세스 환경을 상속한다.
- `--sandbox read-only`는 쓰기 차단에는 도움이 되지만, 모델이 프롬프트 인젝션으로 워크스페이스 파일이나 환경 정보를 읽어 응답에 섞는 위험을 충분히 막지 못한다.

권장 작업:

- `ProcessBuilder.directory(tempDir.toFile())`로 빈 임시 작업 디렉터리에서 CLI를 실행한다.
- `builder.environment().clear()` 후 필요한 최소 환경변수만 주입한다.
- Codex CLI 인증에 필요한 변수와 PATH를 명시적으로 allowlist한다.
- stage prompt 앞단에 사용자 입력과 시스템 지시를 분리하는 템플릿을 둔다.
- CLI stderr/stdout 원문은 클라이언트 응답에 섞이지 않게 한다.

검증:

- `cd backend && ./mvnw test`
- 큰 입력과 프롬프트 인젝션 문구를 포함한 `/api/simulate` 수동 호출.
- CLI가 임시 디렉터리에서 실행되는지 로그 또는 테스트 더블로 확인.

### 2. `/api/simulate` 인증과 레이트리밋 (레이트리밋 적용완료)

대상:

- `backend/src/main/java/com/lifesimulator/backend/api/SimulationController.java`
- 신규 security/filter/config 계층

문제:

- `POST /api/simulate`가 인증 없이 비싼 LLM stage 실행을 시작한다.
- CORS는 브라우저 출처 제한일 뿐 서버 간 호출이나 직접 호출을 막지 못한다.
- 현재 백엔드에는 Spring Security 또는 API key 검증 계층이 없다.

권장 작업:

- 로컬 개발 기본값은 유지하되, 운영/공유 환경에서는 API key 또는 세션 인증을 필수화한다.
- IP 또는 사용자 키 기준 rate limit을 둔다.
- 인증 실패는 401, rate limit 초과는 429로 안정적인 JSON error shape를 반환한다.
- `/api/cases`는 공개 가능 여부를 별도로 결정하고, `/api/simulate`와 monitoring endpoint는 분리된 정책을 둔다.

검증:

- 인증 없음, 잘못된 키, 정상 키 케이스 테스트.
- 초과 호출 시 429 반환 테스트.
- 프론트엔드에서 필요한 헤더 전달 방식 확인.

### 3. 요청 크기와 필드 길이 제한

대상:

- `backend/src/main/java/com/lifesimulator/backend/simulation/SimulationResponseFactory.java`
- 가능하면 신규 request DTO와 validation package

문제:

- 현재 검증은 필수 필드와 양수 age 확인에 머문다.
- 긴 `context`, `optionA`, `optionB`, `job`, 과도한 `priority` 배열이 prompt와 DB 로그로 그대로 흘러간다.
- 토큰 비용 폭증, 처리 지연, 로그 저장소 팽창 위험이 있다.

권장 작업:

- `JsonNode` 직접 검증을 DTO + Bean Validation으로 이전한다.
- `age`, `risk_tolerance`, `priority`, `job`, `optionA`, `optionB`, `context`에 max/min 제한을 둔다.
- 전체 HTTP body size 제한을 `application.yml` 또는 servlet config에 명시한다.
- enum/allowlist 기반 값 검증을 추가한다.

검증:

- 경계값 단위 테스트.
- max length 초과 시 400 반환 확인.
- 정상 seed case가 기존 response shape를 유지하는지 확인.

## P2: 보안 기본선 보강 항목

### 4. 내부 오류 메시지 마스킹

대상:

- `backend/src/main/java/com/lifesimulator/backend/api/ApiExceptionHandler.java`
- `backend/src/main/java/com/lifesimulator/backend/api/SimulationController.java`

문제:

- 전역 예외 처리와 NDJSON 스트리밍 error 이벤트가 `Exception#getMessage()`를 클라이언트로 전달한다.
- Codex CLI 실패 메시지에는 경로, stderr/stdout, 설정 정보가 포함될 수 있다.

권장 작업:

- 클라이언트에는 `error_code`, `message`, `trace_id`만 반환한다.
- 내부 상세 메시지는 서버 로그에만 남긴다.
- bad request와 internal error의 메시지 정책을 분리한다.
- 스트리밍 경로도 동일한 error response policy를 사용한다.

검증:

- 임의 예외 발생 시 내부 경로/CLI stderr가 응답에 없는지 확인.
- 프론트엔드 error display가 새 shape를 처리하는지 확인.

### 5. 요청/응답 로그 redaction과 보존 정책

대상:

- `backend/src/main/java/com/lifesimulator/backend/logging/SimulationLogRepository.java`
- `backend/src/main/java/com/lifesimulator/backend/logging/SimulationEnvelopeFactory.java`
- `backend/src/main/resources/db/migration/V1__init_llmops.sql`

문제:

- 사용자 프로필과 의사결정 context가 `request_payload`, 전체 LLM 결과가 `response_payload`로 저장된다.
- Life decision 데이터는 민감한 개인 상황을 포함할 수 있다.
- 현재 보존 기간, redaction, 접근 통제 정책이 코드에 드러나지 않는다.

권장 작업:

- 로그 저장 전 redaction service를 추가한다.
- 원문 저장이 필요한 필드와 집계용 필드를 분리한다.
- 원문 payload 저장을 env로 끄거나 샘플링한다.
- 보존 기간과 삭제 job을 정의한다.
- monitoring endpoint가 민감 payload를 직접 반환하지 않도록 계약을 고정한다.

검증:

- redaction 단위 테스트.
- DB 저장값에 민감 필드가 남지 않는지 통합 확인.
- monitoring/report endpoint shape 회귀 확인.

### 6. 생성 산출물 Git 추적 정리

대상:

- `.gitignore`
- `frontend/outputs/`
- `frontend/playground/outputs/`

문제:

- `.gitignore`는 outputs 계열을 runtime/generated artifact로 무시하지만, 현재 Git에는 해당 경로 파일 834개가 추적되어 있다.
- 온라인 로그, 평가 산출물, 모델 출력이 이력에 남을 수 있다.

권장 작업:

- 추적 중인 outputs 파일이 공개 저장소에 남아도 되는지 검토한다.
- 남기지 않을 파일은 `git rm --cached`로 추적 해제한다.
- 이미 원격 이력에 민감 데이터가 올라갔다면 히스토리 정리와 secret/data rotation을 별도 작업으로 잡는다.
- fixture로 유지할 데이터는 `frontend/data/` 또는 `test-fixtures/`처럼 의도를 드러내는 경로로 최소화한다.

검증:

- `git ls-files frontend/outputs frontend/playground/outputs`가 비어 있는지 확인.
- 필요한 fixture만 추적되는지 확인.

## P3: 구조 리팩토링 및 마이그레이션 완성도

### 7. `frontend/app/page.tsx` 분리

대상:

- `frontend/app/page.tsx`
- 신규 `frontend/src/components/*`
- 신규 `frontend/src/lib/api/*` 또는 유사 API client 경로

문제:

- 단일 클라이언트 컴포넌트가 2,287라인이다.
- API URL 구성, NDJSON parser, form state, progress state, 결과 카드 UI가 한 파일에 섞여 있다.

권장 작업:

- API client와 progress stream parser를 분리한다.
- form state hook, preset hook, simulation submit hook을 분리한다.
- 결과 카드와 progress card를 컴포넌트로 이동한다.
- UI 동작을 바꾸지 않는 순수 분리부터 진행한다.

검증:

- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- 백엔드 실행 후 케이스 로딩과 simulate smoke test.

### 8. 레거시 TypeScript 서버 파이프라인 정리

대상:

- `frontend/src/server/*`
- `frontend/src/lib/agent.ts`
- `frontend/src/lib/openai.ts`
- `frontend/scripts/*`
- `frontend/workers/*`

문제:

- 프론트엔드 UI는 Spring Boot API를 호출하지만, 레거시 LLM/provider/logging/worker 코드가 아직 많이 남아 있다.
- 일부 스크립트와 워커는 `frontend/src/server/*`에 의존한다.
- React+Vite 전환 전 제거/보존 기준을 명확히 하지 않으면 migration debt가 계속 커진다.

권장 작업:

- 유지할 CLI/eval script와 삭제할 runtime server code를 분류한다.
- 백엔드로 이전 완료된 기능은 TypeScript server path에서 제거한다.
- `openai` npm dependency는 실제 사용처가 없어지는 시점에 제거한다.
- 워커는 Spring Boot job, scheduler, 또는 별도 backend worker로 재설계한다.

검증:

- `rg "src/server|@/lib/agent|@/lib/openai" frontend`로 남은 의존성 확인.
- `cd frontend && npm run typecheck`
- 관련 worker/script 대체 검증.

### 9. Docker/운영 실행 경로 정리

대상:

- `frontend/Dockerfile`
- `frontend/docker-compose.yml`
- 루트 또는 신규 backend compose 설정

문제:

- 현재 프론트 Dockerfile은 development server 실행을 기본으로 한다.
- compose는 구 Next 풀스택 app과 legacy env를 전제로 한다.
- Spring Boot backend 서비스와 Codex CLI host auth 문제는 별도 설계가 필요하다.

권장 작업:

- 프론트 운영 이미지는 `next build` 후 `next start` 또는 Vite 전환 후 정적 서빙 기준으로 재작성한다.
- backend 서비스, DB, monitoring 서비스를 별도 compose/profile로 분리한다.
- 운영 secret 기본값을 제거하고 env 주입을 필수화한다.
- Codex CLI 로컬 auth를 Docker에서 어떻게 다룰지 별도 정책을 둔다.

검증:

- 개발 compose와 운영 compose를 분리 실행.
- frontend/backend health endpoint 확인.
- secret 기본값이 운영 profile에 남지 않는지 확인.

## 권장 실행 순서

1. P1-1 Codex CLI 실행 격리.
2. P1-2 `/api/simulate` 인증과 레이트리밋.
3. P1-3 request DTO와 길이/body 제한.
4. P2-4 오류 응답 마스킹.
5. P2-5 로그 redaction과 보존 정책.
6. P2-6 outputs Git 추적 정리.
7. P3-7 프론트 단일 파일 분리.
8. P3-8 레거시 TypeScript 서버 파이프라인 정리.
9. P3-9 Docker/운영 실행 경로 정리.

## 현재 확인된 검증 상태

- `cd frontend && npm run typecheck`: 통과.
- `cd frontend && npm run build`: 통과.
- `cd backend && ./mvnw test`: 통과.
- `cd frontend && npm audit --omit=dev`: npm registry audit endpoint 오류로 실패. 의존성 취약점 점검은 재시도 필요.

## 잔여 리스크

- 실제 위험도는 백엔드 노출 범위, Codex CLI 로그인/권한, 운영 secret 구성, DB 접근 통제에 의존한다.
- 문서 작성 시점에는 코드 변경을 하지 않았으므로 보안 위험은 그대로 남아 있다.
- outputs 계열 파일이 이미 원격 이력에 올라갔다면 단순 추적 해제만으로는 충분하지 않을 수 있다.
