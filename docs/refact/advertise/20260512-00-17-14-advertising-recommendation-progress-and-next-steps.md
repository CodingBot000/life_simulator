# 결과 기반 추천/광고 기능 진행 현황과 다음 작업

- 작성일: 2026-05-12 00:17:14 KST
- 대상 브랜치: `feature/add_advertise`
- 기준 커밋: `9ce0113 Animate loading state label`
- 상위 작업계획서: `docs/refact/advertise/20260511-18-42-55-advertising-recommendation-work-order.md`
- 목적: 현재까지 구현한 내용, 1차 범위 안에서 아직 남은 검증/보강, 다음 단계 작업을 Codex가 바로 이어서 처리할 수 있게 정리한다.

## 1. 현재 상태 요약

현재 1차 catalog MVP 기능 구현은 대체로 완료되어 있다.

완료된 핵심 흐름:

```text
simulation result
  -> frontend RecommendationPanel
  -> POST /api/recommendations
  -> LifeRecommendationContextMapper
  -> RecommendationContext
  -> DeterministicRecommendationIntentExtractor
  -> CatalogRecommendationProvider
  -> JsonRecommendationCatalogRepository
  -> ranked RecommendationResponse
```

현재 브랜치 상태:

- `feature/add_advertise`는 `origin/feature/add_advertise`에 push 완료된 상태다.
- 구현 커밋:
  - `16c0129 Add catalog recommendation MVP`
  - `9ce0113 Animate loading state label`
- `docs/*`는 `.gitignore`에 걸리므로 docs 변경을 커밋하려면 `git add -f`가 필요하다.

## 2. 완료된 작업

아래 내용은 구현 완료 여부를 알아볼 수 있을 정도로만 요약한다.

### 2.1 Backend recommendation core

완료:

- `backend/src/main/java/com/lifesimulator/backend/recommendation/core/`
- `RecommendationContext`, `UserContext`, `DecisionContext`, `ResultContext` 추가
- `RecommendationEngine` 추가
- `RecommendationIntentExtractor` port 추가
- `RecommendationProvider`, `RecommendationCatalogRepository`, `RecommendationEventSink` port 추가
- `RecommendationRanker`, `RecommendationSafetyPolicy` 추가
- core package가 Life Simulator simulation/engine/Spring/Jdbc/HTTP 구현에 직접 의존하지 않도록 분리

### 2.2 Life Simulator adapter

완료:

- `backend/src/main/java/com/lifesimulator/backend/recommendation/life/`
- `LifeRecommendationContextMapper` 추가
- `LifeRecommendationFieldPaths` 추가
- `case_input`, `simulation_response` 원문은 adapter까지만 들어오고, core에는 `RecommendationContext`만 전달하는 구조 구현

### 2.3 Catalog MVP

완료:

- `backend/src/main/java/com/lifesimulator/backend/recommendation/core/CatalogRecommendationProvider.java`
- `backend/src/main/java/com/lifesimulator/backend/recommendation/persistence/JsonRecommendationCatalogRepository.java`
- `backend/src/main/resources/recommendations/catalog.ko.json`
- `backend/src/main/resources/recommendations/catalog.en.json`
- JSON catalog는 향후 DB row로 전환하기 쉽도록 DB-like field schema로 작성
- catalog provider는 `RecommendationCatalogRepository` port만 의존

### 2.4 Deterministic intent extraction

완료:

- `backend/src/main/java/com/lifesimulator/backend/recommendation/intent/DeterministicRecommendationIntentExtractor.java`
- career, finance, relationship, learning, wellbeing, general decision support topic 분류
- LLM 없이 catalog MVP가 동작하도록 구현

### 2.5 Recommendation API

완료:

- `POST /api/recommendations`
- `backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationController.java`
- `RecommendationRequest`, `RecommendationResponse`, `RecommendationConfig` 추가
- backend feature flag 추가:
  - `SIMULATOR_RECOMMENDATIONS_ENABLED`
  - `SIMULATOR_RECOMMENDATIONS_DEFAULT_MAX_ITEMS`
  - `SIMULATOR_RECOMMENDATIONS_MAX_ITEMS`

### 2.6 Frontend recommendation panel

완료:

