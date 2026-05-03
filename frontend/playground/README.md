# Playground

이 디렉토리는 의사결정 시뮬레이션 프롬프트 체인을 웹앱 런타임과 분리해서 검증하기 위한 공간이다.
기본 모드는 ChatGPT 계정으로 로그인된 Codex CLI의 구독 기반 모델을 실제로 호출하는 방식이며, 필요하면 request payload 조합만 수행하는 compose-only 모드로도 실행할 수 있다.
현재 playground는 웹 런타임과 같은 `buildRoutingDecision()` source of truth를 재사용해 `execution_mode`, `selected_path`, `stage_model_plan`, `stage_fallback_plan`을 계산한다.

## 목적

- `prompts/*.md`를 실제 프롬프트 원본으로 관리한다.
- 단계별 입력 구조가 맞는지 빠르게 검증한다.
- planner -> scenario -> risk -> A/B reasoning -> guardrail -> advisor -> reflection 체인 연결이 올바른지 확인한다.
- 로컬 터미널에서 `codex exec`로 실제 결과 JSON을 생성한다.
- 필요 시 `CODEX_COMPOSE_ONLY=1`로 request composition만 수행할 수 있다.
- 테스트 케이스별 결과를 별도 output 폴더로 분리해 덮어쓰기를 방지한다.
- playground routing 정책과 stage 모델 계획이 웹과 의미상 동일하게 유지되는지 확인한다.

## 디렉토리 구조

```text
playground/
  README.md
  evaluations/
    checklist.md
  inputs/
    sample-input.json
    cases/
      case-01-career-stability.json
      case-02-career-growth.json
      case-03-startup-vs-job.json
      case-04-relationship.json
      case-05-relocation.json
      case-06-freelance-vs-fulltime.json
      case-07-manager-vs-ic.json
      case-08-smallbiz-vs-employment.json
      case-09-overseas-study-vs-work.json
      case-10-sideproject-vs-rest.json
  outputs/
    .gitkeep
  scripts/
    _common.sh
    run-planner.sh
    run-scenario.sh
    run-risk.sh
    run-ab-reasoning.sh
    run-guardrail.sh
    run-advisor.sh
    run-reflection.sh
    run-full-pipeline.sh
    run-case.sh
    run-all-cases.sh
```

## 스크립트 역할

- `scripts/run-planner.sh`
  - 입력 JSON과 `prompts/planner.md`를 합쳐 `planner-request.json`을 만든다.
  - `routing-result.json`의 `stage_model_plan.planner`를 읽어 `codex exec -m ...` 모델을 결정한다.
  - 기본적으로 `codex exec`를 호출해 `planner-result.json`을 만든다.
  - 모델 미실행 대비용 `planner-result.stub.json`도 함께 만든다.
- `scripts/run-scenario.sh`
  - `A`, `B`, `all` 중 하나를 받아 scenario 요청 payload를 만든다.
  - planner 결과 파일이 있으면 우선 사용하고, 없으면 stub 결과를 사용한다.
  - `routing-result.json`의 `stage_model_plan.scenario_a`, `stage_model_plan.scenario_b`를 사용한다.
  - 기본적으로 `scenario-a-result.json`, `scenario-b-result.json`을 생성한다.
  - 모델 미실행 대비용 stub도 함께 만든다.
- `scripts/run-risk.sh`
  - scenario 결과를 바탕으로 risk 요청 payload를 만든다.
  - `routing-result.json`의 `stage_model_plan.risk_a`, `stage_model_plan.risk_b`를 사용한다.
  - 기본적으로 `risk-a-result.json`, `risk-b-result.json`을 생성한다.
  - 모델 미실행 대비용 stub도 함께 만든다.
- `scripts/run-ab-reasoning.sh`
  - planner, scenario, risk 결과를 합쳐 A/B reasoning 요청 payload를 만든다.
  - `routing-result.json`의 `stage_model_plan.ab_reasoning`를 사용한다.
  - 기본적으로 `reasoning-result.json`을 생성한다.
  - 모델 미실행 대비용 stub도 함께 만든다.
