# 제품형 정보구조 및 UI 역할분리 리팩토링 상세 개발계획서

> **강제 실행 명령:** 이 계획서를 수행하는 구현자는 사용자가 명시적으로 중단을 지시하지 않는 한 임의로 멈추지 말고, Phase 0부터 완료 조건까지 개발, 검증, 정리, 보고를 끝까지 완료한다. 오류가 발생하면 숨기거나 우회하지 말고 원인을 수정한 뒤 계속 진행한다. 단순 제안이나 중간 상태를 완료로 보고하지 않는다. 구현 중 어떤 기능이라도 삭제, 축소, 비활성화, 접근 경로 제거가 발생하면 즉시 이 문서의 `삭제/축소 기능 기록부`에 기록하고, 최종 작업 완료 보고에서 반드시 별도 항목으로 보고한다.

- 작성일: 2026-05-30 04:36:34 KST
- 대상 프로젝트: `/Users/switch/Development/Web/life_simulator`
- 대상 영역: `frontend/src/App.tsx`, `frontend/src/components/*`, `frontend/src/hooks/*`, `frontend/src/lib/*`
- 목적: 현재 단일 메인페이지에 집중된 실험형 콘솔 UI를 상용제품처럼 보이는 의사결정 워크스페이스로 재구성한다.
- 핵심 원칙: 중복되는 노출만 통합하고, 중복이 아닌 기존 기능은 모두 유지한다.
- 노출 원칙: 첫 화면에는 핵심 요약과 시작 동선만 보이고, 상세 분석/내부 진단/후속 입력/추천 자료/메모리 편집은 사용자가 버튼, 탭, 드로어, 모달을 통해 추가 요청했을 때 나타나게 한다.

## 1. 최종 목표

현재 `App.tsx`는 `SimulationPage` 하나만 렌더링한다. `SimulationPage`는 입력, 예시 케이스, 실행 진행 상태, 내부 agent 단계, 결과 카드, 추천 자료, 세션 메모리, 후속 결과 저장, 재평가 입력을 한 화면에 모두 쌓는다. 이 구조는 기능은 많지만 사용자의 첫 인상에서 실험용 agent pipeline 콘솔처럼 보인다.

이번 작업의 최종 목표는 아래 구조로 전환하는 것이다.

1. 첫 화면은 `대시보드`로 만든다.
2. 의사결정 입력은 `새 의사결정` 화면으로 분리한다.
3. 결과는 `리포트` 화면에서 제품형 요약, 탭, 액션 중심으로 보여준다.
4. 세션 메모리와 실제 결과 저장은 `기록` 화면과 리포트 액션으로 재배치한다.
5. 반복 사용 데이터와 내부 진단은 `인사이트`와 `고급 진단`으로 분리한다.
6. 기존 API 계약, LLM pipeline, guardrail, logging, metrics, retry/timeout/fallback 흐름은 유지한다.

## 2. 절대 보존 원칙

아래 원칙을 위반하면 이 작업은 실패로 간주한다.

1. 기존 `/api/simulate` 요청/응답 shape를 변경하지 않는다.
2. 기존 simulation stage, routing, guardrail, reflection, advisor 결과를 삭제하지 않는다.
3. 기존 `Case Presets`, priority catalog, locale, progress stream, recommendation, session memory, outcome follow-up, follow-up re-evaluation, result versions 기능을 유지한다.
4. 중복이 아닌 기능은 제거하지 않는다. 다만 첫 화면 노출은 제거하고 사용자의 추가 요청 후 나타나도록 재배치한다.
5. 내부 agent 용어는 기본 사용자 화면에서 숨긴다. 필요하면 `고급 진단 보기` 버튼 뒤에 둔다.
6. 기존 generated/runtime data인 `frontend/outputs/`는 source of truth로 사용하지 않는다.
7. frontend는 `VITE_API_BASE_URL`을 통해 Spring Boot backend를 호출하는 현재 원칙을 유지한다.
8. OpenAI API key는 frontend `VITE_*` 변수로 요구하지 않는다.
9. 기능 삭제는 기본적으로 금지한다. 불가피하게 기능 삭제, 축소, 비활성화, 접근 경로 제거가 발생하면 구현자는 그 사유, 영향 범위, 대체 경로, 복구 방법을 이 문서의 `삭제/축소 기능 기록부`에 남기고 최종 보고에 포함한다.