- `frontend/src/lib/api/recommendations.ts`
- `frontend/src/lib/recommendations/types.ts`
- `frontend/src/hooks/use-recommendations.ts`
- `frontend/src/components/simulation/recommendation-panel.tsx`
- `frontend/src/components/simulation/recommendation-card.tsx`
- `frontend/src/components/simulation/simulation-page.tsx`에 `ReflectionCard` 이후 추천 패널 삽입
- frontend feature flag 추가:
  - `VITE_RECOMMENDATIONS_ENABLED`

### 2.7 Tests and validation

완료:

- 추천 관련 backend tests 추가
  - `RecommendationControllerTests`
  - `RecommendationEngineTests`
  - `LifeRecommendationContextMapperTests`
  - `DeterministicRecommendationIntentExtractorTests`
  - `JsonRecommendationCatalogRepositoryTests`
  - `RecommendationArchitectureTests`
- 전체 backend test 통과
  - `cd backend && ./mvnw test`
  - 60 tests passed
- frontend typecheck 통과
  - `cd frontend && npm run typecheck`
- frontend build 통과
  - `cd frontend && npm run build`
- frontend dev server HTML 응답 확인
  - `http://localhost:5174/`

## 3. 1차 범위 수동 검증 상태

기능 구현 기준으로 catalog MVP의 핵심 경로는 완료됐다. 2026-05-12 로컬 수동 확인도 대부분 완료됐으며, 현재 남은 것은 feature flag/disabled mode 확인과 시각 QA 보류 항목이다.

### 3.1 실제 backend + frontend 통합 수동 검증

상태: 완료

확인된 것:

- backend dev server를 `18080`에서 실행
- frontend dev server를 `5175`에서 실행
- OpenAI API provider 모드로 `/api/simulate` 실제 호출
- simulation 결과 화면 렌더링 확인
- `결과 기반 추천` 패널 노출 확인
- `추천 보기` 버튼 클릭 후 `/api/recommendations` 실제 호출
- 추천 카드 표시 확인
- 추천 카드가 JSON catalog 기반으로 표시되는 것 확인

확인 중 발견된 사항:

- npm Codex CLI 설치가 깨져 `codex` provider 모드는 `ENOENT`로 실패했다.
- 임시 테스트는 `SIMULATOR_LLM_PROVIDER=openai`와 `backend/.env`의 `OPENAI_API_KEY`로 진행했다.
- 추천 카드는 표시되지만 catalog item 수가 적고 `career_change` 판별이 쉽게 일어나 같은 카드가 반복되는 문제가 확인됐다.

남은 보조 확인:

- `VITE_RECOMMENDATIONS_ENABLED=false` 상태에서 추천 패널 미노출 확인

### 3.2 API disabled mode 수동 확인

상태: 아직 안 함

남은 것:

- `SIMULATOR_RECOMMENDATIONS_ENABLED=false` 상태에서 실제 backend boot 후 `/api/recommendations` 호출 확인

권장 절차:

```sh
cd backend
SIMULATOR_RECOMMENDATIONS_ENABLED=false ./mvnw spring-boot:run
```

요청 예시:

```sh
curl -s http://localhost:8080/api/recommendations \
  -H 'content-type: application/json' \
  -d '{
    "request_id":"manual-disabled-check",
    "locale":"ko",
    "case_input":{"userProfile":{"job":"developer","risk_tolerance":"low","priority":["growth"]},"decision":{"optionA":"잔류","optionB":"이직","context":"이직 고민"}},
    "simulation_response":{"planner":{"factors":["growth"]},"advisor":{"decision":"B","reason":"성장 정체가 중요합니다"},"reflection":{"user_summary":{"suggested_actions":["검증 기준을 정하세요"]}}},
    "max_items":3,
    "enabled_providers":["catalog"]
  }' | jq
```

기대 결과:

- HTTP 200
- `items` empty
- `provider_status[0].status == "disabled"`

### 3.3 API happy path 수동 curl 확인

상태: 완료

확인된 것:

- `/api/recommendations`를 직접 호출해 catalog response가 반환되는 것 확인
- `provider_status`에 catalog ok 포함
- career context에서 catalog item 반환 확인

실제 smoke 결과 요약:

```json
{
  "request_id": "local-smoke",
  "topic": "career_change",
  "item_count": 2,
  "first_item": "커리어 전환을 위한 의사결정 노트",
  "provider_status": [
    {
      "provider": "catalog",
      "status": "ok",
      "item_count": 2
    }
  ]
}
```

### 3.4 UI 품질 확인

상태: 보류

현재 요청 기준으로는 지금 진행하지 않는다. 필요 시 다음 UI 보강 때 같이 확인한다.

아직 안 한 것:

- 모바일/데스크톱 viewport에서 추천 카드 줄바꿈 확인
- 긴 제목/설명/why 문구가 카드 밖으로 넘치지 않는지 확인
- 결과 화면에서 추천 패널 위치가 과하게 광고처럼 보이지 않는지 확인

권장 확인 기준:

- 390px mobile width
- 768px tablet width
- 1280px desktop width
- 추천 패널이 `ReflectionCard` 이후 자연스럽게 이어지는지
- `OutcomeFollowupPanel`과 시각적으로 충돌하지 않는지

### 3.5 문서와 구현의 불일치 정리

상태: 대부분 완료

완료된 것:

- 추천 카드 반복 노출 이슈를 다음 작업 우선순위에 반영
- LLM intent extractor보다 catalog 확장, deterministic 판별 개선, ranker 다양화가 먼저라는 기준으로 섹션 4와 5를 갱신
- 현재 구현 범위와 후속 단계의 구분을 명확히 정리

남은 것:

- 상위 작업계획서 `20260511-18-42-55-advertising-recommendation-work-order.md`까지 같은 기준으로 정합성 확인하려면 별도 문서 정리 작업에서 처리한다.

## 4. 다음 단계 해야 할 것

아래는 1차 범위 후속 작업이다. 2026-05-12 로컬 수동 확인 결과, 추천 카드 자체는 표시되지만 현재 catalog item 수가 적고 deterministic topic 판별이 `career_change`로 쉽게 쏠려 같은 카드가 반복되는 문제가 확인됐다.

따라서 현재 우선순위는 "LLM intent extractor를 먼저 붙이는 것"이 아니라, LLM 없이도 추천 다양성이 보이도록 catalog, deterministic 판별, ranker를 먼저 보강하는 것이다. LLM extractor는 그 다음 단계로 둔다.

## 4.1 먼저 할 일: push 또는 PR 준비

현재 상태:

- local branch `feature/add_advertise`는 origin에 push 완료
- commits:
  - `16c0129 Add catalog recommendation MVP`
  - `9ce0113 Animate loading state label`

할 일:

```sh
git status --short --branch
```

선택:

- 바로 PR을 만들지, 추가 수동 검증 후 PR을 만들지 결정한다.
- PR을 만들 경우 draft PR 권장.

PR 본문에 포함할 내용:

- `/api/recommendations` catalog MVP 추가
- recommendation core/adapter 분리
- JSON catalog repository는 향후 DB 전환을 고려한 seed 구조
- frontend result recommendation panel 추가
- 외부 provider는 아직 미구현
- validation:
  - `cd backend && ./mvnw test`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`

## 4.2 1차 MVP 안정화 작업

목표:

- catalog MVP를 실제 사용 흐름에서 안정화한다.

작업:

1. 실제 backend/frontend 통합 수동 검증을 완료한다.
2. 수동 검증 결과를 새 문서 또는 PR 본문에 기록한다.
3. 추천 패널 UX가 과하면 문구와 배치를 조정한다.
4. feature flag off 상태를 브라우저에서 확인한다.
5. 필요하면 `RecommendationPanel`에 retry/reset 상태를 보강한다.

수정 후보:

- `frontend/src/components/simulation/recommendation-panel.tsx`
- `frontend/src/components/simulation/recommendation-card.tsx`
- `frontend/src/hooks/use-recommendations.ts`

완료 조건:

- simulation 결과 생성 후 추천 보기 클릭까지 브라우저에서 확인
- frontend console error 없음
- backend log에 recommendation 관련 예외 없음
- feature flag off 시 기존 UI와 동등하게 동작

## 4.3 카탈로그 항목 확장

상태: 구현 완료

목표:

- 현재 반복 노출되는 고정 추천 느낌을 줄인다.
- topic별로 최소한의 다양성을 확보해서 LLM 없이도 이력서용 데모 품질을 만든다.

현재 관찰:

- 한국어 catalog는 topic coverage는 있지만 item 수가 매우 적다.
- `career_change`로 판별되면 아래 두 항목이 계속 노출되는 상태다.
  - `커리어 전환을 위한 의사결정 노트`
  - `6개월 커리어 검증 체크리스트`
- 이는 UI 하드코딩이 아니라 JSON catalog와 priority score/ranker 결과다.

권장 파일:

```text
backend/src/main/resources/recommendations/catalog.ko.json
backend/src/main/resources/recommendations/catalog.en.json
backend/src/test/java/com/lifesimulator/backend/recommendation/JsonRecommendationCatalogRepositoryTests.java
```

작업:

1. 한국어 catalog를 topic별 최소 4-6개 수준으로 확장한다.
2. 각 topic에 `book`, `youtube_channel`, `template`, `course`를 적절히 섞는다.
3. `general_decision_support` item을 최소 3개 이상 둔다.
4. 각 item의 `keywords`, `tags`, `eligible_topics`, `priority_score`를 실제 ranking에 쓸 수 있게 작성한다.
5. demo용 가상 상품이면 title/description/url에 가상임을 알 수 있게 하거나 내부 placeholder URL을 쓴다.
6. 실제 상품/콘텐츠 URL을 넣는 경우 광고/제휴가 아니면 `is_affiliate=false`, `sponsored=false`를 명확히 둔다.

권장 topic 최소 구성:

```text
career_change: 책, 체크리스트, 유튜브 채널, 강의/템플릿
financial_planning: 예산 템플릿, 입문서, 지출 점검 자료, 저축 계획 자료
relationship: 대화 가이드, 갈등 대화 책, 체크리스트, 채널
learning: 학습 계획 템플릿, 공부법 책, 자격증 준비 자료, 채널
wellbeing: 번아웃 회복 자료, 스트레스 관리 책, 루틴 템플릿, 채널
general_decision_support: 의사결정 책, 목표 설정 템플릿, 습관 관리 자료
```

완료 조건:

- 각 topic별 active item이 최소 4개 이상
- `JsonRecommendationCatalogRepositoryTests`에 topic별 fallback/locale 테스트 추가
- `/api/recommendations` 수동 호출 시 career 외 topic도 서로 다른 카드가 반환됨

구현 결과:

- `catalog.ko.json`은 6개 topic별 4개씩 총 24개 데모 항목으로 확장됐다.
- `catalog.en.json`은 기본 영어 fallback과 주요 topic 항목을 보강했다.
- 실제 상품/제휴 링크가 아니라 `example.com` 기반 데모 catalog로 유지했다.

## 4.4 deterministic 판별 개선

상태: 구현 완료

목표:

- 선택한 카테고리/예시/결과 텍스트가 조금만 달라도 무조건 `career_change`로 쏠리는 문제를 줄인다.
- LLM 없이도 topic confidence와 fallback이 안정적으로 동작하게 만든다.

현재 문제:

- `DeterministicRecommendationIntentExtractor`가 단순 keyword contains 방식이다.
- `성장` 같은 넓은 단어가 career topic으로 연결되어 career item이 과도하게 노출될 수 있다.
- 현재 topic만 있고 confidence/subtopic 개념이 없어 낮은 확신 상황에서도 특정 topic으로 확정된다.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/DeterministicRecommendationIntentExtractor.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationIntent.java
backend/src/test/java/com/lifesimulator/backend/recommendation/DeterministicRecommendationIntentExtractorTests.java
```

작업:

1. keyword 단일 hit보다 score 기반 판별로 바꾼다.
2. `성장`처럼 범용 단어는 단독 career 신호로 쓰지 말고 보조 점수로만 사용한다.
3. topic별 positive keyword와 weak keyword를 분리한다.
4. context source별 가중치를 둔다.
   - user decision/context
   - option labels
   - result advisor reason
   - planner factors
   - suggested actions