- `scripts/run-guardrail.sh`
  - 웹 런타임과 동일하게 deterministic guardrail 로직을 사용한다.
  - full 경로에서는 `evaluateSimulationGuardrail`, non-full 경로에서는 `deriveSelectiveGuardrailEvaluation`을 사용한다.
  - 기본적으로 `guardrail-result.json`을 생성하며, compose-only 여부와 무관하게 같은 deterministic 결과를 남긴다.
- `scripts/run-advisor.sh`
  - planner, scenario, risk, reasoning, guardrail 결과를 합쳐 advisor 요청 payload를 만든다.
  - `routing-result.json`의 `stage_model_plan.advisor`를 사용한다.
  - non-full 경로에서는 웹과 동일하게 guardrail 결과 없이 먼저 advisor를 실행한다.
  - 기본적으로 `advisor-result.json`을 생성한다.
  - compose-only 검증을 위한 `advisor-result.stub.json`도 함께 만든다.
- `scripts/run-reflection.sh`
  - full 경로에서는 `stage_model_plan.reflection` 모델로 live reflection을 실행한다.
  - non-full 경로에서는 웹과 같은 derived reflection 로직을 사용한다.
  - 기본적으로 `reflection-result.json`을 생성한다.
  - compose-only 또는 결과 점검용 `reflection-result.stub.json`도 함께 만든다.
- `scripts/run-full-pipeline.sh`
  - state_loader -> router -> planner 이후 routing 결과에 따라 selective execution을 수행한다.
  - full 경로는 scenario -> risk -> A/B reasoning -> guardrail -> advisor -> reflection 순서다.
  - standard/careful/light 경로는 advisor 이후 derived guardrail, derived reflection을 생성한다.
  - 입력 파일 경로와 output 디렉토리를 인자로 받을 수 있다.
  - 실행 완료 후 `summary.md`를 생성한다.
- `scripts/run-case.sh`
  - 테스트 케이스 파일 1개를 받아 케이스별 output 폴더를 만들고 전체 파이프라인을 실행한다.
- `scripts/run-all-cases.sh`
  - `playground/inputs/cases/*.json` 전체를 순회하며 모든 케이스를 실행한다.

## 단일 케이스 실행 방법

저장소 루트에서 실행한다.

```bash
./playground/scripts/run-case.sh ./playground/inputs/cases/case-01-career-stability.json
```

또는 케이스 파일과 output 디렉토리를 직접 넘겨 전체 파이프라인을 실행할 수 있다.

```bash
./playground/scripts/run-full-pipeline.sh ./playground/inputs/cases/case-01-career-stability.json
./playground/scripts/run-full-pipeline.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
```

기본적으로 실제 Codex 모델을 호출한다. 이 모드는 일반 터미널에서 실행해야 하며, 미리 `codex` CLI가 설치되어 있고 ChatGPT 계정으로 로그인되어 있어야 한다.

```bash
codex login
./playground/scripts/run-case.sh ./playground/inputs/cases/case-01-career-stability.json
```

## 전체 케이스 실행 방법

```bash
./playground/scripts/run-all-cases.sh
```

## 단계별 스크립트 직접 실행

```bash
./playground/scripts/run-planner.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-scenario.sh all ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-risk.sh all ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-ab-reasoning.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-guardrail.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-advisor.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
./playground/scripts/run-reflection.sh ./playground/inputs/cases/case-01-career-stability.json ./playground/outputs/case-01-career-stability
```

request 조합만 보고 싶다면 compose-only 모드를 쓴다.

```bash
CODEX_COMPOSE_ONLY=1 ./playground/scripts/run-case.sh ./playground/inputs/cases/case-01-career-stability.json
```

## 라우팅 및 모델 계획

