# 케이스 템플릿 카탈로그 리팩토링 상세 개발계획서

> **강제 실행 명령:** 이 계획서를 수행하는 구현자는 사용자가 명시적으로 중단을 지시하지 않는 한 임의로 멈추지 말고, Phase 0부터 완료 조건까지 개발, 검증, 정리, 보고를 끝까지 완료한다. 오류가 발생하면 숨기거나 우회하지 말고 원인을 수정한 뒤 계속 진행한다. 단순 제안이나 중간 상태를 완료로 보고하지 않는다. 구현 중 어떤 기능이라도 삭제, 축소, 비활성화, 접근 경로 제거가 발생하면 즉시 이 문서의 `삭제/축소 기능 기록부`에 기록하고, 최종 작업 완료 보고에서 반드시 별도 항목으로 보고한다.

- 작성일: 2026-05-31 02:57:52 KST
- 대상 프로젝트: `/Users/switch/Development/Web/life_simulator`
- 대상 영역: `frontend/playground/inputs/cases`, `backend/src/main/java/com/lifesimulator/backend/cases`, `backend/src/main/java/com/lifesimulator/backend/api/CasesController.java`, `frontend/src/lib/api/cases.ts`, `frontend/src/hooks/use-case-presets.ts`, `frontend/src/lib/types.ts`
- 목적: 기존 flat JSON 케이스 템플릿을 확장, 검토, DB 이관이 쉬운 카탈로그 구조로 전환한다.
- 핵심 원칙: `/api/cases`의 기존 `cases` 응답과 각 case preset shape는 유지하면서, 파일명 기반 카테고리 추론을 명시적 metadata 기반으로 이동한다.

## 1. 최종 목표

현재 케이스 템플릿은 `frontend/playground/inputs/cases/*.json`에 flat하게 놓여 있고, 백엔드 `CasePresetService`가 파일명 slug를 보고 카테고리를 추론한다. 이 구조는 케이스가 50개 이상으로 늘고 업무 분야 카테고리가 추가될수록 관리가 어려워진다.

이번 리팩토링의 최종 목표는 아래 구조다.

```text
frontend/playground/inputs/cases/
  categories.json
  career/
    case-01-career-stability.json
    case-02-career-growth.json
  relationship/
    case-04-relationship.json
  finance/
    case-15-big-purchase-vs-wait.json
  work-sales/
    customer-value-vs-margin.json
  work-product/
    mvp-release-vs-quality.json
```

각 케이스 파일은 계속 "파일 하나 = 템플릿 하나" 원칙을 유지한다. 카테고리별로 한 JSON 파일에 모든 케이스를 넣지 않는다.

## 2. 절대 보존 원칙

아래 원칙을 위반하면 이 작업은 실패로 간주한다.

1. `/api/cases`는 계속 `{"cases": [...]}`를 반환해야 한다.
2. 각 case preset의 기존 필드 `id`, `slug`, `title`, `titleLabels`, `category`, `categoryLabel`, `categoryLabels`, `summary`, `summaryLabels`, `request`는 유지한다.
3. 기존 JSON의 `userProfile`과 `decision.optionA`, `decision.optionB`, `decision.context` shape는 변경하지 않는다.
4. `/api/simulate` 요청/응답, simulation stage, prompt, guardrail, logging, metrics, retry/timeout/fallback 흐름은 변경하지 않는다.
5. 기존 18개 케이스는 모두 노출되어야 하며, 가능한 한 기존 `id`/`slug`를 유지한다.
6. 업무 분야 카테고리 추가를 위한 기반은 만들되, 이 리팩토링에서 N개 선택지 또는 A/B/C 판단 기능은 도입하지 않는다.
7. DB 이관은 고려하되, 이번 작업의 기본 범위는 파일 기반 카탈로그 리팩토링이다. DB migration은 별도 후속 작업으로 남긴다.

## 2.1 삭제/축소 기능 기록부

구현 중 삭제되거나 축소된 기능이 있으면 아래 표에 즉시 기록한다. 삭제/축소가 없으면 최종 완료 시 `없음`으로 명시한다.

| 일시 | 기능 | 변경 유형 | 사유 | 영향 범위 | 대체 경로 | 복구 방법 | 최종 보고 포함 여부 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 예정 |

## 3. 비범위

이번 작업에서 하지 않는다.

- 실제 케이스 대량 추가
- `decision.options[]` 기반 N개 선택지 지원
- A/B reasoning prompt 구조 변경
- priority catalog의 업무 분야 우선순위 대량 확장
- DB schema migration 추가
- 사용자 커스텀 템플릿 저장 기능
- 로그인/소유권/공개 범위 기능

