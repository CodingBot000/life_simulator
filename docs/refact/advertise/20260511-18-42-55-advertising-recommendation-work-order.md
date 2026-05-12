# 결과 기반 추천/광고 기능 구현 작업계획서

- 작성일: 2026-05-11 18:42:55 KST
- 대상 프로젝트: `/Users/switch/Development/Web/life_simulator`
- 목적: Life Simulator의 결과를 기반으로 사용자에게 책, 유튜브 채널, 코스, 생산성 도구, 생활 상품 등을 추천하는 테스트 버전 수준의 인앱 광고/어필리에이트 확장 기능을 구현한다.
- 핵심 원칙: 추천 기능은 `/api/simulate`의 의사결정 결과 품질과 실행 경로를 흔들지 않도록 별도 API와 별도 UI 카드로 붙인다.
- 모듈화 원칙: 추천 core는 Life Simulator의 `SimulationResponse`, 판별엔진, Spring MVC, DB 구현, 외부 API client 구현을 직접 알지 않는다. Life Simulator 전용 응답은 adapter에서 `RecommendationContext`로 변환한 뒤 추천 core에 넘긴다.

## 0. 구현 목표

이번 작업의 목표는 실제 프로덕트 수준의 광고 플랫폼이 아니라, 이력서와 포트폴리오에서 아래 역량을 명확히 보여줄 수 있는 기능 확장이다.

1. 시뮬레이션 결과를 구조화된 추천 intent로 변환한다.
2. intent를 기반으로 내부 카탈로그와 외부 검색 API에서 후보 상품/콘텐츠를 조회한다.
3. 조회 결과를 공통 `RecommendationItem` 모델로 정규화한다.
4. 광고/제휴 고지를 포함한 추천 카드 UI를 결과 화면에 표시한다.
5. 외부 API 키가 없거나 실패해도 내부 카탈로그 fallback으로 데모가 동작한다.
6. 추천 기능만 별도 서버나 다른 백엔드로 옮길 수 있도록 core contract와 adapter 구현을 분리한다.

## 1. 비범위

이번 구현에서 하지 않는다.

- `/api/simulate` 요청/응답 shape 변경
- 기존 simulation stage 목록에 `advertising` 또는 `recommendation` stage 추가
- `SimulationService`, `StageExecutionService`, `DecisionEngine`, guardrail, reflection, feedback 학습 경로 변경
- 추천 core에서 `com.lifesimulator.backend.simulation`, `com.lifesimulator.backend.engine`, `com.lifesimulator.backend.api` 패키지 직접 import
- 추천 core에서 Spring MVC annotation, `JdbcTemplate`, HTTP client, filesystem resource loader 직접 사용
- 결제, 구매, 장바구니, 주문 추적 기능
- 사용자 계정 기반 장기 프로파일링
- 개인화 광고 네트워크 연동
- OpenAI API 키 필수화
- Amazon Product Advertising API 직접 연동
- 외부 API 결과를 DB에 장기 저장하는 운영형 상품 DB 구축

Amazon은 2026-05-11 기준 Product Advertising API 문서에서 PA-API가 2026-05-15 deprecated 예정이고 신규 고객은 Creators API 온보딩을 안내하고 있으므로 MVP 대상에서 제외한다.

## 2. 권장 구현 순서

반드시 아래 순서대로 진행한다.

1. 내부 카탈로그 기반 추천 MVP
2. LLM intent extractor 추가
3. Naver Book/Search provider 추가
4. Naver Shopping provider 추가
5. YouTube provider 추가
6. Coupang Partners 또는 eBay affiliate provider를 선택적으로 추가
7. 추천 노출/클릭 이벤트 수집

이 순서를 지켜야 API 키 없이도 데모가 먼저 완성되고, 외부 API/어필리에이트 승인이 없어도 기능 설명이 가능하다.

### 2.1 1차 구현 범위

이 문서는 Phase 1-8까지의 전체 확장 방향을 담고 있지만, 첫 개발 라운드에서는 아래 MVP vertical slice까지만 한 번에 구현한다.

1. 추천 core contract와 architecture test
2. `LifeRecommendationContextMapper`
3. DB 전환을 고려한 JSON catalog schema
4. `RecommendationCatalogRepository` interface
5. `JsonRecommendationCatalogRepository`
6. catalog provider
7. `/api/recommendations`
8. frontend recommendation panel
9. backend/frontend feature flag
10. backend test, frontend typecheck, frontend build 검증

1차 구현에서 하지 않는다.

- Naver Book provider
- Naver Shopping provider
- YouTube provider
- Coupang Partners/eBay affiliate provider
- recommendation event DB migration/save
- external provider cache
- 관리자 화면

이유:

- 기존 서비스가 현재 정상 동작 중이므로, 외부 API key, quota, 제휴 승인, DB migration 같은 변수를 첫 MVP에 묶지 않는다.
- catalog MVP만으로도 추천 기능의 product direction, module boundary, UI 확장을 보여줄 수 있다.
- 외부 provider와 이벤트 저장은 core contract가 안정된 뒤 별도 커밋으로 추가한다.

### 2.2 1차 구현 커밋 단위

첫 개발 라운드는 아래 순서로 커밋한다.

1. `recommendation core contract and architecture tests`
2. `life recommendation context mapper`
3. `json catalog repository and catalog provider`
4. `recommendation API`
5. `frontend recommendation panel behind feature flag`
6. `validation fixes`

각 커밋 전후 최소 검증:

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
```

UI 변경이 포함된 커밋은 추가로 실행한다.

```sh
cd frontend && npm run build
```

중간 커밋은 기능을 잘게 쪼개기 위한 것이며, 사용자 변경이나 untracked 파일을 함께 stage하지 않는다.

## 3. 시작 절차

### 3.1 브랜치 생성

```sh
git status --short --branch
git switch main
git pull --ff-only
git switch -c codex/result-based-ad-recommendations
```

주의:

- 이미 작업 중인 변경이 있으면 되돌리지 않는다.
- 사용자 변경이 있는 파일은 stage하지 않는다.
- 구현 중간에 외부 API 키가 없어도 내부 카탈로그 fallback까지는 완료한다.

### 3.2 기준 검증

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
cd frontend && npm run build
```