## 2.1 삭제/축소 기능 기록부

구현 중 삭제되거나 축소된 기능이 있으면 아래 표에 즉시 기록한다. 삭제/축소가 없으면 최종 완료 시 `없음`으로 명시한다.

| 일시 | 기능 | 변경 유형 | 사유 | 영향 범위 | 대체 경로 | 복구 방법 | 최종 보고 포함 여부 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 없음 | 예정 |

## 3. 비범위

이번 작업에서 기본적으로 하지 않는다.

- 백엔드 simulation engine 로직 변경
- LLM prompt/schema 변경
- guardrail threshold/calibration 변경
- worker, queue, drift, eval pipeline 변경
- 로그인/회원가입 도입
- 결제, 공유 링크, 조직 관리 기능 도입
- DB schema 변경

단, `기록`과 `인사이트` 화면이 현존 데이터만으로 충분하지 않다면 첫 구현은 local/session state 기반으로 만들고, 서버 영속화가 필요한 부분은 후속 계획으로 남긴다.

## 4. 제품 IA

### 4.1 1차 네비게이션

상단 네비게이션은 아래 5개 화면으로 구성한다.

```text
대시보드 | 새 의사결정 | 리포트 | 기록 | 인사이트
```

우측 유틸 영역:

- `새 의사결정` primary CTA
- `도움말`
- `언어` 또는 설정 메뉴

모바일:

- 상단 스크롤 탭 또는 하단 5탭 중 하나를 선택한다.
- 초기 구현은 상단 스크롤 탭이 더 단순하다.

### 4.2 화면별 역할

| 화면 | 역할 | 첫 화면 노출 수준 |
| --- | --- | --- |
| 대시보드 | 앱 진입점, 최근 상태, 빠른 시작 | 핵심 요약만 노출 |
| 새 의사결정 | 입력 전용 composer | 단계별 입력만 노출 |
| 리포트 | 결과 소비, 후속 액션 | 추천/이유/리스크 요약만 먼저 노출 |
| 기록 | 저장된 결정, 실제 결과, 메모리 관리 | 목록과 선택 상세만 노출 |
| 인사이트 | 패턴, 추세, 고급 진단 | 사용자용 인사이트 우선, 내부 진단은 버튼 뒤 |

## 5. 기존 기능 재배치 매트릭스

중복이 아닌 기존 기능은 모두 아래 방식으로 보존한다.