- `scripts/run-router.sh`는 shell heuristic을 쓰지 않고 웹의 [`buildRoutingDecision()`](/Users/switch/Development/Web/life_simulator/src/server/routing/request-router.ts)를 직접 재사용한다.
- `routing-result.json`에는 `execution_mode`, `selected_path`, `selected_model`, `stage_model_plan`, `stage_fallback_plan`, `risk_profile`, `reasons`가 기록된다.
- live stage의 `provider_payload.model`은 `routing-result.json`의 stage별 모델 계획과 맞춰진다.
- `guardrail`은 모델 호출이 아니라 deterministic stage다.
- `summary.md`에는 routing reason과 stage model plan이 같이 표시된다.

모델 override가 필요하면 아래 순서를 따른다.

- `PLAYGROUND_FORCE_MODEL`: 모든 live stage 모델을 강제로 덮는 playground 전용 override
- `CODEX_MODEL`: 하위 호환용 전역 override

둘 다 없으면 `routing-result.json`의 `stage_model_plan`이 source of truth다.

## sample-input.json 수정 방법

- `playground/inputs/sample-input.json`에서 `userProfile`과 `decision` 값을 바꾼다.
- 필수 키는 유지한다.
- JSON 문법이 깨지면 스크립트가 명확한 에러와 함께 중단된다.

## 케이스별 output 폴더 구조

각 케이스는 아래처럼 별도 폴더에 저장된다.

```text
playground/outputs/case-01-career-stability/
  input.json
  planner-request.json
  planner-preview.md
  planner-result.json
  scenario-a-request.json
  scenario-a-preview.md
  scenario-a-result.json
  scenario-b-request.json
  scenario-b-preview.md
  scenario-b-result.json
  risk-a-request.json
  risk-a-preview.md
  risk-a-result.json
  risk-b-request.json
  risk-b-preview.md
  risk-b-result.json
  reasoning-request.json
  reasoning-preview.md
  reasoning-result.json
  guardrail-request.json
  guardrail-preview.md
  guardrail-result.json
  advisor-request.json
  advisor-preview.md
  advisor-result.json
  reflection-request.json
  reflection-preview.md
  reflection-result.json
  summary.md
```

stub 결과 파일도 함께 생성될 수 있다.

## summary.md 보는 법

- `summary.md`는 전체 JSON을 열지 않고도 케이스 품질을 빠르게 보는 용도다.
- 입력 요약, routing 정책, stage model plan, planner factors, scenario A/B, risk A/B, A/B reasoning, guardrail 상태, advisor 추천, reflection 점수가 한 파일에 모여 있다.
- 사람이 여러 케이스를 순서대로 훑어보기에 가장 먼저 열어야 하는 파일이다.

## evaluations/checklist.md 활용 방법

- [`evaluations/checklist.md`](/Users/switch/Development/Web/life_simulator/playground/evaluations/checklist.md) 는 케이스별 수동 평가 기준이다.
- `summary.md`를 먼저 읽고, 필요할 때 해당 JSON 원문을 열어 확인한다.
- 각 케이스에 대해 Realism, Consistency, Profile Alignment, Recommendation Clarity를 1~5로 기록한다.
- reflection 결과가 있으면 수동 점검 전에 자동 평가 초안을 참고할 수 있다.

## 실제 LLM 연결 시 재사용 포인트

- 프롬프트 원본은 모두 루트 `prompts/*.md`에 있다.
- Playground의 `*-request.json` 구조는 향후 CLI 호출이나 API 호출 어댑터의 입력으로 재사용할 수 있다.
- Next.js 앱에서는 [`src/lib/prompts.ts`](/Users/switch/Development/Web/life_simulator/src/lib/prompts.ts)가 루트 `prompts/*.md`를 읽도록 되어 있다.
- 실제 모델 호출을 붙일 때는 [`src/lib/openai.ts`](/Users/switch/Development/Web/life_simulator/src/lib/openai.ts) 또는 별도 CLI 실행부만 바꾸면 된다.
- 수동 또는 외부 모델 결과를 끼워 넣고 싶다면 각 케이스 폴더 안의 `*-result.json` 파일을 만들면 스크립트가 stub보다 실제 결과를 우선 사용한다.