다만 DB 이관을 쉽게 하기 위해 파일 schema와 Java/TypeScript DTO는 DB row에 가까운 형태로 정리한다.

## 4. 권장 카탈로그 구조

### 4.1 카테고리 registry

신규 파일:

```text
frontend/playground/inputs/cases/categories.json
```

예시:

```json
{
  "schemaVersion": 1,
  "categories": [
    {
      "id": "career",
      "domain": "life",
      "order": 10,
      "labels": {
        "ko": "커리어",
        "en": "Career"
      },
      "status": "active"
    },
    {
      "id": "work-sales",
      "domain": "work",
      "order": 110,
      "labels": {
        "ko": "영업",
        "en": "Sales"
      },
      "status": "active"
    }
  ]
}
```

필수 필드:

- `id`: stable category id. 예: `career`, `relationship`, `work-sales`
- `labels.ko`, `labels.en`: UI 표시명
- `order`: UI 정렬 순서
- `domain`: `life` 또는 `work`
- `status`: `active`, `draft`, `archived` 중 하나

초기 registry에는 기존 카테고리 7개를 먼저 넣는다.

```text
career
relationship
finance
living
education
health
other
```

업무 분야는 실제 케이스 추가 직전에 아래 후보를 순차 도입한다.

```text
work-sales
work-support
work-product
work-marketing
work-operations
work-hr
work-finance
work-strategy
work-legal
work-engineering
work-design
work-project
work-procurement
```

### 4.2 케이스 파일 schema

각 케이스 파일은 아래 형태로 맞춘다.

```json
{
  "schemaVersion": 1,
  "metadata": {
    "category": "career",
    "title": {
      "ko": "커리어 안정성",
      "en": "Career Stability"
    },
    "summary": {
      "ko": "안정적인 현재 회사와 성장 가능성이 큰 스타트업 이직 사이에서 고민하는 케이스입니다.",
      "en": "A case about choosing between a stable current company and a startup move with stronger growth potential."
    },
    "tags": ["career", "stability", "growth"],
    "status": "active"
  },
  "userProfile": {
    "age": 32,
    "job": "developer",
    "risk_tolerance": "low",
    "priority": ["stability", "income", "work_life_balance"]
  },
  "decision": {
    "optionA": "현재 회사에 남는다",
    "optionB": "스타트업으로 이직한다",
    "context": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다."
  }
}
```

`schemaVersion`, `metadata.category`, `metadata.tags`, `metadata.status`는 신규 권장 필드다. 기존 파일 호환을 위해 loader는 이 필드가 없어도 동작해야 한다.

### 4.3 파일명과 slug

초기 마이그레이션에서는 기존 파일명을 유지한다.

예:

```text
case-01-career-stability.json
case-02-career-growth.json
```

이유:

- 기존 `id`/`slug` 변경으로 인한 UI 선택 상태, 테스트 fixture, 문서 참조 깨짐을 피한다.
- 신규 케이스부터 더 짧은 slug를 사용할 수 있다.

## 5. 설계 방향

### 5.1 백엔드 loader

현재:

- `CasePresetService`가 `Files.list(casesDir)`로 root `*.json`만 읽는다.
- `inferCategory(slug)`가 파일명 키워드로 카테고리를 추론한다.
- category label은 Java `Map`에 하드코딩되어 있다.

변경 후:

- `CasePresetService`는 `categories.json`을 먼저 읽는다.
- 케이스 파일은 recursive walk로 읽는다.
- `categories.json` 파일 자체는 케이스 목록에서 제외한다.
- 카테고리 결정 우선순위는 아래 순서로 한다.

```text
1. request.metadata.category
2. parent directory name
3. legacy inferCategory(slug)
4. other
```

- category label은 registry에서 가져온다.
- registry에 없는 category는 fallback label을 사용하고 `other`로 강제하지 않는다. 업무 분야 확장을 위해 unknown category도 표시 가능해야 한다.
- 기존 API shape는 유지한다.
- 선택적으로 `/api/cases`에 `categories` 필드를 추가할 수 있다. 기존 `cases` 필드는 반드시 유지한다.

권장 응답:

```json
{
  "categories": [
    {
      "id": "career",
      "domain": "life",
      "order": 10,
      "labels": {
        "ko": "커리어",
        "en": "Career"
      }
    }
  ],
  "cases": []
}
```

프론트 기존 코드는 `cases`만 읽고 있으므로 `categories` 추가는 backward-compatible이다.

### 5.2 프론트 타입

현재:

```ts
export type CasePresetCategory =
  | "career"
  | "relationship"
  | "finance"
  | "living"
  | "education"
  | "health"
  | "other";
```