| 현재 기능/컴포넌트 | 새 위치 | 기본 노출 | 추가 요청 트리거 |
| --- | --- | --- | --- |
| `Case Presets` | `새 의사결정`의 template picker | 숨김 | `템플릿에서 시작` 버튼 |
| `User Profile` 입력 | `새 의사결정` step 3 | 현재 단계에서만 노출 | stepper 이동 |
| `Decision` 입력 | `새 의사결정` step 1-2 | 현재 단계에서만 노출 | stepper 이동 |
| priority catalog loading/error | `새 의사결정` 입력 근처 | 해당 입력 시 노출 | 자동 |
| locale switch | 앱 shell 유틸 메뉴 | 축소 노출 | `언어` 버튼/메뉴 |
| `SimulatorFlowInfo` | 도움말 또는 고급 설명 | 숨김 | `도움말` 버튼 |
| `LoadingStageStrip` | 리포트 생성 중 progress summary | 사용자용 4단계만 노출 | `진행 상세 보기` 버튼으로 stage detail |
| ready empty state | 대시보드/리포트 empty state | 노출 | 자동 |
| error state | inline banner + action area | 노출 | 자동 |
| `RoutingCard` | `AnalysisTraceDrawer` 또는 인사이트 고급 진단 | 숨김 | `고급 진단 보기` 버튼 |
| `StateContextCard` | 리포트 `결정 브리프` 상세 | 요약만 노출 | `브리프 자세히` 버튼 |
| `PlannerCard` | 리포트 `결정 브리프` 상세 | 요약만 노출 | `브리프 자세히` 버튼 |
| `TimelineCard` | 리포트 `시나리오 비교` 탭 | 탭 선택 전 숨김 | `시나리오 비교` 탭 |
| `RiskCard` | 리포트 `리스크·안전장치` 탭 | 탭 선택 전 숨김 | `리스크·안전장치` 탭 |
| `ReasoningCard` | 리포트 `판단 근거` 상세 | 핵심 이유만 노출 | `판단 근거 자세히` 버튼 |
| `GuardrailCard` | 리포트 `안전성 검토` 상세 또는 고급 진단 | 주의 배지만 노출 | `안전성 검토` 또는 `고급 진단 보기` |
| `AdvisorCard` | `ReportHero` 핵심 추천 | 노출 | 자동 |
| `ReflectionCard` | 리포트 `결과 검증` 상세 | cautions/actions 요약만 노출 | `결과 검증 자세히` 버튼 |
| `RecommendationPanel` | 리포트 `실행 자료` 탭 | 숨김 | `실행 자료` 탭 + `추천 보기` 버튼 |
| `SessionMemoryPanel` | `기록` 화면 및 리포트 `이번 선택 기억하기` drawer | 숨김 | `기억하기` 버튼 |
| `ResultVersionSummary` | 리포트 `버전 기록` 탭 | 버전 배지만 노출 | `버전 기록` 탭 |
| `OutcomeFollowupPanel` | 리포트/기록의 `실제 결과 기록` drawer | 숨김 | `실제 결과 기록` 버튼 |
| `FollowupReevaluationPanel` | 리포트 `조건 추가 재평가` drawer | 숨김 | `조건 추가 재평가` 버튼 |

## 6. 화면별 개발 상세

### 6.1 App Shell

신규 컴포넌트 후보:

```text
frontend/src/components/app/
  app-shell.tsx
  top-navigation.tsx
  utility-menu.tsx
```

역할:

- 현재 active view 관리
- 공통 max width, background, navigation 배치
- `새 의사결정` primary CTA 제공
- locale/help 같은 유틸 메뉴 제공

초기 구현에서는 `react-router`를 새로 추가하지 말고 local state 기반 view 전환을 우선한다. URL deep link가 필요하다고 판단될 때만 routing library 도입을 별도 결정한다.

### 6.2 대시보드

신규 컴포넌트 후보:

```text
frontend/src/components/dashboard/
  dashboard-page.tsx
  dashboard-hero.tsx
  kpi-card-grid.tsx
  recent-report-list.tsx
  quick-template-panel.tsx
  followup-queue-panel.tsx
```

와이어프레임:

```text
[App Bar]

[Hero]
최근 의사결정 상태 요약
CTA: 새 의사결정 시작 / 최근 리포트 보기

[KPI 4장]
총 결정 수 | 후속 기록 필요 | 저장 메모리 수 | 고위험 판단 비율

[Main]
최근 리포트 목록

[Right Rail]
빠른 시작 템플릿
기억된 패턴 하이라이트
미완료 follow-up
```

데이터 우선순위:

1. 현재 세션의 `versions`, `latestVersion`, `sessionMemory.decisions`를 우선 사용한다.
2. persistent history API가 없으면 empty state를 정확히 보여준다.
3. 존재하지 않는 백엔드 API를 새로 호출하지 않는다.

첫 화면 금지 사항:

- 내부 stage명 노출 금지
- full result card 노출 금지
- 긴 입력폼 노출 금지
- `Agent chain`, `State Loader`, `Planner`, `Routing` 같은 개발자 용어 노출 금지

### 6.3 새 의사결정

신규 컴포넌트 후보:

```text
frontend/src/components/decision/
  decision-composer-page.tsx
  decision-composer-stepper.tsx
  decision-context-step.tsx
  decision-options-step.tsx
  decision-profile-step.tsx
  decision-review-step.tsx
  decision-draft-summary-rail.tsx
  template-picker-drawer.tsx
```

기존 `SimulationPage`에서 분리할 로직:

- `form`, `setForm`, `updateFormField`
- `useCasePresets`
- `usePriorityCatalog`
- `updatePrioritySlot`
- `handleSubmit`