5. confidence가 낮으면 `general_decision_support`로 보낸다.
6. 가능하면 `RecommendationIntent`에 `confidence`, `subtopics`를 추가한다. 단, response contract 변경이 과하면 내부 ranking 용도로만 우선 둔다.

테스트 케이스:

- career: 이직, 직무, 연봉, 회사 맥락이 있는 경우
- finance: 지출, 저축, 예산, 소득 맥락이 있는 경우
- relationship: 관계/가족/친구/갈등 맥락
- learning: 공부/자격증/대학원/학습 맥락
- wellbeing: 번아웃/스트레스/건강/휴식 맥락
- generic: `성장`만 있고 커리어 맥락이 없으면 `general_decision_support`

완료 조건:

- 기존 deterministic tests 통과
- generic decision 케이스에서 career item으로 쏠리지 않음
- API 응답의 `intent.topic`이 케이스별로 분산됨

구현 결과:

- 단순 `containsAny` 방식에서 topic별 score 기반 판별로 변경했다.
- `성장` 같은 넓은 단어는 약한 신호로 낮춰 단독 career 분류를 막았다.
- finance, relationship, learning, wellbeing, general 케이스 테스트를 추가했다.

## 4.5 결과별 query 다양화와 ranker 개선

상태: 구현 완료

목표:

- 같은 topic이라도 매번 priority 높은 1-2개만 반복되지 않게 한다.
- item type 다양성과 result context 적합도를 ranking에 반영한다.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationRanker.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/CatalogRecommendationProvider.java
backend/src/test/java/com/lifesimulator/backend/recommendation/RecommendationEngineTests.java
```

작업:

1. ranker가 `priority_score`만 보지 않도록 보강한다.
2. `RecommendationIntent.queries`, `keywords`, `tags`, `item_type` 매칭 점수를 반영한다.
3. 같은 응답에서 item type이 과도하게 한쪽으로 몰리지 않게 다양성 규칙을 둔다.
4. `max_items`가 4 이상이면 book/template/channel/course가 가능한 한 섞이도록 한다.
5. 필요하면 `why` 문구를 topic 고정 문구에서 item/context 기반 문구로 조금 더 세분화한다.

완료 조건:

- 같은 topic 안에서도 입력/결과에 따라 다른 item 조합이 나온다.
- `career_change`에서도 항상 같은 두 카드만 나오지 않는다.
- ranker unit test로 priority + keyword + type diversity를 확인한다.

구현 결과:

- intent query에 context 기반 추가 query를 섞도록 개선했다.
- ranker가 priority score 외 query/title/description/tag/context match를 함께 본다.
- 상위 결과가 한 item type으로만 몰리지 않도록 type diversity ordering을 추가했다.

## 4.6 LLM intent extractor 추가

상태: 구현 완료, 기본 비활성화

목표:

- deterministic keyword matching을 유지하되, 더 정교한 추천 intent를 LLM으로 추출한다.
- 실패 시 deterministic extractor로 fallback한다.

권장 파일:

```text
backend/src/main/resources/prompts/recommendation/intent.md
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/LlmRecommendationIntentExtractor.java
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/FallbackRecommendationIntentExtractor.java
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/RecommendationIntentSchemaFactory.java
backend/src/test/java/com/lifesimulator/backend/recommendation/LlmRecommendationIntentExtractorTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/FallbackRecommendationIntentExtractorTests.java
```

설계 원칙:

- LLM prompt 입력은 `RecommendationContext`만 사용한다.
- Life Simulator field path, `SimulationResponse`, `JsonNode`를 LLM extractor에 넘기지 않는다.
- `LlmJsonClient` 실패, timeout, invalid JSON이면 deterministic fallback.
- `OPENAI_API_KEY`를 필수로 만들지 않는다.
- Codex CLI subscription auth 기본 경로를 유지한다.

출력 schema:

```json
{
  "topic": "career_change",
  "audience_context": "커리어 전환과 성장 정체를 고민하는 사용자",
  "product_types": ["book", "template", "course"],
  "queries": [
    {
      "provider": "catalog",
      "query": "이직 준비",
      "reason": "커리어 전환 기준을 점검해야 함"
    }
  ],
  "negative_filters": [],
  "safety_level": "normal"
}
```

테스트:

- 정상 JSON 응답 mapping
- invalid JSON fallback
- LLM exception fallback
- sensitive topic safety level 보존
- core architecture test 유지

완료 조건:

- deterministic-only 테스트가 계속 통과
- LLM disabled/failure에서도 `/api/recommendations` 200
- backend 전체 테스트 통과

구현 결과:

- `LlmRecommendationIntentExtractor`, `FallbackRecommendationIntentExtractor`, `RecommendationIntentSchemaFactory`를 추가했다.
- `SIMULATOR_RECOMMENDATIONS_LLM_INTENT_ENABLED=false`가 기본값이다.
- LLM extractor가 disabled이거나 실패하면 deterministic extractor로 fallback한다.
- LLM output mapping과 fallback tests를 추가했다.

진행 조건:

- 4.3 카탈로그 확장 완료
- 4.4 deterministic 판별 개선 완료
- 4.5 ranker 다양화 완료
- 위 작업 후에도 추천 품질이 부족하거나, 결과별 query 생성 다양성이 더 필요할 때 진행

## 4.7 추천 이벤트 no-op API 또는 DB 저장 준비

상태: no-op endpoint 구현 완료

현재 상태:

- `RecommendationEventSink` port와 `NoopRecommendationEventSink`는 있다.
- 하지만 public event endpoint와 DB migration은 1차 구현에서 제외했다.

다음 선택지:

### Option A: no-op event endpoint 먼저 추가

목표:

- frontend click/impression tracking API contract만 먼저 확정한다.
- DB 저장 없이 no-op으로 받는다.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationEventRequest.java
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationEventResponse.java
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationEventController.java
frontend/src/lib/api/recommendation-events.ts
```