변경 후:

```ts
export type CasePresetCategory = string;

export interface CasePresetCategoryInfo {
  id: CasePresetCategory;
  domain?: "life" | "work" | string;
  order?: number;
  labels: LocalizedText;
  status?: string;
}
```

이유:

- 업무 카테고리가 추가될 때마다 TypeScript union을 수정하지 않기 위함이다.
- API registry를 source of truth로 사용하기 위함이다.

### 5.3 프론트 hook

현재:

- `CASE_CATEGORY_ORDER`가 프론트에 하드코딩되어 있다.
- `listPresetCategories`는 known category만 보여준다.
- unknown category는 UI에서 빠질 수 있다.

변경 후:

- `fetchCasePresets`는 `{ cases, categories }` 형태를 읽는다.
- `useCasePresets`는 `categories` state를 가진다.
- category 표시 순서는 `categories.order`를 우선 사용한다.
- registry가 없거나 backend가 구버전이면 기존 preset 기반 fallback을 사용한다.
- unknown category도 표시한다.

### 5.4 Priority catalog와의 관계

`frontend/src/lib/priorities.ts`의 `listPriorityGroupsForCategory`는 이미 category를 `string | null | undefined`로 받는다. `PriorityCatalogService`에 없는 category는 preferred group이 비고 전체 group을 보여준다.

따라서 이 리팩토링에서 priority catalog를 반드시 확장할 필요는 없다.

후속 작업에서 업무 분야별 priority group을 추가할 수 있다.

예:

```text
sales: customer_trust, revenue, margin, retention
product: user_value, speed, quality, maintainability
engineering: reliability, security, delivery_speed, technical_debt
```

## 6. 단계별 실행 계획

### Phase 0. 현황 고정과 안전장치

목표:

- 현재 18개 케이스 목록과 `/api/cases` shape를 기준선으로 남긴다.

작업:

1. 현재 케이스 파일 목록을 확인한다.
2. `CasesControllerTests` 또는 신규 `CasePresetServiceTests`에 현재 loader shape를 보호하는 테스트를 추가한다.
3. 기존 flat 파일도 계속 읽을 수 있어야 한다는 테스트를 먼저 만든다.

완료 조건:

- 기존 flat 구조 테스트가 통과한다.
- 아직 파일 이동은 하지 않는다.

### Phase 1. Category registry loader 추가

목표:

- `categories.json`를 읽되, 없으면 기존 하드코딩 fallback으로 동작한다.

작업 파일:

```text
backend/src/main/java/com/lifesimulator/backend/cases/CasePresetService.java
backend/src/test/java/com/lifesimulator/backend/api/CasesControllerTests.java
```

권장 구현:

- `CaseCategory` record 또는 private record 추가
- `CaseCategoryRegistry` record 또는 private record 추가
- `loadCategories(Path casesDir)` 추가
- `defaultCategories()` fallback 추가
- `categoryLabelsFor(categoryId, registry)` 추가

완료 조건:

- `categories.json`가 없어도 기존 테스트가 통과한다.
- `categories.json`가 있으면 label/order/domain을 읽는 테스트가 통과한다.

### Phase 2. Recursive case file loading

목표:

- root뿐 아니라 하위 폴더의 `*.json` 케이스를 읽는다.

작업:

1. `Files.list(casesDir)`를 `Files.walk(casesDir)` 기반으로 변경한다.
2. `categories.json`는 제외한다.
3. directory와 파일명 정렬이 안정적으로 되도록 relative path 기준 sort를 사용한다.
4. slug는 파일명에서 `.json`을 제거한 값으로 유지한다.

주의:

- 동일 파일명이 다른 카테고리 폴더에 있으면 slug 충돌이 날 수 있다.
- 초기에는 slug 중복 발견 시 명시적 예외를 던지는 편이 안전하다.

완료 조건:

- root flat file과 nested file을 동시에 읽는 테스트가 통과한다.
- `categories.json`가 case로 노출되지 않는 테스트가 통과한다.

### Phase 3. metadata.category 우선순위 적용

목표:

- 파일명 기반 추론을 fallback으로 낮추고, 명시적 metadata를 우선한다.

작업:

1. `readPreset(Path file)`에서 `metadata.category`를 읽는다.
2. 비어 있으면 parent directory name을 사용한다.
3. 그래도 없으면 기존 `inferCategory(slug)`를 사용한다.
4. 최종 fallback은 `other`로 둔다.

완료 조건:

- `metadata.category`가 `work-sales`면 파일명과 무관하게 `work-sales`로 노출된다.
- parent directory가 `finance`면 metadata가 없어도 `finance`로 노출된다.
- 기존 flat legacy 파일은 기존과 같은 category로 노출된다.

### Phase 4. `/api/cases` categories 필드 추가

목표:

- 프론트가 category order/label을 API registry에서 받을 수 있게 한다.

작업 파일:

```text
backend/src/main/java/com/lifesimulator/backend/api/CasesController.java
backend/src/main/java/com/lifesimulator/backend/cases/CasePresetService.java
backend/src/test/java/com/lifesimulator/backend/api/CasesControllerTests.java
```

권장 응답:

```json
{
  "categories": [],
  "cases": []
}
```

주의:

- 기존 `cases` 필드명은 그대로 유지한다.
- 프론트가 아직 `categories`를 사용하지 않아도 깨지지 않아야 한다.

완료 조건:

- 테스트에서 `response`가 `cases`와 `categories`를 모두 포함한다.
- `cases` 기존 shape가 유지된다.

### Phase 5. 프론트 category type과 hook 업데이트

목표:

- 프론트가 업무 카테고리와 unknown category를 표시할 수 있게 한다.

작업 파일:

```text
frontend/src/lib/types.ts
frontend/src/lib/api/cases.ts
frontend/src/hooks/use-case-presets.ts
frontend/src/components/decision/decision-composer-page.tsx
frontend/src/components/workspace/simulation-workspace.tsx
```

작업:

1. `CasePresetCategory`를 string 기반으로 변경한다.
2. `CasePresetCategoryInfo` 타입을 추가한다.
3. `fetchCasePresets`가 `cases`와 `categories`를 함께 반환하도록 한다.
4. `useCasePresets`가 category registry state를 관리하게 한다.
5. `CASE_CATEGORY_ORDER` 하드코딩을 제거하거나 fallback으로만 사용한다.
6. category label은 registry labels를 우선 사용하고 preset `categoryLabels`는 fallback으로 사용한다.
7. `selectedCategory` 타입은 계속 `string | null`로 작동하게 한다.

완료 조건:

- 기존 카테고리 UI가 기존처럼 보인다.
- 신규 `work-sales` 같은 category가 TypeScript 수정 없이 표시된다.
- priority group 선택은 unknown category에서도 깨지지 않고 전체 group fallback을 보여준다.

### Phase 6. 기존 케이스 파일 마이그레이션

목표:

- 기존 18개 JSON을 새 폴더 구조로 이동하고 metadata를 보강한다.

이동 예시:

```text
frontend/playground/inputs/cases/case-01-career-stability.json
-> frontend/playground/inputs/cases/career/case-01-career-stability.json

frontend/playground/inputs/cases/case-04-relationship.json
-> frontend/playground/inputs/cases/relationship/case-04-relationship.json

frontend/playground/inputs/cases/case-15-big-purchase-vs-wait.json
-> frontend/playground/inputs/cases/finance/case-15-big-purchase-vs-wait.json
```

작업:

1. `categories.json`를 추가한다.
2. 기존 파일을 카테고리 폴더로 이동한다.
3. 각 파일에 `schemaVersion: 1`을 추가한다.
4. 각 파일의 `metadata.category`를 추가한다.
5. 가능하면 `metadata.tags`, `metadata.status`도 추가한다.

주의:

- JSON key order는 `schemaVersion`, `metadata`, `userProfile`, `decision` 순서로 통일한다.
- 기존 title/summary는 유지한다.
- 기존 `userProfile`과 `decision` 값은 수정하지 않는다.

완료 조건:

- `/api/cases`에서 기존 18개가 모두 보인다.
- 기존 id/slug가 유지된다.
- category label이 registry 기준으로 보인다.

### Phase 7. DB 이관 준비 문서화

목표:

- 지금 파일 구조가 나중에 DB row로 쉽게 옮겨질 수 있도록 mapping을 문서화한다.

권장 후속 DB table:

```text
template_categories
  id
  domain
  sort_order
  labels_json
  status
  created_at
  updated_at

case_templates
  id
  slug
  category_id
  title_labels_json
  summary_labels_json
  tags_json
  request_json
  source
  status
  version
  created_by
  created_at
  updated_at
```

초기 파일 to DB mapping:

| 파일 필드 | DB 필드 |
| --- | --- |
| `metadata.category` | `case_templates.category_id` |
| filename without `.json` | `case_templates.slug` |
| `metadata.title` | `case_templates.title_labels_json` |
| `metadata.summary` | `case_templates.summary_labels_json` |
| `metadata.tags` | `case_templates.tags_json` |
| `userProfile` + `decision` | `case_templates.request_json` |
| `metadata.status` | `case_templates.status` |

