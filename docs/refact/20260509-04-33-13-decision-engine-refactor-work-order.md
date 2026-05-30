# Decision Engine Refactor Work Order

작성 시각: 2026-05-09 04:33:13 KST

## 목적

`docs/report/20260509_decision_engine_separation_feasibility.md`의 분석 결과를 실제 코드 수정 가능한 개발 계획으로 전환한다.

현재 목표는 별도 서비스 분리가 아니라, 같은 Spring Boot 백엔드 안에서 현재 `/api/simulate` 기능을 **앱 어댑터**와 **의사결정 엔진 코어**로 분리하는 것이다. 현재 화면이 보내는 요청 형식과 현재 UI가 기대하는 응답 형식은 유지한다. 이후 범용 의사결정 엔진으로 확장할 수 있도록 contract, prompt pack, fallback builder, guardrail 입력을 단계적으로 분리한다.

## 최종 목표

리팩터 완료 후 구조는 아래 책임을 분리해야 한다.

- `api`, `security`, `cases`, `priorities`, `monitoring`, `logging`, `worker`: 현재 웹앱과 운영 계층
- `engine`: 의사결정 실행 코어
- `engine/domain/life`: 현재 Life Simulator 도메인 팩
- `engine/contract`: 엔진 내부 입력/출력 계약
- `engine/orchestration`: stage 실행 순서와 progress 이벤트
- `engine/routing`: 실행 깊이 선택
- `engine/guardrail`: 추상화된 판단 신호 기반 guardrail 계산
- `engine/llm`: LLM provider port와 adapter
- `simulation`: 가능하면 최종적으로 제거하거나 현재 UI response mapper만 남긴다.

## 공통 규칙

- 기존 `/api/simulate` JSON 응답 shape를 깨지 않는다.
- 기존 `/api/simulate` NDJSON progress event shape를 깨지 않는다.
- `frontend/src/lib/types.ts`와 호환되는 응답을 계속 반환한다.
- `GET /api/cases`, `GET /api/priorities`, monitoring endpoint shape는 이번 리팩터 중 변경하지 않는다.
- Codex CLI subscription auth 기본 경로를 유지한다.
- OpenAI API key를 프론트 환경변수로 요구하지 않는다.
- logging, metrics, guardrail event, anomaly event 저장 경로를 끊지 않는다.
- fallback-on-error 동작을 유지한다.
- prompt JSON schema strictness를 완화하지 않는다.
- 파일당 700라인을 넘기지 않는다. 500라인을 넘으면 분리 가능성을 먼저 검토한다.
- 기존 큰 파일은 이번 리팩터로 더 커지게 만들지 않는다.
- 신규 Java 파일은 가능한 한 250라인 이하로 유지한다.
- 신규 prompt 파일은 가능한 한 250라인 이하로 유지한다.
- 단순 package move와 behavior change를 같은 커밋에 크게 섞지 않는다.
- 각 phase 끝에서 backend test를 먼저 통과시킨 뒤 다음 phase로 넘어간다.

## 연속 실행 지침

이 문서는 Codex가 중간에 멈추지 않고 끝까지 구현하기 위한 실행 지침이다.

- Codex는 Phase 0부터 Phase 10까지 순서대로 진행한다.
- 각 Phase가 끝나면 해당 Phase의 검증 명령을 실행한다.
- 검증이 실패하면 다음 Phase로 넘어가지 말고 같은 Phase 안에서 원인을 수정한 뒤 다시 검증한다.
- 한 Phase의 검증이 통과하면 사용자 확인을 기다리지 말고 다음 Phase로 진행한다.
- 사용자가 중단을 명시하지 않는 한 계획서 전체 완료 조건을 만족할 때까지 계속 진행한다.
- 구현 중 계획과 실제 코드가 어긋나면 코드 구조를 우선 확인하고, 문서의 의도에 맞는 보수적인 조정안을 적용한다.
- Phase 중간에 더 작은 작업 단위가 필요하면 자체적으로 sub-step을 만들고 진행한다.
- 파일 이동이나 package rename을 할 때는 import 정리, 테스트 실행, response shape 확인까지 같은 Phase에서 마무리한다.
- 기존 사용자가 만든 변경을 되돌리지 않는다. 충돌이 없으면 그대로 보존하고, 충돌이 있으면 해당 파일의 현재 내용을 기준으로 맞춰 수정한다.
- 파괴적 git 명령은 사용하지 않는다. `git reset --hard`, `git checkout --`, 강제 push는 금지한다.