단계 구성:

1. `상황`: 현재 상황 설명
2. `선택지`: A/B 선택지 입력
3. `프로필`: 나이, 직업, 리스크 허용도, 우선순위
4. `검토`: 입력 요약, 템플릿 여부, 실행 버튼

Case Presets:

- 첫 화면에 펼쳐두지 않는다.
- `템플릿에서 시작` 버튼을 누르면 drawer 또는 modal을 연다.
- 카테고리와 예시 케이스 select는 drawer 내부로 이동한다.
- 예시 적용 후 drawer를 닫고 review rail에 `템플릿 적용됨` 상태를 표시한다.

실행:

- 마지막 단계 또는 sticky summary rail의 primary CTA에서만 실행한다.
- 제출 중에는 입력을 read-only 또는 disabled로 바꾸고, 리포트 생성 상태로 이동한다.
- 오류 시 입력값은 보존한다.

### 6.4 리포트

신규 컴포넌트 후보:

```text
frontend/src/components/report/
  report-page.tsx
  report-hero.tsx
  report-tabs.tsx
  report-summary-panel.tsx
  decision-brief-panel.tsx
  scenario-comparison-tab.tsx
  risk-safety-tab.tsx
  execution-resources-tab.tsx
  version-history-tab.tsx
  report-action-bar.tsx
  analysis-trace-drawer.tsx
  followup-outcome-drawer.tsx
  reevaluation-drawer.tsx
```

리포트 첫 화면 구성:

```text
[Report Hero]
의사결정 제목
추천안 A/B/보류
신뢰도
주의 배지
CTA: 실제 결과 기록 / 조건 추가 재평가 / 이번 선택 기억하기 / 고급 진단 보기

[Summary Row]
핵심 이유 3개
주요 리스크 2개
다음 행동 3개

[Tabs]
요약 | 시나리오 비교 | 리스크·안전장치 | 실행 자료 | 버전 기록

[Right Rail]
입력 프로필 요약
우선순위
최근 관련 메모리
```

Advisor:

- `AdvisorCard` 전체를 그대로 첫 화면에 두지 말고 `ReportHero`와 summary로 분해한다.
- advisor decision, confidence, reason을 최상단 핵심 제품 가치로 사용한다.

상세 결과:

- `StateContextCard`와 `PlannerCard`는 `결정 브리프`로 합친다.
- `TimelineCard`는 `시나리오 비교` 탭에 둔다.
- `RiskCard`, `GuardrailCard`, `ReflectionCard`는 `리스크·안전장치` 탭에 둔다.
- `ReasoningCard`는 `요약` 탭의 `판단 근거 자세히` 버튼 뒤 또는 별도 section으로 둔다.
- `RecommendationPanel`은 `실행 자료` 탭으로 이동한다.
- `ResultVersionSummary`는 `버전 기록` 탭으로 이동한다.

내부 진단:

- `RoutingCard`
- raw selected path
- execution mode
- stage model plan
- skipped/fallback reason detail

위 정보는 `고급 진단 보기` 버튼을 눌렀을 때 drawer에서만 보인다.

### 6.5 기록

신규 컴포넌트 후보:

```text
frontend/src/components/records/
  records-page.tsx
  record-list.tsx
  record-detail-panel.tsx
  memory-editor-panel.tsx
  outcome-history-panel.tsx
```

역할:

- 저장된 결정 목록
- 실제 선택 결과
- 만족도/후회도/예상 밖 요인
- 세션 메모리 저장/삭제/초기화
- 재평가 이력

현재 `SessionMemoryPanel`은 아래로 분해한다.

- 저장 form: `memory-editor-panel`
- saved decisions list: `record-list` 또는 우측 rail
- sync status: `StatusBadge`
- 전체 초기화: destructive action으로 분리하고 확인 dialog 유지

`OutcomeFollowupPanel`은 기록 화면의 선택 기록 상세에도 연결한다.

### 6.6 인사이트

신규 컴포넌트 후보:

```text
frontend/src/components/insights/
  insights-page.tsx
  insight-metric-card.tsx
  decision-pattern-panel.tsx
  satisfaction-summary-panel.tsx
  advanced-diagnostics-panel.tsx
```