이번 작업에서는 DB migration을 만들지 않는다. 별도 work order로 분리한다.

## 7. 권장 신규/변경 파일

### Backend

```text
backend/src/main/java/com/lifesimulator/backend/cases/CasePresetService.java
backend/src/main/java/com/lifesimulator/backend/api/CasesController.java
backend/src/test/java/com/lifesimulator/backend/api/CasesControllerTests.java
```

필요하면 테스트 가독성을 위해 신규 테스트 파일을 만든다.

```text
backend/src/test/java/com/lifesimulator/backend/cases/CasePresetServiceTests.java
```

### Frontend

```text
frontend/src/lib/types.ts
frontend/src/lib/api/cases.ts
frontend/src/hooks/use-case-presets.ts
frontend/src/components/decision/decision-composer-page.tsx
frontend/src/components/workspace/simulation-workspace.tsx
```

### Catalog data

```text
frontend/playground/inputs/cases/categories.json
frontend/playground/inputs/cases/{category-id}/*.json
```

## 8. 구현 세부 규칙

1. JSON parser를 사용하고 문자열 조작으로 JSON을 만들지 않는다.
2. 케이스 파일 이동은 가능하면 `git mv`로 수행한다.
3. source of truth는 `frontend/playground/inputs/cases`로 유지한다.
4. `backend/target` 또는 `frontend/outputs`의 generated artifact는 수정하지 않는다.
5. API shape를 바꾸는 경우 반드시 프론트 타입과 테스트를 함께 수정한다.
6. 업무 카테고리 id는 공백 없이 kebab-case로 작성한다.
7. category id는 DB primary key로 사용할 수 있다고 가정하고 안정적으로 유지한다.
8. 기존 filename infer는 제거하지 말고 legacy fallback으로 남긴다.

## 9. 테스트 계획

### Backend

필수:

```bash
cd backend && ./mvnw test
```

최소 테스트 케이스:

1. legacy flat file만 있는 경우 기존과 같은 `cases` shape 반환
2. `categories.json`가 있는 경우 `categories` 반환
3. nested case file을 recursive로 읽음
4. `categories.json`를 case로 읽지 않음
5. `metadata.category`가 parent directory보다 우선함
6. metadata가 없으면 parent directory를 category로 사용함
7. parent directory도 없으면 legacy infer fallback 사용
8. 동일 slug 중복 시 명확한 예외 또는 deterministic 처리

### Frontend

필수:

```bash
cd frontend && npm run typecheck
cd frontend && npm run build
```

수동 확인:

1. 템플릿 drawer가 열린다.
2. 기존 카테고리 7개가 기존 label로 표시된다.
3. 카테고리 변경 시 첫 preset이 form에 적용된다.
4. 신규 category id가 있어도 category select에 표시된다.
5. 템플릿 적용 후 `optionA`, `optionB`, `context`, profile 값이 채워진다.

## 10. 롤백 전략

문제가 생기면 아래 순서로 되돌린다.

1. 케이스 파일 이동을 되돌리고 flat 구조로 복구한다.
2. `categories.json`를 제거해도 loader가 default category fallback으로 동작해야 한다.
3. `/api/cases`에 추가한 `categories` 필드는 프론트에서 optional로 처리하므로 제거 가능해야 한다.
4. legacy `inferCategory` fallback이 남아 있어야 기존 파일명 기반 동작으로 돌아갈 수 있다.

## 11. 완료 기준

아래가 모두 만족되어야 완료다.

1. 기존 18개 템플릿이 UI에서 모두 선택 가능하다.
2. 기존 18개 템플릿의 `id`/`slug`가 유지된다.
3. `/api/cases`는 `cases`를 계속 반환한다.
4. `categories.json` 기반 label/order가 동작한다.
5. nested case directory 구조가 동작한다.
6. 프론트가 string 기반 category를 처리한다.
7. backend test, frontend typecheck, frontend build가 통과한다.
8. 삭제/축소 기능 기록부가 `없음`이거나 실제 변경 내용이 정확히 기록되어 있다.

## 12. 후속 작업 후보

이 리팩토링 이후 별도 계획으로 진행한다.

1. `docs/template/20260531-template-case-expansion-draft.md`의 후보를 실제 JSON 케이스로 생성
2. 업무 분야 priority catalog 확장
3. 사용자 커스텀 템플릿 저장 기능
4. 파일 기반 catalog를 DB로 import하는 admin script
5. `template_categories`, `case_templates` DB migration
6. system/user template source와 visibility 처리
7. 관리자용 template validation/report command