## 중간 커밋 지침

Codex는 장시간 리팩터 중 안전한 복구 지점을 만들기 위해 필요하면 중간중간 커밋한다.

- 각 Phase가 독립적으로 검증을 통과하면 커밋해도 된다.
- 커밋 전에는 `git status --short`로 변경 범위를 확인한다.
- 커밋에는 해당 Phase에서 수정한 파일만 stage한다.
- 사용자 또는 다른 작업자가 만든 무관한 변경은 stage하지 않는다.
- 문서 파일이 `.gitignore`에 걸려 있으면 필요한 경우 `git add -f`를 사용한다.
- 커밋 메시지는 각 Phase의 `커밋 포인트`에 적힌 메시지를 우선 사용한다.
- 테스트가 실패한 상태에서는 커밋하지 않는다. 단, 실패 원인을 문서화하기 위한 명시적 WIP 커밋은 사용하지 않는다.
- 여러 Phase를 한 번에 묶는 커밋보다 Phase 단위 커밋을 우선한다.
- package move만 한 커밋과 behavior change 커밋을 가능하면 분리한다.
- 커밋 후에도 다음 Phase로 계속 진행한다.

## 사용자 확인이 필요한 경우

아래 상황이 아니면 Codex는 질문으로 멈추지 않는다.

- API request/response shape를 의도적으로 바꿔야만 다음 단계가 가능한 경우
- DB migration table 이름이나 기존 운영 데이터 구조를 바꿔야 하는 경우
- 외부 서비스 credential, 결제, 배포, push, PR 생성 같은 외부 영향이 필요한 경우
- 사용자 변경과 현재 작업이 같은 파일에서 직접 충돌해 어느 쪽을 보존해야 할지 판단할 수 없는 경우
- 테스트 실패가 현재 코드 문제가 아니라 환경 문제로 보이며, 우회하면 잘못된 결론이 될 수 있는 경우

## 현재 기준 파일 라인 수

현재 Java 파일은 700라인을 넘지 않는다. 다만 아래 파일은 역할이 커질 가능성이 높으므로 분리 우선순위가 높다.

- `backend/src/main/java/com/lifesimulator/backend/config/SimulatorProperties.java`: 약 482라인
- `backend/src/main/java/com/lifesimulator/backend/simulation/SimulationResponseFactory.java`: 약 333라인
- `backend/src/main/java/com/lifesimulator/backend/monitoring/MonitoringQueryService.java`: 약 304라인
- `backend/src/main/java/com/lifesimulator/backend/llm/OpenAiJsonClient.java`: 약 298라인
- `backend/src/main/java/com/lifesimulator/backend/logging/SimulationLogRepository.java`: 약 282라인
- `backend/src/main/java/com/lifesimulator/backend/simulation/StageExecutionService.java`: 약 230라인
- `backend/src/main/java/com/lifesimulator/backend/api/SimulationController.java`: 약 217라인

이번 리팩터의 핵심 대상은 `SimulationResponseFactory`, `StageInputFactory`, `GuardrailEvaluationService`, prompt pack, `PriorityCatalogService`, `CasePresetService`다.

## 비범위

- 이번 계획에서 프론트 UI 디자인은 변경하지 않는다.
- 이번 계획에서 별도 repo 또는 별도 배포 서비스로 분리하지 않는다.
- 이번 계획에서 A/B 선택지를 다중 선택지로 확장하지 않는다.
- 이번 계획에서 사용자 계정, 결제, 장기 메모리 DB를 추가하지 않는다.
- 이번 계획에서 OpenAI API mode를 기본값으로 바꾸지 않는다.
- 이번 계획에서 monitoring dashboard JSON이나 Grafana 설정을 재설계하지 않는다.

## 목표 패키지 구조

최종 목표 구조 예시:

```text
backend/src/main/java/com/lifesimulator/backend/
  api/
  cases/
  config/
  database/
  logging/
  monitoring/
  priorities/
  security/
  worker/
  engine/
    contract/
    orchestration/
    progress/
    routing/
    guardrail/
    llm/
    prompt/
    schema/
    domain/
      life/
        contract/
        prompt/
        response/
        mapping/
```

현실적으로는 package move가 많아질 수 있으므로, 아래 순서로 적용한다.

1. 기존 package를 유지한 채 신규 `engine/*` 타입과 mapper를 추가한다.
2. 기존 `simulation/*`, `routing/*`, `guardrail/*`, `llm/*` 구현을 새 engine contract를 쓰도록 바꾼다.
3. 동작이 안정되면 package를 `engine/*`로 이동한다.
4. 현재 UI 응답 조립은 `engine/domain/life/response` 또는 `simulation` compatibility layer로 남긴다.

## Phase 0: Baseline 고정

목표:

현재 동작 기준을 먼저 고정한다. 이후 리팩터가 response shape, progress event, fallback 동작을 깨뜨렸는지 바로 확인할 수 있어야 한다.

작업:

1. `backend/src/test`에 기존 테스트가 부족하면 최소 smoke test를 추가한다.
2. `/api/simulate` mock provider JSON 응답 shape를 검증하는 테스트를 추가한다.
3. `/api/simulate` NDJSON streaming 이벤트 순서를 검증하는 테스트를 추가한다.
4. `GET /api/priorities`와 `GET /api/cases`가 기존 shape를 유지하는지 테스트한다.

권장 테스트 파일:

- `backend/src/test/java/com/lifesimulator/backend/api/SimulationControllerTest.java`
- `backend/src/test/java/com/lifesimulator/backend/priorities/PriorityCatalogControllerTest.java`
- `backend/src/test/java/com/lifesimulator/backend/cases/CasesControllerTest.java`

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/test
git commit -m "test: lock current simulation api contract"
```

## Phase 1: 현재 API 호환을 유지한 엔진 Facade 도입

목표:

`SimulationController`가 orchestration 세부 구현을 직접 알지 않도록, 현재 요청을 받아 현재 응답을 반환하는 엔진 facade를 만든다.

작업:

1. `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionEngineRequest.java` 추가
2. `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionEngineResult.java` 추가
3. `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionEngineOptions.java` 추가
4. `backend/src/main/java/com/lifesimulator/backend/engine/DecisionEngine.java` 추가
5. 기존 `SimulationService`가 `DecisionEngine` 구현체 역할을 하도록 얇게 감싼다.
6. `SimulationController`는 `SimulationService.run(...)`를 직접 호출하되, 내부가 engine contract를 통과하도록 한다.

초기 contract 권장 형태:

```java
public record DecisionEngineRequest(
  JsonNode payload,
  String requestId,
  String traceId,
  String locale
) {}
```

```java
public record DecisionEngineOptions(
  boolean progressEnabled
) {}
```

```java
public record DecisionEngineResult(
  JsonNode response,
  SimulationExecutionEnvelope envelope
) {}
```

주의:

- Phase 1에서는 `JsonNode` 기반 contract를 허용한다.
- typed DTO 전환은 Phase 3에서 한다.
- 이 단계의 목적은 behavior change가 아니라 호출 경계 생성이다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/engine backend/src/main/java/com/lifesimulator/backend/simulation backend/src/main/java/com/lifesimulator/backend/api
git commit -m "refactor: introduce decision engine facade"
```

## Phase 2: `SimulationResponseFactory` 역할 분리

목표:

`SimulationResponseFactory`가 맡고 있는 validation, fallback seed 생성, UI response composition 책임을 분리한다. 이 파일은 이번 리팩터에서 가장 먼저 정리해야 할 병목이다.

현재 문제:

- request validation
- deterministic fallback response seed
- state context fallback
- planner fallback
- scenario/risk/reasoning/advisor/reflection fallback
- output schema 생성
- deep merge

