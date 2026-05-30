# 피드백/학습 데이터 확장 상세 구현안

- 작성일: 2026-05-10 16:55:16 KST
- 대상 프로젝트: `/Users/switch/Development/Web/life_simulator`
- 상위 계획: `docs/refact/20260510-16-55-15-feedback-data-expansion-plan.md`
- 목적: 사용자 피드백, 후속 결과, 상태 교정, guardrail 리뷰, 학습 데이터 후보 생성 기능을 실제 DB insert/update까지 동작하게 구현한다.

## 0. 필수 준수 사항

이 구현안은 아래 원칙을 반드시 따른다.

1. 새로운 브랜치를 만들어 작업을 시작한다.
   - 권장 브랜치명: `codex/feedback-data-expansion`
   - 문서 작성 브랜치가 이미 존재하더라도 실제 구현은 구현 전용 브랜치에서 시작한다.
2. 새 브랜치에서 작업하므로 언제든지 되돌릴 수 있다. 따라서 구현자는 이 문서의 끝까지 진행한다.
   - 큰 단계가 끝나고 검증이 통과하면 중간 커밋을 만든다.
   - 사용자가 명시적으로 중단하지 않는 한 Phase 마지막 완료 조건까지 진행한다.
3. 구현 시 파일과 코드 역할을 분리한다.
   - 신규 Java 파일은 가능한 한 250라인 이하로 작성한다.
   - 한 파일이 약 400라인을 넘으면 즉시 분리 가능성을 검토한다.
   - 어떤 파일도 600라인을 넘기지 않는다.
   - Controller, Service, Repository, DTO, Summary/Builder 역할을 한 파일에 몰아넣지 않는다.
4. 실제 동작 시 database insert와 update까지 모두 구현하고 테스트한다.
   - 기존 데이터는 모두 테스트용으로 간주한다.
   - 데이터 충돌이나 재현성 문제가 있으면 테스트 DB의 관련 테이블을 truncate하거나 재생성해도 된다.
5. 로컬 database와 remote database가 모두 존재한다면 테이블 생성, migration, 검증 데이터를 동일하게 적용한다.
   - local만 성공하고 remote를 누락한 상태로 완료 처리하지 않는다.
   - remote credential이 없으면 완료가 아니라 명시적 blocker로 기록한다.
6. 모든 구현과 검증이 완료되면 모든 작업을 커밋하고 push한다.
   - push 실패 시 원인과 재시도 방법을 기록한다.

## 1. 비범위

이번 구현에서 하지 않는다.

- `/api/simulate` 요청/응답 shape 변경
- 사용자 계정/로그인 시스템 도입
- 자동 장기 메모리 업데이트
- 오픈소스 LLM fine-tuning 직접 실행
- 운영 배포 자동화
- 결제 또는 외부 개인정보 관리 시스템 연동

이번 작업은 데이터 수집, 저장, 검증, dataset 후보 생성까지가 범위다.

## 2. 시작 절차

### 2.1 브랜치 생성

```sh
git status --short --branch
git switch main
git pull --ff-only
git switch -c codex/feedback-data-expansion
```

주의:

- 이미 작업 중인 변경이 있으면 되돌리지 않는다.
- 사용자 변경이 있는 파일은 stage하지 않는다.
- 브랜치 생성 후 작업하므로 문제가 생기면 브랜치 단위로 폐기하거나 이전 커밋으로 돌아갈 수 있다.

### 2.2 기준 검증

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
cd frontend && npm run build
```

DB 테스트 기준:

```sh
cd backend
BACKEND_DATABASE_ENABLED=true ./mvnw test
```

현재 환경에 DB가 없으면 로컬 Postgres를 준비한 뒤 진행한다.

## 3. 목표 패키지 구조

백엔드는 engine 의미론과 app adapter를 분리한다. 평가/학습 데이터의 의미 해석은 engine에 둔다. HTTP endpoint, DB insert/update, session/header 처리는 app adapter에 둔다.

### 3.1 Engine 공통 평가/학습 패키지

아래 패키지는 Life Simulator UI에 직접 의존하지 않는 공통 엔진 계층이다.

```text
backend/src/main/java/com/lifesimulator/backend/engine/
  evaluation/
    DecisionEvaluationTarget.java
    FeedbackSignal.java
    OutcomeLabel.java
    GuardrailReviewLabel.java
    EvaluationEvent.java
    EvaluationLabelSet.java
  learning/
    DatasetCandidate.java
    DatasetCandidateBuildInput.java
    DatasetCandidateBuilder.java
    DatasetCandidateType.java
    DatasetCandidateStatus.java
  domain/
    life/
      evaluation/
        LifeEvaluationTargetMapper.java
        LifeFeedbackLabelMapper.java