초기 구현 데이터:

- 현재 세션 기준 decision count
- session memory count
- latest result 기준 guardrail mode
- version count
- outcome follow-up 입력이 없으면 empty state

데이터가 부족할 때:

- chart를 억지로 만들지 않는다.
- `5건 이상부터 추세를 표시합니다` 같은 empty state를 보여준다.

고급 진단:

- 기본 탭은 `행동 인사이트`
- `고급 진단`은 버튼/탭 선택 후 노출
- 내부 agent/stage 용어는 이 영역에서만 허용한다.

## 7. 역할 분리 리팩토링 지침

### 7.1 `SimulationPage` 축소

현재 `simulation-page.tsx`는 orchestration, 입력, 결과, 상세 카드 배치를 모두 담당한다. 리팩토링 후 이 파일은 아래 중 하나로 정리한다.

1. 삭제하고 `AppShell`이 각 page를 직접 렌더링한다.
2. compatibility wrapper로 남기되 내부에서 새 workspace page를 렌더링한다.

권장:

- `SimulationPage`를 장기적으로 제거한다.
- migration 중에는 `SimulationWorkspace` 같은 상위 container로 역할을 옮긴다.

### 7.2 상태와 표시 분리

신규 hook 후보:

```text
frontend/src/hooks/
  use-simulation-workspace.ts
```

역할:

- active view
- latest result/version
- selected record
- drawer/modal open state
- dashboard summary derivation

기존 hook 유지:

- `useSimulationSubmit`: API submit/stream/progress/result orchestration 유지
- `useCasePresets`: preset fetch/apply 유지
- `usePriorityCatalog`: priority catalog fetch 유지
- `useSessionMemory`: session memory sync 유지

새 hook은 기존 hook을 대체하지 말고 조합한다.

### 7.3 View model 분리

신규 lib 후보:

```text
frontend/src/lib/simulation/
  report-view-model.ts
  dashboard-summary.ts
  diagnostics-view-model.ts
```

역할:

- advisor/result를 제품형 라벨로 변환
- internal enum을 사용자용 문구로 변환
- dashboard KPI 계산
- advanced diagnostics payload 구성

주의:

- backend response 자체를 mutate하지 않는다.
- LLM prompt/schema와 무관한 표시용 변환만 담당한다.

### 7.4 공통 UI 컴포넌트

신규 컴포넌트 후보:

```text
frontend/src/components/ui/
  empty-state.tsx
  inline-banner.tsx
  status-badge.tsx
  tab-list.tsx
  drawer.tsx
  confirm-dialog.tsx
```

이미 프로젝트에 범용 UI 디렉터리 규칙이 없다면 `components/common` 대신 `components/ui` 또는 각 feature 내부에 두고, 실제 재사용이 확인된 것만 공통화한다.

## 8. 내부 용어 치환 기준

기본 사용자 화면에서는 아래처럼 치환한다.

| 내부 용어 | 사용자용 용어 |
| --- | --- |
| State Loader | 상황 정리 |
| Planner | 판단 기준 정리 |
| Scenario A/B | 시나리오 비교 |
| Risk A/B | 리스크 검토 |
| A/B Reasoning | 선택지 비교 |
| Guardrail | 안전성 검토 |
| Advisor | 추천 |
| Reflection | 결과 검증 |
| Routing | 분석 경로 |
| Execution Mode | 분석 강도 |
| Agent chain | 분석 과정 |

원문 내부 용어가 필요한 곳:

- `고급 진단 보기`
- `인사이트 > 고급 진단`
- 개발자용 도움말

## 9. 인터랙션 및 접근성 요구사항

### 9.1 Loading

- 제출 즉시 실행 버튼 disabled
- 100ms 이내 버튼 상태 변경
- 400ms 이상 걸리면 사용자용 4단계 progress 표시
- 내부 stage 상세는 `진행 상세 보기` 버튼 뒤에 둔다.
- 완료 시 리포트 제목 또는 `ReportHero`로 focus 이동
- `aria-live="polite"`로 `결과가 준비되었습니다` 안내

### 9.2 Empty