현재 `frontend/package.json`에는 lint script가 없으므로 lint 명령을 새로 만들지 않는다.

### 3.3 기존 동작 보호 원칙

현재 기존 소스가 정상 동작하고 있으므로 아래 원칙을 구현 중 반드시 지킨다.

- `/api/simulate` controller, response schema, streaming NDJSON event shape는 수정하지 않는다.
- 기존 simulation stage 실행 순서와 fallback/guardrail/logging/metrics side effect는 건드리지 않는다.
- 추천 API 실패, timeout, provider 장애, LLM intent 실패는 simulation 결과 화면을 실패 상태로 만들지 않는다.
- 프론트엔드에서는 recommendation panel을 결과 화면의 부가 영역으로 추가하되 기존 카드 렌더링 조건을 바꾸지 않는다.
- MVP에서는 추천 조회를 사용자 액션 또는 lazy side request로 처리한다. `/api/simulate` 완료를 기다리는 핵심 path에 추천 조회를 끼우지 않는다.
- 새 설정값은 기본값과 fallback을 둔다. API key가 없어도 backend boot와 기존 테스트가 깨지면 안 된다.
- 추천 기능을 끄는 backend/frontend feature flag를 둔다.

권장 feature flag:

```yaml
simulator:
  recommendations:
    enabled: true
```

```text
VITE_RECOMMENDATIONS_ENABLED=true
```

운영 안정성을 우선해야 하는 환경에서는 두 값을 `false`로 두면 기존 앱처럼 동작해야 한다.

## 4. 최종 아키텍처

### 4.1 요청 흐름

```text
사용자 입력 제출
  -> POST /api/simulate
  -> SimulationResponse 렌더링
  -> 사용자가 "추천 보기" 클릭 또는 feature flag로 허용된 lazy side request
  -> POST /api/recommendations
  -> LifeRecommendationContextMapper
  -> RecommendationContext
  -> LLM intent extraction
  -> provider search
  -> rank/filter/normalize
  -> RecommendationPanel 표시
```

추천 API는 시뮬레이션 완료 후 별도로 호출한다. 추천 실패가 의사결정 결과 실패로 보이면 안 된다.

### 4.2 모듈 경계와 의존성 규칙

추천 기능은 아래 4개 층으로 나눈다.

```text
Life Simulator UI/API
  -> LifeRecommendationContextMapper
  -> RecommendationEngine core
  -> provider/catalog/event adapters
```

역할:

- Life adapter: Life Simulator의 `case_input`, `simulation_response`를 최소 추천 입력 계약인 `RecommendationContext`로 변환한다.
- Recommendation core: context, intent, ranking, safety, disclosure, provider orchestration만 담당한다.
- Provider adapter: Naver, YouTube, Coupang, eBay 같은 외부 API와 HTTP/auth/detail mapping을 담당한다.
- Persistence adapter: JSON catalog, 향후 JDBC catalog, event repository를 담당한다.

의존성 규칙:

```text
recommendation/core
  -> Java standard library
  -> recommendation core model/interface only

recommendation/life
  -> recommendation/core
  -> Life Simulator JSON field mapping

recommendation/provider
  -> recommendation/core
  -> HTTP client / provider DTO / auth signer

recommendation/persistence
  -> recommendation/core
  -> JSON resource loader or JdbcTemplate

recommendation/api
  -> recommendation/core
  -> recommendation/life
  -> Spring MVC request/response
```

금지:

- `RecommendationEngine` 또는 ranker가 `SimulationResponse`, `StateContext`, `AdvisorResult` 같은 Life 전용 타입을 받는 것
- core가 `JsonNode.at("/advisor/reason")`처럼 Life response path를 직접 읽는 것
- core가 Spring `@Service`, `@RestController`, `JdbcTemplate`, HTTP client에 의존하는 것
- provider adapter가 simulation package를 import하는 것

허용:

- `RecommendationController`가 HTTP request 원문을 받아 `LifeRecommendationContextMapper`를 호출하는 것
- `LifeRecommendationContextMapper`가 `JsonNode`에서 필요한 Life field를 읽어 `RecommendationContext`를 만드는 것
- JSON catalog repository가 DB-like JSON row를 읽어 core model로 변환하는 것

최소 core 입력 계약:

```java
public record RecommendationContext(
  String requestId,
  String locale,
  UserContext user,
  DecisionContext decision,
  ResultContext result,
  List<String> allowedProviderNames,
  int maxItems
) {}
```

예시 JSON 표현:

```json
{
  "request_id": "simulation-request-id",
  "locale": "ko",
  "user": {
    "job": "developer",
    "priorities": ["stability", "growth"],
    "risk_tolerance": "low"
  },
  "decision": {
    "topic_text": "이직과 성장 정체를 고민 중입니다",
    "option_labels": ["잔류", "이직"],
    "selected_option": "B"
  },
  "result": {
    "advisor_reason": "성장 정체와 안정성 사이의 균형이 중요합니다.",
    "planner_factors": ["stability", "growth", "income"],
    "suggested_actions": ["6개월 검증 기준을 정하세요"],
    "risk_level": "medium"
  },
  "allowed_provider_names": ["catalog"],
  "max_items": 3
}
```

다른 백엔드로 추천 모듈을 옮길 때는 해당 백엔드의 결과를 이 `RecommendationContext`로 매핑하는 adapter만 새로 작성한다.