위 역할이 한 클래스에 섞여 있다.

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/contract/LifeDecisionRequestValidator.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/response/LifeSimulationSeedFactory.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/response/LifeStateSeedFactory.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/response/LifeStageSeedFactory.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/response/LifeResponseMerger.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/response/LifeResponseSchemaFactory.java`

기존 파일 처리:

- `SimulationResponseFactory`는 compatibility facade로 축소한다.
- 목표 라인 수는 120라인 이하로 줄인다.
- 기존 public method 이름은 가능하면 유지한다.

분리 기준:

- `validateRequest(...)` -> `LifeDecisionRequestValidator`
- `deterministicResponse(...)` -> `LifeSimulationSeedFactory`
- `stateContext(...)` -> `LifeStateSeedFactory`
- `planner/scenario/risk/reasoning/guardrail/advisor/reflection seed` -> `LifeStageSeedFactory`
- `mergeGenerated(...)`, `deepMerge(...)` -> `LifeResponseMerger`
- `outputSchema(...)` -> `LifeResponseSchemaFactory`

주의:

- fallback JSON key 이름을 절대 바꾸지 않는다.
- `stateContext` camelCase 응답 key를 유지한다.
- `request_id`, `routing`, `planner`, `guardrail`, `advisor`, `reflection` required field를 유지한다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/simulation/SimulationResponseFactory.java backend/src/main/java/com/lifesimulator/backend/engine/domain/life
git commit -m "refactor: split life simulation response factories"
```

## Phase 3: Stage input을 domain mapper로 분리

목표:

`StageInputFactory`가 현재 UI response shape와 stage prompt shape를 직접 모두 알지 않도록 한다.

현재 문제:

- 모든 stage input key를 한 파일에서 직접 구성한다.
- `optionA`, `optionB`, `scenarioA`, `riskA` 같은 life-domain key가 core stage runner에 직접 노출된다.
- 범용 엔진 stage runner로 확장하려면 domain별 stage input mapper가 필요하다.

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/prompt/StageInputMapper.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/prompt/LifeStageInputMapper.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/prompt/LifeOptionSelector.java`

권장 interface:

```java
public interface StageInputMapper {
  JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  );
}
```

작업:

1. 기존 `StageInputFactory`는 `StageInputMapper`에 위임하는 facade로 줄인다.
2. life-specific option selection은 `LifeOptionSelector`로 뺀다.
3. `StageExecutionService`는 `StageInputFactory` 대신 `StageInputMapper`를 주입받도록 바꾼다.

주의:

- prompt에 전달되는 JSON key는 그대로 유지한다.
- `optionLabel`, `selectedOption`, `executionMode`, `stageName`을 유지한다.
- `caseInput`, `routing`, `stateContext`, upstream stage result key를 유지한다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/simulation/StageInputFactory.java backend/src/main/java/com/lifesimulator/backend/simulation/StageExecutionService.java backend/src/main/java/com/lifesimulator/backend/engine/prompt backend/src/main/java/com/lifesimulator/backend/engine/domain/life/prompt
git commit -m "refactor: isolate life stage input mapping"
```

## Phase 4: Guardrail 입력 DTO 분리

목표:

`GuardrailEvaluationService`가 현재 response JSON path를 직접 읽지 않도록 한다. Guardrail 코어는 추상화된 signal DTO를 받고, life-domain mapper가 현재 응답에서 signal을 추출한다.

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/guardrail/GuardrailInput.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/guardrail/GuardrailResultFactory.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/guardrail/LifeGuardrailSignalMapper.java`

권장 DTO:

```java
public record GuardrailInput(
  double riskScore,
  double confidenceScore,
  double uncertaintyScore,
  boolean highRisk,
  boolean lowConfidence,
  boolean ambiguityHigh,
  boolean reasoningConflict,
  boolean missingInfo
) {}
```

작업:

1. 현재 `GuardrailEvaluationService.evaluate(response, routingDecision)`는 compatibility method로 유지한다.
2. 내부에서 `LifeGuardrailSignalMapper`가 `GuardrailInput`을 만든다.
3. `GuardrailResultFactory`가 trigger, strategy, final_mode JSON을 만든다.
4. 이후 범용 엔진에서는 `GuardrailInput`만 넣어도 guardrail 계산이 가능하게 한다.

주의:

- 기존 trigger enum을 유지한다.
- 기존 strategy enum을 유지한다.
- `normal`, `cautious`, `blocked` mode를 유지한다.
- low confidence threshold `0.62`, high risk threshold `0.7`은 이동만 하고 변경하지 않는다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/guardrail backend/src/main/java/com/lifesimulator/backend/engine/guardrail backend/src/main/java/com/lifesimulator/backend/engine/domain/life/guardrail
git commit -m "refactor: decouple guardrail signals from response json"
```