Endpoint:

```http
POST /api/recommendation-events
```

Event types:

```text
impression
click
dismiss
```

주의:

- event 전송 실패는 UI error로 보여주지 않는다.
- 같은 result/request에서 impression 중복 전송을 막는다.

### Option B: DB migration까지 같이 추가

목표:

- recommendation event를 DB에 저장한다.

권장 파일:

```text
backend/src/main/resources/db/migration/V4__add_recommendation_events.sql
backend/src/main/java/com/lifesimulator/backend/recommendation/persistence/JdbcRecommendationEventSink.java
backend/src/test/java/com/lifesimulator/backend/recommendation/RecommendationEventControllerTests.java
```

주의:

- DB disabled 환경에서 backend boot가 깨지면 안 된다.
- 기존 feedback/outcome DB 테스트 패턴을 따른다.
- event 저장 실패는 best-effort로 처리한다.

권장:

- 먼저 Option A로 API contract를 확정한 뒤, 별도 커밋으로 Option B를 진행한다.

구현 결과:

- `POST /api/recommendation-events` no-op endpoint를 추가했다.
- event types는 `impression`, `click`, `dismiss`만 허용한다.
- frontend API helper `recordRecommendationEvent`를 추가했다.
- DB 저장은 아직 하지 않는다.

## 4.8 Naver Book provider

목표:

- 한국어 도서 실검색 provider를 추가한다.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverBookRecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverSearchClient.java
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverSearchProperties.java
backend/src/test/java/com/lifesimulator/backend/recommendation/NaverBookRecommendationProviderTests.java
```

설정:

```yaml
simulator:
  recommendations:
    naver:
      enabled: ${NAVER_RECOMMENDATIONS_ENABLED:false}
      client-id: ${NAVER_CLIENT_ID:}
      client-secret: ${NAVER_CLIENT_SECRET:}
      book-enabled: true
```

구현 기준:

- API key가 없으면 provider disabled status.
- external API failure는 전체 recommendation failure로 전파하지 않는다.
- HTML tag 제거.
- 가격/저자/출판사 등은 API 응답에 있는 경우만 표시.
- provider adapter는 `RecommendationContext`/`RecommendationIntent`만 받고 Life Simulator package를 import하지 않는다.

테스트:

- key missing -> disabled
- fake response -> normalized `RecommendationItem`
- API error -> provider status error
- backend 전체 test 통과

## 4.9 Naver Shopping provider

목표:

- 실상품 검색을 추가하되, 모든 고민에 상품을 억지로 추천하지 않는다.

권장 기준:

- career topic은 book/template/course 우선, physical product는 낮은 rank.
- finance/wellbeing sensitive topic은 광고성 상품 추천을 제한.
- Naver Shopping은 affiliate 정산 기능이 아니므로 `is_affiliate=false`.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverShoppingRecommendationProvider.java
backend/src/test/java/com/lifesimulator/backend/recommendation/NaverShoppingRecommendationProviderTests.java
```