### 4.3 Backend 패키지 구조

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/
  api/
    RecommendationController.java
    RecommendationRequest.java
    RecommendationResponse.java
    RecommendationEventRequest.java
    RecommendationEventResponse.java
  core/
    RecommendationEngine.java
    RecommendationContext.java
    RecommendationIntent.java
    RecommendationItem.java
    RecommendationDisclosure.java
    RecommendationProvider.java
    RecommendationProviderResult.java
    RecommendationQuery.java
    RecommendationRanker.java
    RecommendationSafetyPolicy.java
    RecommendationCatalogRepository.java
    RecommendationEventSink.java
  life/
    LifeRecommendationContextMapper.java
    LifeRecommendationFieldPaths.java
  intent/
    RecommendationIntentExtractor.java
    LlmRecommendationIntentExtractor.java
    DeterministicRecommendationIntentExtractor.java
    RecommendationIntentSchemaFactory.java
  provider/
    NaverBookRecommendationProvider.java
    NaverShoppingRecommendationProvider.java
    YoutubeRecommendationProvider.java
    CoupangPartnersRecommendationProvider.java
    EbayBrowseRecommendationProvider.java
  persistence/
    JsonRecommendationCatalogRepository.java
    JdbcRecommendationCatalogRepository.java
    NoopRecommendationEventSink.java
    JdbcRecommendationEventSink.java

backend/src/main/resources/prompts/recommendation/
  intent.md

backend/src/main/resources/recommendations/
  catalog.ko.json
  catalog.en.json
```

처음 구현은 `RecommendationEngine`, `LifeRecommendationContextMapper`, `JsonRecommendationCatalogRepository`, `DeterministicRecommendationIntentExtractor`, `RecommendationController`, `RecommendationRanker`까지만으로도 완료 가능해야 한다.

### 4.4 Frontend 구조

```text
frontend/src/lib/api/recommendations.ts
frontend/src/lib/recommendations/types.ts
frontend/src/hooks/use-recommendations.ts
frontend/src/components/simulation/recommendation-panel.tsx
frontend/src/components/simulation/recommendation-card.tsx
```

`frontend/src/lib/types.ts`의 `SimulationResponse`에 추천 결과를 넣지 않는다. 추천은 별도 API 응답 타입으로 둔다.

## 5. API 계약

### 5.1 추천 생성 API

Endpoint:

```http
POST /api/recommendations
```

Request:

```json
{
  "request_id": "simulation-request-id",
  "locale": "ko",
  "case_input": {},
  "simulation_response": {},
  "max_items": 6,
  "enabled_providers": ["catalog", "naver_book", "naver_shopping", "youtube"]
}
```

규칙:

- `request_id`는 필수다.
- public API request에서는 `simulation_response`에 `/api/simulate`의 응답 원문을 받을 수 있다.
- 단, `simulation_response` 원문은 `api`/`life` adapter까지만 들어온다. `core`에는 반드시 `LifeRecommendationContextMapper`가 만든 `RecommendationContext`만 넘긴다.
- `case_input`은 프론트가 현재 form payload 또는 latest version request를 넘긴다. 이 값도 `life` adapter에서 `RecommendationContext.user`, `RecommendationContext.decision`으로 축약한다.
- `enabled_providers`가 비어 있으면 backend config 기준으로 활성 provider를 선택한다.
- `max_items` 기본값은 6, 최대값은 12로 제한한다.
- 추후 추천 서버를 별도 분리할 때는 public API request를 바로 `RecommendationContext` 형태로 받아도 된다. 기존 Life Simulator 연동에서는 backward compatibility를 위해 위 request shape를 유지한다.

Response:

```json
{
  "request_id": "simulation-request-id",
  "generated_at": "2026-05-11T18:42:55+09:00",
  "intent": {
    "topic": "career_change",
    "audience_context": "커리어 전환과 성장 정체를 고민하는 사용자",
    "product_types": ["book", "youtube_channel", "course"],
    "queries": [
      {
        "provider": "naver_book",
        "query": "커리어 전환 책",
        "reason": "성장 정체와 이직 판단 기준을 다루는 도서가 적합함"
      }
    ],
    "safety_level": "normal"
  },
  "disclosure": {
    "label": "추천",
    "text": "추천 항목에는 광고 또는 제휴 링크가 포함될 수 있습니다.",
    "affiliate_included": true
  },
  "items": [
    {
      "id": "catalog-career-book-001",
      "provider": "catalog",
      "type": "book",
      "title": "커리어 전환 가이드",
      "description": "현재 선택의 기준을 정리하는 데 도움이 되는 자료입니다.",
      "url": "https://example.com/career-book",
      "image_url": null,
      "price_label": null,
      "mall_name": null,
      "creator_name": null,
      "is_affiliate": false,
      "sponsored": false,
      "why": "현재 결과가 성장 정체와 안정성 사이의 선택을 다루기 때문에 관련 실행 기준을 보강합니다.",
      "rank_score": 0.82
    }
  ],
  "provider_status": [
    {
      "provider": "catalog",
      "status": "ok",
      "item_count": 4,
      "message": null
    }
  ]
}
```

### 5.2 추천 이벤트 API

Endpoint:

```http
POST /api/recommendation-events
```

Request:

```json
{
  "request_id": "simulation-request-id",
  "item_id": "catalog-career-book-001",
  "provider": "catalog",
  "event_type": "impression | click | dismiss",
  "metadata": {
    "source": "simulation_result_recommendation_panel"
  }
}
```

1차 구현에서는 DB가 없으면 no-op으로 처리해도 된다. DB가 활성화된 환경에서는 이벤트를 저장한다.

## 6. Phase 1: 내부 카탈로그 MVP

### 6.1 Backend domain 모델 추가

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationEngine.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationContext.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/UserContext.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/DecisionContext.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/ResultContext.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationIntent.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationItem.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationDisclosure.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationQuery.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationProviderResult.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationCatalogRepository.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationEventSink.java

backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationController.java
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationRequest.java
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationResponse.java

backend/src/main/java/com/lifesimulator/backend/recommendation/life/LifeRecommendationContextMapper.java
backend/src/main/java/com/lifesimulator/backend/recommendation/life/LifeRecommendationFieldPaths.java
```