## Phase 5: Prompt pack 분리

목표:

현재 prompt 파일을 “engine stage prompt”가 아니라 “life domain prompt pack”으로 명확히 분리한다.

신규 리소스 구조:

```text
backend/src/main/resources/prompts/
  life/
    state_loader.md
    planner.md
    scenario.md
    risk.md
    ab_reasoning.md
    guardrail.md
    advisor.md
    reflection.md
```

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/prompt/PromptPack.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/prompt/PromptRepository.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/prompt/LifePromptPack.java`

작업:

1. 기존 `backend/src/main/resources/prompts/*.md`는 compatibility를 위해 잠시 유지한다.
2. 실제 loader는 `prompts/life/*.md`를 먼저 읽도록 바꾼다.
3. fallback으로 기존 root prompt path를 읽을 수 있게 한다.
4. `StagePromptRepository`는 `PromptRepository`에 위임하는 facade로 줄인다.

주의:

- prompt 내용 자체는 이 phase에서 바꾸지 않는다.
- 파일 이동으로 인해 classpath resource path가 깨지지 않게 테스트한다.
- prompt 파일 하나가 250라인을 넘으면 도메인 규칙과 schema 예시를 분리하는 방안을 검토한다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/simulation/StagePromptRepository.java backend/src/main/java/com/lifesimulator/backend/engine/prompt backend/src/main/java/com/lifesimulator/backend/engine/domain/life/prompt backend/src/main/resources/prompts
git commit -m "refactor: move prompts into life prompt pack"
```

## Phase 6: Routing policy를 engine policy로 분리

목표:

현재 `SimulationRouter`를 life request에 묶인 router에서 엔진 routing policy로 분리한다.

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/routing/ExecutionMode.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/routing/ExecutionPath.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/routing/DecisionRoutingPolicy.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/routing/LifeRoutingSignalExtractor.java`

작업:

1. `risk_tolerance`, context length, priority count, ambiguity keyword 탐지는 `LifeRoutingSignalExtractor`로 이동한다.
2. `DecisionRoutingPolicy`는 추출된 signal로 `light`, `standard`, `careful`, `full`을 결정한다.
3. 기존 `SimulationRouter`는 compatibility facade로 유지하거나 `engine/routing`으로 package move한다.

주의:

- selected path 배열 값은 변경하지 않는다.
- stage model plan key는 변경하지 않는다.
- `state_unknown_count`, `estimated_tokens`, `risk_profile` 응답 shape를 유지한다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/routing backend/src/main/java/com/lifesimulator/backend/engine/routing backend/src/main/java/com/lifesimulator/backend/engine/domain/life/routing
git commit -m "refactor: separate life routing signals from execution policy"
```

## Phase 7: LLM provider package 정리

목표:

LLM provider는 엔진 코어 port로 유지하되, 설정과 adapter 책임을 분리한다.

작업:

1. `LlmJsonClient`, `LlmJsonRequest`, `LlmJsonResult`, `LlmUsage`를 `engine/llm` package로 이동한다.
2. `CodexCliJsonClient`, `OpenAiJsonClient`, `MockJsonClient`도 `engine/llm` 하위에 둔다.
3. `LlmClientConfig` import를 갱신한다.
4. `OpenAiJsonClient`는 300라인 근처이므로 기능 추가 금지. 가격표가 더 커지면 별도 `OpenAiTokenPricing` 파일로 분리한다.

주의:

- provider selection env는 유지한다.
- `SIMULATOR_LLM_PROVIDER=codex` 기본값을 유지한다.
- `OPENAI_API_KEY` 요구 조건을 변경하지 않는다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/llm backend/src/main/java/com/lifesimulator/backend/engine/llm backend/src/main/java/com/lifesimulator/backend/config
git commit -m "refactor: move llm adapters under engine"
```

## Phase 8: App-only 기능 경계 명확화

목표:

케이스 preset, priority catalog, monitoring, logging, worker를 엔진 코어와 명확히 분리한다.

작업:

1. `CasePresetService`는 app-only 서비스로 문서화한다.
2. `PriorityCatalogService`는 life UI catalog provider로 문서화한다.
3. `SimulatorProperties.Frontend.casesDir` 이름을 바로 바꾸지는 않는다. 별도 phase에서 `app.casesDir`로 이전한다.
4. logging envelope는 engine result를 저장하는 adapter로 남긴다.
5. monitoring query는 app operations 계층으로 남긴다.

권장 package move는 별도 커밋으로 처리한다.

- `cases` -> 유지 가능
- `priorities` -> 유지 가능
- `logging` -> 유지 가능
- `monitoring` -> 유지 가능
- `worker` -> 유지 가능

주의:

- 이번 phase에서 DB migration table 이름은 변경하지 않는다.
- `life_simul_*` table 이름은 그대로 둔다.
- monitoring API response shape는 변경하지 않는다.

검증:

```sh
cd backend && ./mvnw test
```

DB 사용 환경이면 추가 확인:

```sh
cd backend && BACKEND_DATABASE_ENABLED=true ./mvnw test
```

커밋 포인트:

```sh
git add backend
git commit -m "refactor: clarify app adapters around decision engine"
```

## Phase 9: 범용 contract 준비

목표:

현재 UI contract와 별개로, 이후 범용 의사결정 엔진에서 쓸 수 있는 typed contract를 추가한다. 이 phase에서는 아직 `/api/simulate` request shape를 변경하지 않는다.

신규 파일:

- `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionSubject.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionOption.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionQuestion.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionPreference.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/DecisionContext.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/GenericDecisionRequest.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/contract/GenericDecisionResult.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/mapping/LifeRequestToGenericDecisionMapper.java`
- `backend/src/main/java/com/lifesimulator/backend/engine/domain/life/mapping/GenericDecisionToLifeResponseMapper.java`

권장 contract:

```java
public record DecisionSubject(
  String type,
  Map<String, Object> attributes
) {}
```

```java
public record DecisionOption(
  String id,
  String label,
  Map<String, Object> attributes
) {}
```

```java
public record GenericDecisionRequest(
  DecisionSubject subject,
  DecisionQuestion question,
  DecisionContext context,
  DecisionPreference preference,
  List<DecisionOption> options,
  Map<String, Object> memory,
  Map<String, Object> hints
) {}
```

주의:

- Phase 9는 새 contract 추가와 mapper skeleton까지가 목표다.
- 기존 `/api/simulate` 실행 흐름을 바로 generic contract로 완전히 교체하지 않아도 된다.
- generic contract는 최소 2개 이상의 option을 받을 수 있게 설계하되, 현재 domain mapper는 A/B만 사용한다.

검증:

```sh
cd backend && ./mvnw test
```

커밋 포인트:

```sh
git add backend/src/main/java/com/lifesimulator/backend/engine/contract backend/src/main/java/com/lifesimulator/backend/engine/domain/life/mapping
git commit -m "feat: add generic decision engine contract"
```

## Phase 10: 프론트 타입 영향 확인

목표:

백엔드 분리 후에도 프론트 타입과 UI 렌더링이 깨지지 않는지 확인한다.

작업:

1. `frontend/src/lib/types.ts`의 `SimulationRequest`, `SimulationResponse`, progress event union과 백엔드 응답을 비교한다.
2. 필요한 경우 backend test fixture를 프론트 타입 기준 문서로 남긴다.
3. 프론트 코드는 가능하면 수정하지 않는다.
4. 프론트 수정이 필요하다면 API client boundary 이하로 제한한다.

검증:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

선택 검증:

```sh
cd backend && SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
cd frontend && npm run dev
```

수동 확인:

- 케이스 목록 로딩
- 우선순위 목록 로딩
- 시뮬레이션 실행
- progress stage 표시
- 결과 카드 표시
- guardrail 카드 표시

커밋 포인트:

```sh
git add frontend backend docs/refact
git commit -m "test: verify frontend contract after engine refactor"
```

## 전체 검증 체크리스트

백엔드 필수:

```sh
cd backend && ./mvnw test
```

프론트 타입/빌드:

```sh
cd frontend && npm run typecheck
cd frontend && npm run build
```

모니터링 영향이 있는 phase:

```sh
cd frontend && npm run verify:monitoring
```

Guardrail 계산 변경이 있는 phase:

```sh
cd frontend && npm run eval:guardrail
cd frontend && npm run eval:guardrail-thresholds
cd frontend && npm run eval:guardrail-calibration
```

수동 smoke:

```sh
cd backend && SIMULATOR_LLM_PROVIDER=mock ./mvnw spring-boot:run
```

```sh
curl -s http://localhost:8080/api/priorities
curl -s http://localhost:8080/api/cases
```

`POST /api/simulate`는 기존 sample request로 JSON과 NDJSON 둘 다 확인한다.

## 회귀 방지 기준

아래 중 하나라도 깨지면 해당 phase에서 멈추고 원인을 먼저 수정한다.

- `/api/simulate` JSON 응답에서 `request_id`, `routing`, `stateContext`, `planner`, `guardrail`, `advisor`, `reflection`가 사라짐
- NDJSON stream에서 `request_started`, `routing_resolved`, `stage_started`, `stage_completed`, `result` 흐름이 깨짐
- mock provider에서 시뮬레이션이 실패함
- Codex provider disabled/fallback path가 실패함
- OpenAI provider API key 없음 오류가 fallback 처리 규칙을 우회함
- guardrail `final_mode`가 `normal | cautious | blocked` 외 값을 냄
- advisor `decision`이 `A | B | undecided` 외 값을 냄
- DB disabled 상태에서 backend boot가 실패함
- `/api/priorities` 또는 `/api/cases`가 프론트에서 읽을 수 없는 shape로 바뀜

## Codex 구현 순서 추천

1. Phase 0 테스트부터 작성하고 검증이 통과하면 필요시 커밋한다.
2. Phase 1 facade를 추가해 호출 경계를 만들고 검증이 통과하면 필요시 커밋한다.
3. Phase 2 `SimulationResponseFactory`를 쪼개고 검증이 통과하면 필요시 커밋한다.
4. Phase 3 stage input mapper를 분리하고 검증이 통과하면 필요시 커밋한다.
5. Phase 4 guardrail input DTO를 분리하고 검증이 통과하면 필요시 커밋한다.
6. Phase 5 prompt pack을 분리하고 검증이 통과하면 필요시 커밋한다.
7. Phase 6 routing signal과 policy를 분리하고 검증이 통과하면 필요시 커밋한다.
8. Phase 7 LLM package를 engine 아래로 이동하고 검증이 통과하면 필요시 커밋한다.
9. Phase 8 app-only 기능을 문서/패키지 관점에서 분리하고 검증이 통과하면 필요시 커밋한다.
10. Phase 9 generic contract를 추가하고 검증이 통과하면 필요시 커밋한다.
11. Phase 10 프론트 타입/빌드 검증을 수행하고 전체 완료 조건을 확인한다.

각 단계가 끝나면 다음 단계 진행 여부를 묻지 말고 계속 진행한다. 단, 위의 `사용자 확인이 필요한 경우`에 해당하면 중단하고 질문한다.

## 최종 완료 조건

- 현재 UI가 기존 요청 형식으로 시뮬레이션을 실행할 수 있다.
- `/api/simulate` 응답 shape가 기존 `frontend/src/lib/types.ts`와 호환된다.
- backend 내부에 명확한 `engine` package가 존재한다.
- life-specific prompt, fallback, stage input mapping이 `engine/domain/life` 아래로 모인다.
- guardrail 계산은 현재 response JSON path가 아니라 signal DTO를 통해 수행된다.
- 신규 또는 수정된 Java 파일이 700라인을 넘지 않는다.
- `cd backend && ./mvnw test`가 통과한다.
- `cd frontend && npm run typecheck`가 통과한다.
- `cd frontend && npm run build`가 통과한다.