완료 조건:

- API key 없을 때 disabled
- fake shopping response mapping
- sensitive topic filtering 유지

## 4.10 YouTube provider

목표:

- 콘텐츠 추천을 추가한다.

주의:

- YouTube `search.list`는 quota cost가 높으므로 cache 없이 매번 호출하지 않는다.
- 첫 구현은 provider disabled default.

권장 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/YoutubeRecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/ProviderResponseCache.java
backend/src/test/java/com/lifesimulator/backend/recommendation/YoutubeRecommendationProviderTests.java
```

완료 조건:

- key missing -> disabled
- cache hit/miss 테스트
- fake response mapping
- no external call in unit tests

## 4.11 Affiliate provider는 마지막에 진행

대상:

- Coupang Partners
- eBay Browse API

진행 전 조건:

- catalog MVP 안정화
- catalog 다양성/ranker 안정화
- LLM intent fallback 안정화
- Naver provider 또는 YouTube provider 중 하나 이상 안정화
- 광고/제휴 고지 UI 확정

주의:

- affiliate secret은 frontend로 절대 내려보내지 않는다.
- 구매/가격/배송 정보는 API 응답에 있는 값만 표시한다.
- 제휴 고지 문구는 provider별 정책에 맞춘다.
- 승인/API key가 없으면 provider disabled 상태가 정상 동작이어야 한다.

## 5. 다음 작업 권장 순서

Codex가 바로 이어서 작업한다면 아래 순서를 권장한다.

1. backend/frontend 실제 통합 수동 검증 보완
2. 검증 결과 문서화 또는 PR 본문 업데이트
3. 카탈로그 항목 확장
4. deterministic topic 판별 개선
5. 결과별 query 다양화와 ranker 개선
6. 필요 시 추천 패널 UX/문구 소폭 보강
7. LLM intent extractor + deterministic fallback
8. recommendation event no-op endpoint
9. Naver Book provider
10. Naver Shopping provider
11. YouTube provider with cache
12. affiliate provider 검토

우선순위 판단:

- 예전 기준에서 `LLM intent extractor + deterministic fallback`은 architecture상 안전한 다음 단계였다.
- 실제 테스트 후 현재 병목은 LLM 부재가 아니라 catalog item 수 부족, broad keyword 판별, ranker 반복 노출이다.
- 따라서 외부 API 없는 다음 개발은 `catalog 확장 -> deterministic 개선 -> ranker 다양화 -> LLM extractor` 순서가 더 낫다.

## 6. 반드시 지켜야 할 제약

- `/api/simulate` request/response shape 변경 금지
- simulation stage 실행 순서 변경 금지
- 기존 guardrail/logging/metrics/feedback/outcome side effect 변경 금지
- 추천 실패가 simulation 실패로 보이면 안 됨
- recommendation core는 Life Simulator 전용 타입과 infra 구현을 직접 import하지 않음
- JSON catalog는 repository port 뒤에 유지
- 외부 provider는 disabled/fallback 상태가 정상 경로여야 함
- frontend feature flag off 시 기존 화면과 동일하게 동작해야 함

## 7. 검증 명령

기본 검증:

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
cd frontend && npm run build
```

추천 targeted backend 검증:

```sh
cd backend
./mvnw test -Dtest=RecommendationControllerTests,RecommendationEngineTests,LifeRecommendationContextMapperTests,DeterministicRecommendationIntentExtractorTests,JsonRecommendationCatalogRepositoryTests,RecommendationArchitectureTests
```

수동 검증:

```sh
cd backend && ./mvnw spring-boot:run
cd frontend && npm run dev
```

확인 URL:

```text
http://localhost:5173
```

Vite가 다른 port를 배정하면 terminal output의 Local URL을 따른다.