권장 enum 값:

```java
public enum RecommendationItemType {
  BOOK,
  YOUTUBE_CHANNEL,
  YOUTUBE_VIDEO,
  COURSE,
  TEMPLATE,
  PRODUCT,
  SERVICE
}

public enum RecommendationProviderName {
  CATALOG,
  NAVER_BOOK,
  NAVER_SHOPPING,
  YOUTUBE,
  COUPANG_PARTNERS,
  EBAY_BROWSE
}
```

주의:

- Java record를 우선 사용한다.
- Controller, Service, Provider 역할을 한 파일에 합치지 않는다.
- `JsonNode simulationResponse`는 `api`/`life` adapter에서만 다룬다.
- `RecommendationEngine`, `RecommendationRanker`, `RecommendationSafetyPolicy`, provider orchestration은 `RecommendationContext`만 받는다.
- core 패키지에서 `com.lifesimulator.backend.simulation`, `com.lifesimulator.backend.engine`, `org.springframework.web`, `JdbcTemplate`, HTTP client를 import하면 구현 실패로 간주한다.

### 6.2 내부 카탈로그 리소스 추가

추가 파일:

```text
backend/src/main/resources/recommendations/catalog.ko.json
backend/src/main/resources/recommendations/catalog.en.json
```

예시:

```json
[
  {
    "id": "ko-career-book-001",
    "provider": "catalog",
    "item_type": "book",
    "locale": "ko",
    "status": "active",
    "title": "커리어 전환을 위한 의사결정 노트",
    "description": "이직, 잔류, 성장 정체 판단 기준을 정리하는 데 도움이 되는 가상 도서입니다.",
    "url": "https://example.com/recommendations/career-decision-note",
    "image_url": null,
    "price_label": null,
    "mall_name": null,
    "creator_name": null,
    "keywords": ["이직", "커리어", "성장 정체", "직무 전환"],
    "tags": ["career_change", "job_change", "growth"],
    "eligible_topics": ["career_change"],
    "is_affiliate": false,
    "sponsored": false,
    "priority_score": 0.8,
    "starts_at": null,
    "ends_at": null
  }
]
```

카탈로그는 실제 상품과 가상 상품을 섞어도 된다. 단, 가상 상품은 `description`이나 `provider`에서 데모/예시임을 숨기지 않는다.

DB 전환을 고려한 JSON 원칙:

- JSON은 단순 설정 파일이 아니라 향후 `recommendation_items` table의 seed data처럼 작성한다.
- 필드명은 가능한 한 future DB column과 맞춘다.
- 서비스는 JSON 파일을 직접 읽지 않는다. 반드시 `RecommendationCatalogRepository` interface를 통한다.
- MVP 구현체는 `JsonRecommendationCatalogRepository`다.
- 향후 DB 전환 구현체는 `JdbcRecommendationCatalogRepository`다.
- DB 전환 시 `RecommendationEngine`, public API response, frontend component는 수정하지 않는 것을 목표로 한다.

### 6.3 Deterministic intent extractor 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/DeterministicRecommendationIntentExtractor.java
```

입력에서 읽을 필드:

- `DeterministicRecommendationIntentExtractor`는 `RecommendationContext`만 읽는다.
- 아래 Life Simulator field path는 extractor가 아니라 `LifeRecommendationContextMapper`에서만 읽는다.
  - `case_input.decision.context`
  - `case_input.decision.optionA`
  - `case_input.decision.optionB`
  - `case_input.userProfile.job`
  - `case_input.userProfile.priority`
  - `simulation_response.planner.factors`
  - `simulation_response.advisor.reason`
  - `simulation_response.reflection.user_summary.suggested_actions`
- mapper는 위 field를 `RecommendationContext.user`, `RecommendationContext.decision`, `RecommendationContext.result`로 축약한다.

추천 topic 매핑:

```text
career, job, 이직, 커리어, 직무, 회사, 연봉 -> career_change
money, income, 재정, 저축, 투자, 연봉 -> financial_planning
relationship, 연애, 결혼, 가족, 친구 -> relationship
study, 시험, 학습, 대학원, 자격증 -> learning
burnout, 스트레스, 번아웃, 마음, 건강 -> wellbeing
```

fallback:

- 매칭 topic이 없으면 `general_decision_support`
- query가 없으면 `의사결정 책`, `목표 설정`, `습관 관리` 사용

### 6.4 Catalog provider 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/core/CatalogRecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/persistence/JsonRecommendationCatalogRepository.java
```

동작:

1. `CatalogRecommendationProvider`는 `RecommendationCatalogRepository` port만 의존한다.
2. `JsonRecommendationCatalogRepository`는 locale에 맞는 catalog JSON을 읽어 core model로 변환한다.
3. provider는 intent topic과 keywords를 기준으로 후보를 필터링한다.
4. 없으면 `general_decision_support` 항목을 반환한다.
5. repository/provider 실패가 전체 API 실패가 되지 않게 한다.

금지:

- `CatalogRecommendationProvider`가 classpath resource나 파일 경로를 직접 읽는 것
- `JsonRecommendationCatalogRepository`가 Life Simulator response field를 읽는 것