- 대시보드: `첫 의사결정을 시작하세요`
- 리포트: `아직 분석 결과가 없습니다`
- 기록: `저장된 결정이 없습니다`
- 인사이트: `데이터가 충분하지 않습니다`

### 9.3 Error

- 입력값 보존
- page-level `InlineBanner`
- 실패 action 근처 inline error
- `다시 실행` 버튼 제공
- backend/model/env 오류 문구는 사용자에게 필요한 수준으로 요약하고, 원문 상세는 `오류 상세 보기` 버튼 뒤에 둔다.

### 9.4 Drawer/Modal

- 열릴 때 제목 또는 첫 입력으로 focus 이동
- 닫힐 때 trigger button으로 focus 복귀
- `Esc` 닫기 지원
- focus trap 적용
- destructive action은 확인 dialog 유지

### 9.5 Tabs

- `role="tablist"` 적용
- 현재 탭 `aria-selected`
- 좌우 화살표 이동 지원 또는 최소한 Tab/Enter/Space로 조작 가능
- tab panel은 제목과 연결

## 10. 단계별 실행 계획

### Phase 0. 기준 확인 및 브랜치

1. `git status --short --branch`로 현재 변경 확인
2. 사용자 변경은 되돌리지 않는다.
3. 필요 시 구현 브랜치 생성
   - 권장: `codex/product-ia-ui-refactor`
4. 기준 검증

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

백엔드 변경이 없다면 `./mvnw test`는 필수 baseline에서 제외 가능하다. 백엔드 파일을 건드리면 반드시 실행한다.

### Phase 1. AppShell과 화면 전환 골격

작업:

- `AppShell`
- `TopNavigation`
- active view state
- 대시보드/새 의사결정/리포트/기록/인사이트 placeholder

완료 조건:

- 첫 화면은 대시보드 placeholder
- 기존 full simulation page가 첫 화면에 보이지 않음
- `새 의사결정` 버튼으로 입력 화면 진입 가능
- 기존 simulation 기능은 아직 compatibility path로 접근 가능

검증:

```sh
cd frontend && npm run typecheck
```

### Phase 2. 새 의사결정 composer 분리

작업:

- `SimulationPage`의 form/preset/profile/decision 입력을 `DecisionComposerPage`로 이동
- `DecisionComposerStepper` 구현
- `TemplatePickerDrawer` 구현
- `DecisionDraftSummaryRail` 구현

보존:

- preset category/select/apply
- priority loading/error
- risk tolerance
- max priority selection
- locale별 preset label
- submit/resetOutput
- session memory priorMemory 주입

완료 조건:

- 사용자는 대시보드에서 버튼을 눌러 새 의사결정 화면으로 이동
- Case Presets는 버튼을 눌러야 나타남
- 입력 제출은 기존 `useSimulationSubmit`을 그대로 사용
- 오류 시 입력값이 보존됨

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### Phase 3. 리포트 화면 구성

작업:

- `ReportPage`
- `ReportHero`
- `ReportTabs`
- `ReportSummaryPanel`
- 기존 result card 재배치

보존:

- advisor decision/confidence/reason
- state context
- planner
- scenario A/B
- risk A/B
- reasoning
- guardrail
- reflection
- recommendation
- version summary

완료 조건:

- 실행 성공 후 사용자는 리포트 화면으로 이동
- 첫 리포트 viewport에는 추천, 신뢰도, 핵심 이유, 주요 리스크, CTA만 보임
- 시나리오/리스크/실행 자료/버전 기록은 탭 선택 후 보임
- 내부 routing/stage detail은 기본 화면에 보이지 않음

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### Phase 4. 고급 진단 drawer

작업:

- `AnalysisTraceDrawer`
- 내부 stage progress 상세
- `RoutingCard` 재배치
- execution mode, selected path, fallback/skipped reason 표시

완료 조건:

- `고급 진단 보기` 버튼을 누르기 전까지 내부 agent 단계가 보이지 않음
- drawer 안에서는 기존 디버깅 정보가 손실 없이 확인 가능

검증:

```sh
cd frontend && npm run typecheck
```

### Phase 5. 기록 및 메모리 화면

작업:

- `RecordsPage`
- `RecordList`
- `RecordDetailPanel`
- `MemoryEditorPanel`
- `OutcomeFollowup` drawer 연결

보존:

- save/delete/clear decisions
- sync status
- sync error
- local fallback
- outcome follow-up submit/update
- dataset candidate build action

노출:

- 리포트에서는 `이번 선택 기억하기` 버튼으로 memory drawer 열기
- 리포트/기록에서는 `실제 결과 기록` 버튼으로 outcome drawer 열기
- 기록 화면에서는 저장된 결정과 실제 결과를 관리

완료 조건:

- 기존 `SessionMemoryPanel` 기능을 잃지 않음
- 기존 `OutcomeFollowupPanel` 기능을 잃지 않음
- destructive clear confirm 유지

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### Phase 6. 재평가 drawer와 버전 기록

작업:

- `ReevaluationDrawer`
- `FollowupReevaluationPanel` 재배치
- `VersionHistoryTab`

보존:

- previous request 승계
- option follow-up 입력
- `submitReevaluation`
- version label
- result comparison

완료 조건:

- 리포트 첫 화면에는 재평가 폼이 펼쳐져 있지 않음
- `조건 추가 재평가` 버튼을 눌렀을 때만 폼 표시
- 재평가 완료 후 최신 결과가 리포트 hero에 반영
- 이전 결과는 `버전 기록` 탭에서 확인

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### Phase 7. 인사이트 화면

작업:

- `InsightsPage`
- metric cards
- empty state
- advanced diagnostics tab

초기 데이터:

- 현재 세션 기준
- 저장된 decisions count
- versions count
- latest guardrail mode
- latest confidence

완료 조건:

- 데이터가 부족하면 빈 차트 대신 empty state
- 고급 진단은 탭/버튼 선택 후 노출
- 내부 agent 용어는 사용자용 인사이트 탭에 노출하지 않음

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

### Phase 8. 시각 정리와 반응형 검증

작업:

- 기존 `card-surface`, `card-surface-strong`, `recommendation-surface`, `section-label` 재사용
- nested card 과다 사용 제거
- compact dashboard layout
- desktop/mobile spacing 정리
- text overflow 점검

주의:

- 새 색상 토큰은 최소화한다.
- 현재 amber/slate 톤은 유지하되, 제품이 한 가지 색으로만 보이지 않게 status badge는 의미 기반 색을 사용한다.
- 버튼 안 텍스트 줄바꿈/넘침을 확인한다.

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
cd frontend && npm run dev
```

수동 브라우저 확인:

- desktop width
- tablet width
- mobile width
- first viewport에 내부 진단이 보이지 않는지
- 모든 버튼/탭/drawer가 keyboard로 접근 가능한지

## 11. 수동 테스트 시나리오

아래 시나리오는 완료 전 반드시 확인한다.

1. 첫 진입
   - 대시보드가 보인다.
   - 거대한 입력폼과 내부 agent 상세가 보이지 않는다.

2. 템플릿 사용
   - `새 의사결정 시작`
   - `템플릿에서 시작`
   - 카테고리/예시 선택
   - 적용 후 composer 입력값이 채워짐

3. 직접 입력
   - 상황, 선택지, 프로필, 우선순위 입력
   - review step에서 submit

4. 실행 중
   - 버튼 disabled
   - 사용자용 progress 표시
   - 상세 stage는 버튼 뒤에만 표시

5. 성공 결과
   - 리포트 hero로 이동
   - 추천/신뢰도/핵심 이유가 먼저 보임
   - scenario/risk/recommendations/version은 탭 뒤에 있음

6. 고급 진단
   - `고급 진단 보기` 전에는 routing/stage detail이 보이지 않음
   - 버튼 클릭 후 기존 routing/progress 정보 확인 가능

7. 메모리
   - `이번 선택 기억하기`
   - 저장
   - 기록 화면에 반영
   - 삭제/전체 초기화 동작

8. 실제 결과
   - `실제 결과 기록`
   - 만족도/후회도/메모 저장
   - 저장 메시지 표시

9. 재평가
   - `조건 추가 재평가`
   - A/B worst case, rollback condition 입력
   - 재평가 실행
   - 버전 기록 탭에서 이전 결과 확인

10. 오류
   - backend/model 오류 발생 시 입력값 유지
   - 다시 실행 가능
   - 상세 오류는 버튼 뒤에 표시

## 12. 자동 검증 계획

프론트엔드 UI 리팩토링만 수행한 경우:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

브라우저 검증:

```sh
cd frontend && npm run dev
```

그 후 local app에서 주요 flow를 수동 확인한다. 가능하면 Playwright 또는 Browser plugin으로 다음을 확인한다.

- initial dashboard load
- composer step navigation
- template drawer open/close
- report tabs
- advanced diagnostics drawer
- memory/outcome/reevaluation drawers

백엔드 파일을 수정한 경우 추가:

```sh
cd backend && ./mvnw test
```

guardrail logic, threshold, prompt schema를 수정하지 않는 한 아래는 실행하지 않는다.

```sh
cd frontend && npm run eval:guardrail
cd frontend && npm run eval:guardrail-calibration
cd frontend && npm run eval:guardrail-thresholds
```

monitoring/metrics 코드를 수정하지 않는 한 아래는 실행하지 않는다.

```sh
cd frontend && npm run verify:monitoring
```

worker 코드를 수정하지 않는 한 worker commands는 실행하지 않는다.

## 13. 완료 조건

완료 보고 전 아래 조건을 모두 만족해야 한다.

1. 첫 화면이 대시보드로 바뀌었다.
2. 기존 단일 페이지의 모든 비중복 기능이 새 위치로 재배치되었다.
3. 내부 agent/stage 상세는 첫 화면과 리포트 기본 화면에서 보이지 않는다.
4. 내부 상세는 버튼, 탭, 드로어, 모달을 통해 추가 요청하면 확인 가능하다.
5. `Case Presets`는 버튼으로 열리는 template picker로 이동했다.
6. `OutcomeFollowupPanel`, `FollowupReevaluationPanel`, `SessionMemoryPanel` 기능이 유지된다.
7. `RecommendationPanel`과 `ResultVersionSummary` 기능이 유지된다.
8. error/loading/empty/result/follow-up/saved memory 상태가 모두 설계된 위치에서 동작한다.
9. `npm run typecheck`가 통과한다.
10. `npm run build`가 통과한다.
11. 백엔드 파일을 수정했다면 `./mvnw test`가 통과한다.
12. 수동 브라우저 확인 결과를 최종 보고에 포함한다.
13. `삭제/축소 기능 기록부`를 확인하고, 삭제/축소가 없으면 `없음`, 있으면 모든 항목을 최종 보고에 별도 섹션으로 포함한다.

## 14. 미정 결정

구현 중 아래 결정이 필요하면 임의 확장하지 말고 보수적으로 선택한다.

1. 제품명
   - 기본값: `Decision Workspace`
   - 한국어 표시: `의사결정 워크스페이스`

2. 라우팅
   - 기본값: local state tab navigation
   - URL deep link는 후속 개선

3. 기록 persistence
   - 기본값: 현존 session memory/local state 활용
   - 별도 report history API는 후속 백엔드 계획

4. 고급 진단 공개 범위
   - 기본값: 모든 사용자에게 열 수 있지만 기본 숨김
   - 운영자 전용 권한 모델은 후속 개선

5. 인사이트 chart
   - 기본값: 데이터 부족 시 empty state
   - mock chart 생성 금지

## 15. 잔여 리스크

- 현재 저장된 report history API가 없다면 대시보드/기록/인사이트의 일부 영역은 세션 기반으로만 동작한다.
- simulation 실행은 backend, model access, `OPENAI_API_KEY`, DB availability에 의존한다.
- recommendation, outcome follow-up, session memory sync는 각각 backend endpoint와 세션 상태에 의존한다.
- 많은 컴포넌트를 한 번에 이동하면 regression 위험이 있으므로 phase별 typecheck/build를 반복해야 한다.
- 첫 화면에서 정보를 줄이면 일부 power user가 상세를 찾기 어려울 수 있다. 따라서 `고급 진단 보기`, `자세히`, `탭` affordance를 명확히 해야 한다.