```

역할:

- `DecisionEvaluationTarget`: reasoning/advisor/guardrail/reflection 같은 평가 대상 공통 enum
- `FeedbackSignal`: helpful, agree, would_choose, missing_context 등 공통 피드백 신호
- `OutcomeLabel`: actual choice, satisfaction, regret, unexpected factors를 담는 공통 결과 라벨
- `GuardrailReviewLabel`: good, over, missing, unknown 등 guardrail 리뷰 라벨
- `EvaluationEvent`: request_id와 target/signal/rating/comment를 묶은 engine 입력 모델
- `DatasetCandidateBuilder`: 로그, 피드백, 후속 결과, 리뷰를 받아 candidate를 생성하는 순수 엔진 규칙
- `LifeEvaluationTargetMapper`: Life 응답의 A/B reasoning, advisor, guardrail 필드를 공통 target으로 매핑

주의:

- engine 패키지는 JdbcTemplate, Controller, HttpServletRequest, Spring MVC annotation에 의존하지 않는다.
- engine builder는 DB row를 직접 읽지 않는다. app service가 필요한 payload를 모아 `DatasetCandidateBuildInput`으로 넘긴다.
- Life 전용 field path는 `engine/domain/life/evaluation` 밖으로 새지 않게 한다.

### 3.2 App adapter 패키지

아래 패키지는 현재 Spring Boot 앱의 API/DB adapter다.

```text
backend/src/main/java/com/lifesimulator/backend/
  feedback/
    FeedbackController.java
    FeedbackService.java
    FeedbackRepository.java
    FeedbackRequest.java
    FeedbackResponse.java
    FeedbackSummaryService.java
  outcome/
    OutcomeFollowupController.java
    OutcomeFollowupService.java
    OutcomeFollowupRepository.java
    OutcomeFollowupRequest.java
    OutcomeFollowupResponse.java
  correction/
    StateCorrectionController.java
    StateCorrectionService.java
    StateCorrectionRepository.java
    StateCorrectionRequest.java
  review/
    GuardrailReviewController.java
    GuardrailReviewService.java
    GuardrailReviewRepository.java
    GuardrailReviewRequest.java
  learning/
    DatasetCandidateController.java
    DatasetCandidateService.java
    DatasetCandidateRepository.java
```

역할:

- Controller: HTTP request/response 처리
- Service: request_id 존재 확인, session/trace 연결, engine model 호출, repository orchestration
- Repository: DB insert/update/select만 담당
- app `learning` 패키지: `engine/learning/DatasetCandidateBuilder`를 호출하고 결과를 DB에 저장

프론트엔드는 아래 구조를 권장한다.

```text
frontend/src/lib/api/
  feedback.ts
  outcome-followups.ts
  learning.ts

frontend/src/components/simulation/
  feedback-controls.tsx
  outcome-followup-panel.tsx