### 6.5 Controller/Service 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationController.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationEngine.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationRanker.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationSafetyPolicy.java
backend/src/main/java/com/lifesimulator/backend/recommendation/life/LifeRecommendationContextMapper.java
```

`RecommendationController` 순서:

1. request validation
2. feature flag 확인
3. `LifeRecommendationContextMapper`로 public API request를 `RecommendationContext`로 변환
4. `RecommendationEngine` 호출
5. `RecommendationResponse` 생성

`RecommendationEngine` 순서:

1. `RecommendationContext` validation
2. intent extraction
3. safety policy 적용
4. provider별 search 실행
5. item normalize
6. rank
7. max item 제한
8. disclosure 포함 core result 생성

분리 기준:

- Controller는 Spring MVC와 HTTP status만 담당한다.
- Mapper는 Life Simulator field path만 담당한다.
- Engine은 Life Simulator를 모르고 `RecommendationContext`만 처리한다.
- Ranker와 SafetyPolicy는 순수 함수에 가깝게 유지한다.

### 6.6 Phase 1 테스트

추가 테스트:

```text
backend/src/test/java/com/lifesimulator/backend/recommendation/RecommendationControllerTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/RecommendationEngineTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/LifeRecommendationContextMapperTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/DeterministicRecommendationIntentExtractorTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/CatalogRecommendationProviderTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/JsonRecommendationCatalogRepositoryTests.java
backend/src/test/java/com/lifesimulator/backend/recommendation/RecommendationArchitectureTests.java
```

검증 명령:

```sh
cd backend && ./mvnw test -Dtest=RecommendationControllerTests,RecommendationEngineTests,LifeRecommendationContextMapperTests,DeterministicRecommendationIntentExtractorTests,CatalogRecommendationProviderTests,JsonRecommendationCatalogRepositoryTests,RecommendationArchitectureTests
cd backend && ./mvnw test
```

완료 조건:

- 외부 API 키 없이 `/api/recommendations`가 200을 반환한다.
- 커리어 고민 입력에서 career 관련 카탈로그 항목이 최소 1개 반환된다.
- 결과에는 광고/제휴 고지가 항상 포함된다.
- `RecommendationArchitectureTests`에서 core 패키지가 simulation/engine/api/Spring MVC/Jdbc/HTTP client에 의존하지 않음을 검증한다.
- 기존 `/api/simulate` 관련 테스트가 그대로 통과한다.

## 7. Phase 2: LLM intent extractor

### 7.1 Prompt 추가

추가 파일:

```text
backend/src/main/resources/prompts/recommendation/intent.md
```

프롬프트 요구사항:

- 입력된 `RecommendationContext`만 사용한다.
- Life Simulator 전용 field path나 JSON schema 이름을 prompt에 노출하지 않는다.
- 상품명, 상품군, 콘텐츠 유형, 검색어를 분리해서 출력한다.
- 건강, 법률, 투자, 정신건강 등 민감 주제는 `safety_level`을 올린다.
- 가격, 재고, 평점, 저자명을 새로 만들지 않는다.
- 출력은 유효한 JSON만 허용한다.

출력 schema:

```json
{
  "topic": "career_change",
  "audience_context": "",
  "product_types": ["book", "youtube_channel"],
  "queries": [
    {
      "provider": "naver_book",
      "query": "커리어 전환 책",
      "reason": ""
    }
  ],
  "negative_filters": ["medical_treatment", "high_risk_investment"],
  "safety_level": "normal | sensitive | restricted"
}
```

### 7.2 구현 파일

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/LlmRecommendationIntentExtractor.java
backend/src/main/java/com/lifesimulator/backend/recommendation/intent/RecommendationIntentSchemaFactory.java
```

동작:

1. 기존 `LlmJsonClient`를 주입받아 사용한다.
2. Codex CLI subscription auth가 local default인 현재 정책을 유지한다.
3. LLM 실패, timeout, invalid JSON이면 deterministic extractor로 fallback한다.
4. fallback 여부를 `provider_status` 또는 response metadata에 남긴다.

주의:

- `OPENAI_API_KEY`를 필수로 만들지 않는다.
- 추천 intent 추출 실패가 `/api/recommendations` 전체 실패가 되면 안 된다.

## 8. Phase 3: Naver Book provider

### 8.1 설정 추가

수정 파일:

```text
backend/src/main/java/com/lifesimulator/backend/config/SimulatorProperties.java
backend/src/main/resources/application.yml
backend/.env.example
```

권장 설정:

```yaml
simulator:
  recommendations:
    enabled: true
    default-providers: catalog,naver_book
    request-timeout: 2s
    naver:
      enabled: false
      client-id: ${NAVER_CLIENT_ID:}
      client-secret: ${NAVER_CLIENT_SECRET:}
      book-enabled: true
      shopping-enabled: false
```

`.env.example`:

```text
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

### 8.2 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverBookRecommendationProvider.java
```

API:

- `GET https://openapi.naver.com/v1/search/book.json`
- Headers:
  - `X-Naver-Client-Id`
  - `X-Naver-Client-Secret`

사용 필드:

- `title`
- `link`
- `image`
- `author`
- `publisher`
- `discount`
- `isbn`
- `description`

정규화 규칙:

- title/description의 HTML tag는 제거한다.
- 가격은 숫자를 직접 계산하지 말고 `price_label` 문자열로 둔다.
- ISBN은 내부 dedupe key로 사용한다.

완료 조건:

- 키가 없으면 provider status가 `disabled`이고 catalog fallback이 반환된다.
- 키가 있으면 책 검색 결과가 추천 카드로 표시된다.

## 9. Phase 4: Naver Shopping provider

### 9.1 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/NaverShoppingRecommendationProvider.java
```

API:

- `GET https://openapi.naver.com/v1/search/shop.json`

사용 파라미터:

- `query`
- `display=5`
- `sort=sim`
- 필요 시 `exclude=used:rental:cbshop`

사용 필드:

- `title`
- `link`
- `image`
- `lprice`
- `hprice`
- `mallName`
- `productId`
- `brand`
- `maker`
- `category1`, `category2`, `category3`, `category4`

주의:

- 네이버 쇼핑 검색은 상품 링크 조회가 가능하지만 자체 어필리에이트 정산 기능은 아니다.
- 실상품 추천 데모에는 적합하지만 수익화는 Coupang/eBay/Rakuten 같은 affiliate provider와 분리한다.

완료 조건:

- 커리어 고민이면 무리하게 물리 상품만 추천하지 않는다.
- `book`, `course`, `tool`, `template` 같은 유형이 더 적합하면 shopping 결과는 낮은 rank를 준다.

## 10. Phase 5: YouTube provider

### 10.1 설정

```yaml
simulator:
  recommendations:
    youtube:
      enabled: false
      api-key: ${YOUTUBE_API_KEY:}
      cache-ttl: 6h
```

`.env.example`:

```text
YOUTUBE_API_KEY=
```

### 10.2 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/YoutubeRecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/ProviderResponseCache.java
```

API:

- `GET https://www.googleapis.com/youtube/v3/search`

사용 파라미터:

- `part=snippet`
- `type=video,channel`
- `q`
- `maxResults=5`
- `key`

주의:

- YouTube `search.list`는 호출당 quota cost가 100 units다.
- 기본 quota는 일 10,000 units이므로 동일 query는 반드시 TTL cache를 적용한다.
- 테스트에서는 실제 YouTube API를 호출하지 않고 mock server 또는 provider fake를 사용한다.

완료 조건:

- API 키가 없어도 정상 fallback한다.
- 같은 query에 대해 TTL 안에서는 외부 호출이 반복되지 않는다.

## 11. Phase 6: Affiliate provider

어필리에이트는 MVP 이후 선택 구현한다. 둘 중 하나만 먼저 붙인다.

### 11.1 Coupang Partners

권장 이유:

- 한국 사용자 대상 수익화 설명에 가장 직관적이다.
- 상품 검색과 deeplink 생성 API를 사용할 수 있다.

필요 조건:

- Coupang Partners 가입
- API access key/secret 발급
- HMAC signature 구현
- 제휴 고지 문구 표시

설정:

```yaml
simulator:
  recommendations:
    coupang:
      enabled: false
      access-key: ${COUPANG_PARTNERS_ACCESS_KEY:}
      secret-key: ${COUPANG_PARTNERS_SECRET_KEY:}
      sub-id: ${COUPANG_PARTNERS_SUB_ID:}
```

`.env.example`:

```text
COUPANG_PARTNERS_ACCESS_KEY=
COUPANG_PARTNERS_SECRET_KEY=
COUPANG_PARTNERS_SUB_ID=
```

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/CoupangPartnersRecommendationProvider.java
backend/src/main/java/com/lifesimulator/backend/recommendation/provider/CoupangHmacSigner.java
```

표시 문구:

```text
이 추천에는 쿠팡 파트너스 링크가 포함될 수 있으며, 구매 시 일정액의 수수료를 제공받을 수 있습니다.
```

주의:

- secret key는 절대 프론트엔드로 내려보내지 않는다.
- 상품 가격/배송 정보는 API 응답에 있는 경우만 표시한다.
- 승인 전에는 provider를 disabled로 둔다.

### 11.2 eBay Browse API

권장 이유:

- eBay Browse API는 Browse request에서 affiliate campaign id를 헤더로 넘기면 affiliate URL을 받을 수 있다.
- 글로벌 상품 데모에 적합하다.

필요 조건:

- eBay Developer account
- OAuth client credentials
- eBay Partner Network campaign id

설정:

```yaml
simulator:
  recommendations:
    ebay:
      enabled: false
      client-id: ${EBAY_CLIENT_ID:}
      client-secret: ${EBAY_CLIENT_SECRET:}
      marketplace-id: ${EBAY_MARKETPLACE_ID:EBAY_US}
      affiliate-campaign-id: ${EBAY_AFFILIATE_CAMPAIGN_ID:}
```

## 12. Phase 7: Frontend UI

### 12.1 API client

추가 파일:

```text
frontend/src/lib/api/recommendations.ts
frontend/src/lib/recommendations/types.ts
frontend/src/hooks/use-recommendations.ts
```

`recommendations.ts`:

- `fetchRecommendations(request)` 구현
- 기존 `apiUrl`, `readJsonResponse` 사용
- session id header는 기존 simulation/feedback API 패턴을 따른다.

### 12.2 UI 컴포넌트

추가 파일:

```text
frontend/src/components/simulation/recommendation-panel.tsx
frontend/src/components/simulation/recommendation-card.tsx
```

수정 파일:

```text
frontend/src/components/simulation/simulation-page.tsx
```

삽입 위치:

- `ReflectionCard` 이후
- `OutcomeFollowupPanel` 이전

이유:

- 추천은 결과 해석 이후 자연스럽게 노출되어야 한다.
- 후속 결과 수집보다 먼저 보여야 사용자가 추천 카드와 결과를 연결해서 이해한다.

UI 상태:

- idle: `추천 보기` 버튼
- loading: skeleton 또는 compact loading row
- success: 추천 카드 목록
- empty: 추천할 항목 없음
- error: 외부 추천을 불러오지 못했지만 결과 분석은 정상이라는 메시지

주의:

- 추천 기능 설명을 장황하게 쓰지 않는다.
- 카드에는 `추천`, `광고`, `제휴` 같은 disclosure를 작게라도 명확히 표시한다.
- 외부 링크는 새 탭으로 연다.
- `rel="noopener noreferrer"`를 붙인다.
- 긴 상품명은 2줄 clamp 처리한다.

## 13. Phase 8: 추천 이벤트 수집

### 13.1 DB migration

추가 파일:

```text
backend/src/main/resources/db/migration/V4__add_recommendation_events.sql
```

스키마:

```sql
CREATE TABLE IF NOT EXISTS life_simul_recommendation_events (
  event_id UUID PRIMARY KEY,
  request_id TEXT NOT NULL,
  session_id TEXT,
  trace_id TEXT,
  provider TEXT NOT NULL,
  item_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_recommendation_events_request_id
  ON life_simul_recommendation_events (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_recommendation_events_provider_created_at
  ON life_simul_recommendation_events (provider, created_at DESC);
```

### 13.2 Backend 구현

추가 파일:

```text
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationEventRequest.java
backend/src/main/java/com/lifesimulator/backend/recommendation/api/RecommendationEventResponse.java
backend/src/main/java/com/lifesimulator/backend/recommendation/core/RecommendationEventSink.java
backend/src/main/java/com/lifesimulator/backend/recommendation/persistence/NoopRecommendationEventSink.java
backend/src/main/java/com/lifesimulator/backend/recommendation/persistence/JdbcRecommendationEventSink.java
```

Controller는 `RecommendationController`에 같이 둘 수 있다. 커지면 `RecommendationEventController`로 분리한다.

분리 기준:

- core는 `RecommendationEventSink` interface만 호출한다.
- DB가 비활성화된 환경에서는 `NoopRecommendationEventSink`를 사용한다.
- DB가 활성화된 환경에서는 `JdbcRecommendationEventSink`를 사용한다.
- event 저장 실패는 추천 응답과 기존 simulation 결과 화면을 실패시키지 않는다.

### 13.3 Frontend 이벤트

추가 동작:

- 추천 카드가 화면에 렌더링되면 impression 이벤트 전송
- 링크 클릭 시 click 이벤트 전송
- 사용자가 추천 패널을 닫으면 dismiss 이벤트 전송

주의:

- 이벤트 실패는 UI에 에러로 노출하지 않는다.
- 중복 impression은 한 result/request 안에서 한 번만 보낸다.

## 14. Ranking 정책

초기 rank score는 단순 규칙으로 충분하다.

```text
score =
  topic_match * 0.35
  + query_match * 0.25
  + provider_priority * 0.15
  + item_type_fit * 0.15
  + freshness_or_quality_hint * 0.10
```

provider priority 기본값:

```text
catalog: 0.80
naver_book: 0.85
naver_shopping: 0.70
youtube: 0.75
coupang_partners: 0.70
ebay_browse: 0.65
```

민감 주제 제한:

- `wellbeing`은 상품보다 책/콘텐츠 중심으로 제한한다.
- `financial_planning`은 고위험 투자 상품 추천을 금지한다.
- `medical`, `legal`, `mental_health_crisis`에 가까운 intent는 광고성 추천을 하지 않고 도움 리소스 또는 일반 교육 콘텐츠만 허용한다.

## 15. 외부 API 기준

2026-05-11 조사 기준으로 구현 판단은 아래와 같다.

| Provider | 구현 우선순위 | 근거 |
|---|---:|---|
| Catalog | 1 | API 키 없이 항상 데모 가능 |
| Naver Book | 2 | 한국어 책 검색, 하루 25,000회 한도, HTTP header 인증 |
| Naver Shopping | 3 | 실상품 검색 가능, 가격/이미지/몰명 표시 가능 |
| YouTube | 4 | 콘텐츠 추천에 적합하지만 search quota cost가 높음 |
| Coupang Partners | 5 | 실제 affiliate 수익화에 적합하지만 승인/API 키 필요 |
| eBay Browse | 5 | affiliate URL 지원, 글로벌 상품에 적합 |
| Rakuten Advertising | 6 | Publisher 계정과 XML 처리 필요 |
| Amazon | 제외 | PA-API deprecated 전환기라 MVP 리스크 큼 |

참고 URL:

- Naver Shopping Search API: `https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md`
- Naver Book Search API: `https://developers.naver.com/docs/serviceapi/search/book/book.md`
- YouTube Data API search.list: `https://developers.google.com/youtube/v3/docs/search/list`
- YouTube quota: `https://developers.google.com/youtube/v3/determine_quota_cost`
- Google Books Volumes API: `https://developers.google.com/books/docs/v1/reference/volumes`
- Open Library Search API: `https://openlibrary.org/dev/docs/api/search`
- eBay Browse API: `https://developer.ebay.com/api-docs/buy/static/api-browse.html`
- Rakuten Advertising Product Search API: `https://pubhelp.rakutenadvertising.com/hc/en-us/articles/5949953174029-Product-Search-API`
- Coupang Partners guide: `https://partner-developers.coupangcorp.com/hc/ko/sections/360012292152-Guide`
- Amazon PA-API deprecation notice: `https://webservices.amazon.com/paapi5/documentation/register-for-pa-api.html`

## 16. 보안/정책 체크리스트

필수:

- 외부 API key와 affiliate secret은 backend env에서만 사용한다.
- 프론트엔드 번들에 provider secret이 들어가면 안 된다.
- 추천 카드에는 광고/제휴 고지를 표시한다.
- 가격, 할인, 배송, 재고는 API 응답에 있을 때만 표시한다.
- LLM이 생성한 상품명은 실제 상품처럼 단정하지 않는다.
- 외부 API 실패는 provider status에만 기록하고 전체 결과는 fallback으로 반환한다.
- timeout은 provider별 2초 안팎으로 제한한다.
- provider response는 테스트에서 fixture로 고정한다.

권장:

- 동일 request/query는 짧은 TTL cache를 적용한다.
- provider별 disable flag를 둔다.
- 민감 주제는 추천 item type을 제한한다.
- 클릭 이벤트 수집 시 개인 식별 정보를 저장하지 않는다.

## 17. 검증 계획

### 17.1 Backend 단위 테스트

```sh
cd backend && ./mvnw test -Dtest=Recommendation*Tests,*Recommendation*Tests
```

테스트 항목:

- 카탈로그 fallback
- `LifeRecommendationContextMapper`가 Life response를 `RecommendationContext`로 축약하는지
- `RecommendationEngine`이 `RecommendationContext`만으로 동작하는지
- recommendation core가 simulation/engine/api/Spring/Jdbc/HTTP 구현에 의존하지 않는지
- deterministic intent topic 매핑
- LLM extractor 실패 시 fallback
- provider disabled 상태
- provider timeout 상태
- rank order
- disclosure 포함 여부
- 민감 주제 filtering

### 17.2 Backend 전체 테스트

```sh
cd backend && ./mvnw test
```

기존 동작 보호 확인:

- `SimulationControllerTests`
- `StageExecutionServiceTests`
- `SimulationRouterTests`
- `GuardrailEvaluationServiceTests`
- `OutcomeFollowupServiceTests`
- `FeedbackServiceTests`

위 테스트가 추천 기능 추가 후에도 그대로 통과해야 한다. 추천 기능 추가 때문에 기존 테스트 expectation을 느슨하게 바꾸지 않는다.

### 17.3 Frontend 타입/빌드

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### 17.4 수동 API 확인

Backend 실행:

```sh
cd backend && ./mvnw spring-boot:run
```

요청 예시:

```sh
curl -s http://localhost:8080/api/recommendations \
  -H 'content-type: application/json' \
  -d '{
    "request_id":"demo-request",
    "locale":"ko",
    "case_input":{
      "userProfile":{"job":"developer","priority":["stability","growth"]},
      "decision":{"context":"이직과 성장 정체를 고민 중입니다","optionA":"잔류","optionB":"이직"}
    },
    "simulation_response":{
      "advisor":{"reason":"성장 정체와 안정성 사이의 균형이 중요합니다"},
      "planner":{"factors":["stability","growth","income"]},
      "reflection":{"user_summary":{"suggested_actions":["6개월 검증 기준을 정하세요"]}}
    },
    "max_items":3,
    "enabled_providers":["catalog"]
  }' | jq
```

기대 결과:

- HTTP 200
- `items.length >= 1`
- `disclosure.text` 존재
- `provider_status[0].provider == "catalog"`

### 17.5 UI 확인

Frontend 실행:

```sh
cd frontend && npm run dev
```

확인 항목:

- simulation 결과 제출 후 추천 패널이 표시된다.
- 추천 패널 feature flag가 꺼져 있으면 기존 결과 화면 순서와 기존 카드가 그대로 유지된다.
- 추천 로딩, 성공, 에러, empty 상태가 깨지지 않는다.
- 긴 상품명과 설명이 모바일에서도 영역을 넘지 않는다.
- 링크 클릭 시 새 탭으로 열린다.
- API 오류가 simulation 결과 화면 전체를 망가뜨리지 않는다.

## 18. 완료 조건

MVP 완료 조건:

- `/api/recommendations`가 외부 API 키 없이 catalog 기반으로 동작한다.
- 추천 intent가 시뮬레이션 결과의 주제와 연결된다.
- 추천 core는 `RecommendationContext`만 입력으로 받고 Life Simulator 전용 응답 타입을 import하지 않는다.
- Life Simulator 전용 매핑은 `LifeRecommendationContextMapper`에만 존재한다.
- JSON catalog는 `RecommendationCatalogRepository` 뒤에 숨겨져 있어 향후 JDBC 구현으로 교체 가능하다.
- 프론트 결과 화면에서 추천 카드가 보인다.
- 추천 feature flag를 끄면 기존 결과 화면이 추천 기능 추가 전처럼 동작한다.
- 광고/제휴 고지가 표시된다.
- backend test, frontend typecheck, frontend build가 통과한다.

확장 완료 조건:

- Naver Book provider가 키가 있을 때 동작한다.
- Naver Shopping provider가 키가 있을 때 동작한다.
- YouTube provider는 cache와 disabled fallback을 갖춘다.
- recommendation event 저장이 DB enabled 환경에서 동작한다.
- provider별 실패가 전체 추천 실패로 전파되지 않는다.

## 19. 예상 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 외부 API 키 없음 | Catalog provider를 기본값으로 둔다. |
| 추천 구현이 기존 simulation path를 건드림 | `/api/simulate` 변경 금지, 추천은 side API로 유지한다. |
| 추천 core가 Life Simulator 구조에 결합됨 | `RecommendationContext`와 `LifeRecommendationContextMapper` 경계를 테스트로 강제한다. |
| JSON catalog가 DB 전환을 어렵게 만듦 | DB-like JSON schema와 `RecommendationCatalogRepository` port를 사용한다. |
| LLM intent 실패 | Deterministic extractor fallback을 항상 둔다. |
| YouTube quota 부족 | Provider disabled 기본값, TTL cache 적용. |
| 네이버 검색 결과 품질 편차 | 내부 카탈로그와 ranker로 보정한다. |
| 어필리에이트 승인 지연 | Coupang/eBay는 optional provider로 둔다. |
| 광고 고지 누락 | `RecommendationDisclosure`를 response 필수 필드로 둔다. |
| 민감 주제 상품 추천 위험 | `RecommendationSafetyPolicy`에서 제한한다. |
| UI가 광고처럼 과하게 보임 | 결과 보조 카드로 작게 배치하고 사용자 선택으로 로딩한다. |

## 20. 커밋 권장 단위

1. `recommendation core contract and architecture tests`
2. `life recommendation context mapper`
3. `json catalog repository and catalog provider`
4. `recommendation API and backend tests`
5. `recommendation frontend panel behind feature flag`
6. `llm intent extractor fallback`
7. `naver recommendation providers`
8. `recommendation events tracking`

각 커밋 전 최소 검증:

```sh
cd backend && ./mvnw test
cd frontend && npm run typecheck
```

UI 변경이 포함된 커밋은 추가로:

```sh
cd frontend && npm run build
```