```

한 파일에 여러 큰 컴포넌트를 몰아넣지 않는다. 카드 내부 UI가 커지면 별도 컴포넌트로 분리한다.

### 3.3 Engine contract 구현 세부 지침

`DecisionEvaluationTarget` 권장 값:

```java
public enum DecisionEvaluationTarget {
  REASONING_A,
  REASONING_B,
  COMPARISON,
  FINAL_SELECTION,
  ADVISOR,
  GUARDRAIL,
  REFLECTION
}
```

`FeedbackSignal` 권장 값:

```java
public enum FeedbackSignal {
  HELPFUL,
  NOT_HELPFUL,
  AGREE,
  DISAGREE,
  WOULD_CHOOSE,
  MISSING_CONTEXT
}
```

`DatasetCandidateType` 권장 값:

```java
public enum DatasetCandidateType {
  ADVISOR_PREFERENCE,
  REASONING_PREFERENCE,
  GUARDRAIL_LABEL,
  STATE_CORRECTION,
  OUTCOME_SUPERVISION
}
```

`GuardrailReviewLabel` 권장 값:

```java
public enum GuardrailReviewLabel {
  GOOD,
  OVER,
  MISSING,
  UNKNOWN
}
```

이 enum들은 DB에는 lower snake case 문자열로 저장하되, Java 내부에서는 enum으로 다룬다. 문자열 변환은 adapter 또는 작은 mapper에 둔다.

## 4. DB Migration

### 4.1 신규 migration 파일

파일:

```text
backend/src/main/resources/db/migration/V3__add_feedback_learning_tables.sql
```

### 4.2 `life_simul_user_feedback`

목적: 결과 카드별 사용자 피드백 저장.

필드:

```sql
CREATE TABLE IF NOT EXISTS life_simul_user_feedback (
  id BIGSERIAL PRIMARY KEY,
  feedback_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  target_type TEXT NOT NULL,
  target_option TEXT,
  feedback_signal TEXT NOT NULL,
  rating INTEGER,
  reason_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

권장 index:

- `request_id`
- `session_id`
- `(target_type, feedback_signal)`
- `created_at DESC`

### 4.3 `life_simul_outcome_followups`

목적: 실제 선택과 후속 만족/후회 결과 저장.

```sql
CREATE TABLE IF NOT EXISTS life_simul_outcome_followups (
  id BIGSERIAL PRIMARY KEY,
  followup_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  actual_choice TEXT NOT NULL,
  satisfaction_score INTEGER,
  regret_score INTEGER,
  outcome_note TEXT,
  unexpected_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  horizon_days INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 `life_simul_state_corrections`

목적: state loader 결과에 대한 사용자 교정 저장.

```sql
CREATE TABLE IF NOT EXISTS life_simul_state_corrections (
  id BIGSERIAL PRIMARY KEY,
  correction_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  field_path TEXT NOT NULL,
  original_value JSONB,
  corrected_value JSONB NOT NULL,
  correction_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.5 `life_simul_guardrail_reviews`

목적: guardrail 판단에 대한 사람/운영자 리뷰 저장.

```sql
CREATE TABLE IF NOT EXISTS life_simul_guardrail_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  reviewer_type TEXT NOT NULL,
  review_label TEXT NOT NULL,
  correct_mode TEXT,
  reason_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.6 `life_simul_dataset_candidates`

목적: 원본 로그와 피드백을 결합해 학습/평가 데이터 후보 저장.

```sql
CREATE TABLE IF NOT EXISTS life_simul_dataset_candidates (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  candidate_type TEXT NOT NULL,
  source TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  expected_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  label_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.7 Local/Remote DB 적용

로컬:

```sh
cd backend
BACKEND_DATABASE_ENABLED=true \
BACKEND_DATABASE_URL=jdbc:postgresql://localhost:5432/life_simulator_dev \
BACKEND_DATABASE_USERNAME=life_sim_user \
BACKEND_DATABASE_PASSWORD=life_sim_password \
./mvnw test
```

remote:

```sh
cd backend
BACKEND_DATABASE_ENABLED=true \
BACKEND_DATABASE_URL="$REMOTE_BACKEND_DATABASE_URL" \
BACKEND_DATABASE_USERNAME="$REMOTE_BACKEND_DATABASE_USERNAME" \
BACKEND_DATABASE_PASSWORD="$REMOTE_BACKEND_DATABASE_PASSWORD" \
./mvnw test
```

remote credential이 없다면 구현을 완료로 처리하지 말고 blocker로 남긴다.

커밋 포인트:

```sh
git add backend/src/main/resources/db/migration/V3__add_feedback_learning_tables.sql
git commit -m "db: add feedback learning tables"
```

## 5. 백엔드 구현

### 5.1 공통 검증 규칙

DTO 검증:

- `request_id`는 필수
- `target_type`, `feedback_signal`, `actual_choice`, `review_label` 등 enum성 문자열은 engine enum 변환으로 검증
- `rating`, `satisfaction_score`, `regret_score`는 1~5 범위
- `comment`는 최대 2000자
- `reason_tags`는 문자열 배열
- `metadata`는 object

request_id 존재 확인:

- strict하게 FK를 걸면 테스트/부분 로그 상황에서 불편할 수 있으므로 DB FK는 걸지 않는다.
- Service에서 `life_simul_request_logs` 존재 여부를 확인하고, 없으면 404 또는 `unknown_request` 오류를 반환한다.

### 5.2 Engine evaluation/learning 구현

먼저 DB/API 없이 engine 단위 모델과 테스트를 구현한다.

대상 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/evaluation/*`
- `backend/src/main/java/com/lifesimulator/backend/engine/learning/*`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/evaluation/*`
- `backend/src/test/java/com/lifesimulator/backend/engine/evaluation/*`
- `backend/src/test/java/com/lifesimulator/backend/engine/learning/*`

구현 규칙:

- `DatasetCandidateBuilder`는 Spring component로 만들 수 있지만 DB에는 의존하지 않는다.
- 입력은 `DatasetCandidateBuildInput` record 하나로 받는다.
- `DatasetCandidateBuildInput`에는 request payload, response payload, feedback events, outcome labels, state corrections, guardrail reviews를 포함한다.
- builder 결과는 `List<DatasetCandidate>`다.
- `DatasetCandidate`는 DB entity가 아니라 engine output model이다.
- app repository가 이 model을 JSONB row로 변환한다.

Life 매핑 테스트:

- reasoning A/B가 각각 `REASONING_A`, `REASONING_B`로 매핑되는지 확인한다.
- advisor는 `ADVISOR`, guardrail은 `GUARDRAIL`로 매핑한다.
- Life option A/B가 engine option id A/B로 유지되는지 확인한다.

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/engine/evaluation \
        backend/src/main/java/com/lifesimulator/backend/engine/learning \
        backend/src/main/java/com/lifesimulator/backend/engine/domain/life/evaluation \
        backend/src/test/java/com/lifesimulator/backend/engine
git commit -m "feat: add engine evaluation learning contracts"
```

### 5.3 Feedback API

엔드포인트:

```http
POST /api/feedback
PUT /api/feedback/{feedbackId}
GET /api/feedback/summary?requestId=...
```

요청 예시:

```json
{
  "requestId": "request-id",
  "targetType": "advisor",
  "targetOption": "A",
  "feedbackSignal": "agree",
  "rating": 5,
  "reasonTags": ["clear_reasoning", "fits_priority"],
  "comment": "추천 근거가 내 상황과 잘 맞았다.",
  "metadata": {
    "uiLocale": "ko"
  }
}
```

응답 예시:

```json
{
  "feedbackId": "fb_...",
  "requestId": "request-id",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Repository는 insert와 update를 모두 구현한다.

Service 구현 규칙:

- request DTO의 `targetType`, `feedbackSignal`은 engine enum으로 변환한다.
- 변환 실패는 400으로 응답한다.
- 변환된 enum으로 `EvaluationEvent`를 만들고, repository에는 DB 저장용 row만 넘긴다.
- Repository가 engine 의미론을 판단하지 않는다.

### 5.4 Outcome Followup API

엔드포인트:

```http
POST /api/outcome-followups
PUT /api/outcome-followups/{followupId}
```

요청 예시:

```json
{
  "requestId": "request-id",
  "actualChoice": "A",
  "satisfactionScore": 4,
  "regretScore": 2,
  "outcomeNote": "실제로 A를 선택했고 안정성은 좋았지만 성장 고민은 남았다.",
  "unexpectedFactors": ["role_scope", "manager_support"],
  "horizonDays": 30
}
```

Outcome followup service는 `OutcomeLabel` engine model을 만든 뒤 repository에 저장한다.

### 5.5 State Correction API

엔드포인트:

```http
POST /api/state-corrections
```

요청 예시:

```json
{
  "requestId": "request-id",
  "fieldPath": "stateContext.user_state.situational_state.financial_pressure",
  "originalValue": "medium",
  "correctedValue": "high",
  "correctionType": "overlooked_constraint",
  "comment": "실제로는 고정비 부담이 더 크다."
}
```

State correction은 Life state path가 포함되므로, Life 전용 path 검증은 `LifeFeedbackLabelMapper` 또는 별도 life evaluation mapper에 둔다. app service는 mapper 호출과 persistence만 담당한다.

### 5.6 Guardrail Review API

엔드포인트:

```http
POST /api/guardrail-reviews
```

요청 예시:

```json
{
  "requestId": "request-id",
  "reviewerType": "user",
  "reviewLabel": "over",
  "correctMode": "normal",
  "reasonTags": ["too_conservative"],
  "comment": "blocked까지 갈 필요는 없었다."
}
```

Guardrail review service는 `GuardrailReviewLabel` engine enum으로 검증하고 저장한다.

### 5.7 Dataset Candidate Persistence

엔드포인트:

```http
POST /api/learning/dataset-candidates/build
GET /api/learning/dataset-candidates?status=candidate
```

App `DatasetCandidateService`는 아래 데이터를 repository에서 조회해 `DatasetCandidateBuildInput`을 만든다.

- `life_simul_request_logs.request_payload`
- `life_simul_request_logs.response_payload`
- stage별 `life_simul_stage_logs.response_payload`
- `life_simul_user_feedback`
- `life_simul_outcome_followups`
- `life_simul_state_corrections`
- `life_simul_guardrail_reviews`

`engine/learning/DatasetCandidateBuilder`가 반환하는 candidate type:

- `advisor_preference`
- `reasoning_preference`
- `guardrail_label`
- `state_correction`
- `outcome_supervision`

engine builder 생성 규칙:

- advisor 동의 + 실제 선택 일치: 높은 품질의 `advisor_preference`
- advisor 비동의 + 실제 선택 불일치: negative preference 후보
- guardrail review가 `over` 또는 `missing`: `guardrail_label`
- state correction 존재: `state_correction`
- 30일 이상 후속 결과 존재: `outcome_supervision`

동일 `request_id`와 `candidate_type`은 update 또는 no-op으로 처리해 중복 생성을 막는다.

Repository 규칙:

- `DatasetCandidate` engine model을 받아 `life_simul_dataset_candidates`에 insert/update한다.
- DB row status는 `candidate`, `accepted`, `rejected`, `exported`만 허용한다.
- app repository는 candidate 생성 판단을 하지 않는다.

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/feedback \
        backend/src/main/java/com/lifesimulator/backend/outcome \
        backend/src/main/java/com/lifesimulator/backend/correction \
        backend/src/main/java/com/lifesimulator/backend/review \
        backend/src/main/java/com/lifesimulator/backend/learning \
        backend/src/test
git commit -m "feat: collect feedback learning data"
```

## 6. 프론트엔드 구현

### 6.1 API 클라이언트

파일:

- `frontend/src/lib/api/feedback.ts`
- `frontend/src/lib/api/outcome-followups.ts`
- `frontend/src/lib/api/learning.ts`

역할:

- backend endpoint 호출
- `getSimulatorSessionId()`로 session 연결
- 실패 시 throw하되 결과 화면 자체를 무너뜨리지 않도록 호출부에서 처리

### 6.2 Feedback Controls

파일:

- `frontend/src/components/simulation/feedback-controls.tsx`

역할:

- 카드별 버튼 UI 제공
- 도움됨/도움 안 됨
- 동의/비동의
- 실제 선택 의향 A/B/보류
- reason tag 선택
- optional comment

주의:

- 큰 카드 파일에 피드백 상태 로직을 직접 넣지 않는다.
- `AdvisorCard`, `ReasoningCard`, `GuardrailCard`에는 작은 prop과 컴포넌트 삽입만 한다.

### 6.3 Outcome Followup Panel

파일:

- `frontend/src/components/simulation/outcome-followup-panel.tsx`

역할:

- 실제 선택
- 만족도
- 후회 정도
- 예상 밖 요인
- 결과 메모
- 저장/수정

이 패널은 기존 `FollowupReevaluationPanel`과 역할이 다르다.

- `FollowupReevaluationPanel`: 추가 조건을 넣고 시뮬레이션 재실행
- `OutcomeFollowupPanel`: 시간이 지난 뒤 실제 결과 저장

### 6.4 UI 삽입 지점

파일:

- `frontend/src/components/simulation/simulation-page.tsx`
- `frontend/src/components/simulation/risk-reasoning-cards.tsx`
- `frontend/src/components/simulation/decision-safety-cards.tsx`

삽입:

- `ReasoningCard` 내부 A/B lens별 피드백
- `AdvisorCard` 아래 최종 추천 피드백
- `GuardrailCard` 아래 guardrail 리뷰 피드백
- 결과 전체 하단에 `OutcomeFollowupPanel`

커밋 포인트:

```sh
git add frontend/src/lib/api/feedback.ts \
        frontend/src/lib/api/outcome-followups.ts \
        frontend/src/components/simulation
git commit -m "feat: add simulation feedback controls"
```

## 7. 테스트 계획

### 7.1 Backend unit/integration tests

추가 테스트:

- `FeedbackControllerTests`
- `OutcomeFollowupControllerTests`
- `StateCorrectionControllerTests`
- `GuardrailReviewControllerTests`
- `DatasetCandidateControllerTests`
- `FeedbackRepositoryIntegrationTests`

검증 항목:

- POST insert 성공
- PUT update 성공
- unknown request_id 실패
- invalid enum 실패
- rating range 실패
- dataset candidate build 성공
- 중복 build idempotent 처리

명령:

```sh
cd backend && ./mvnw test
```

DB integration 검증:

```sh
cd backend
BACKEND_DATABASE_ENABLED=true ./mvnw test
```

### 7.2 Frontend validation

명령:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

UI 수동 확인:

1. backend를 DB enabled + mock provider로 실행한다.
2. frontend dev server를 실행한다.
3. 시뮬레이션을 한 번 실행한다.
4. reasoning A/B와 advisor에 피드백을 제출한다.
5. 후속 결과를 저장한다.
6. DB에서 insert 확인한다.
7. 같은 피드백을 수정해 update 확인한다.
8. dataset candidate build API를 호출한다.
9. DB에서 candidate 생성 확인한다.

### 7.3 DB 직접 검증 SQL

테스트 데이터 초기화가 필요하면 관련 테이블만 truncate한다.

```sql
TRUNCATE TABLE
  life_simul_user_feedback,
  life_simul_outcome_followups,
  life_simul_state_corrections,
  life_simul_guardrail_reviews,
  life_simul_dataset_candidates
RESTART IDENTITY;
```

insert 확인:

```sql
SELECT request_id, target_type, feedback_signal, rating, created_at
FROM life_simul_user_feedback
ORDER BY created_at DESC
LIMIT 10;
```

update 확인:

```sql
SELECT feedback_id, rating, comment, updated_at
FROM life_simul_user_feedback
ORDER BY updated_at DESC
LIMIT 10;
```

candidate 확인:

```sql
SELECT request_id, candidate_type, source, status, created_at
FROM life_simul_dataset_candidates
ORDER BY created_at DESC
LIMIT 10;
```

## 8. Local/Remote DB 동기화 절차

로컬과 remote DB가 모두 있다면 아래를 둘 다 수행한다.

1. migration 적용
2. 신규 테이블 존재 확인
3. 시뮬레이션 로그 생성
4. feedback insert/update
5. outcome insert/update
6. candidate build
7. count와 최신 row 확인

remote DB에 테스트 데이터를 넣어도 된다는 전제가 명확하지 않으면 `metadata.test_run=true`를 붙이고, 검증 후 신규 피드백 관련 테이블만 정리한다.

기존 request/stage log는 테스트용이라 하더라도 무차별 삭제하지 않는다. 삭제가 필요하면 사용자에게 목적을 밝히고 피드백 확장 테이블 위주로 정리한다.

## 9. 완료 전 점검표

- 새 구현 브랜치에서 작업했다.
- 신규 migration이 local DB에 적용됐다.
- remote DB가 있다면 동일 migration이 적용됐다.
- feedback POST insert가 성공했다.
- feedback PUT update가 성공했다.
- outcome POST insert가 성공했다.
- outcome PUT update가 성공했다.
- state correction insert가 성공했다.
- guardrail review insert가 성공했다.
- dataset candidate build가 성공했다.
- backend test가 통과했다.
- frontend typecheck가 통과했다.
- frontend build가 통과했다.
- 신규 파일이 역할별로 분리되어 있고 600라인 초과 파일이 없다.
- 기존 `/api/simulate` 응답 shape가 깨지지 않았다.
- 불필요하게 기존 테스트 데이터를 삭제하지 않았다.
- 필요한 중간 커밋을 만들었다.
- 최종 커밋을 만들고 push했다.

## 10. 최종 커밋과 push

최종 검증 후:

```sh
git status --short
git add <작업 파일>
git commit -m "feat: add feedback learning data loop"
git push -u origin codex/feedback-data-expansion
```

최종 보고에 반드시 포함한다.

- 변경 파일 목록
- local DB 검증 결과
- remote DB 검증 결과 또는 blocker
- 실행한 테스트 명령
- insert/update 확인 결과
- dataset candidate 생성 결과
- 커밋 해시
- push된 branch
