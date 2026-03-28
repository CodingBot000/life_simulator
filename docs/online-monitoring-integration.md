# Online Monitoring Integration

## 1. 현재 repo 기준 연결 지점

현재 online monitoring은 기존 구조를 유지한 채 아래 지점에 연결되어 있다.

1. `app/api/simulate/route.ts`
- 요청 검증 후 `runSimulationChain(...)`를 호출한다.
- online monitoring 자체는 여기서 직접 기록하지 않고, 실제 기록 책임은 `src/lib/agent.ts` 내부 체인 끝에서 수행한다.

2. `src/lib/agent.ts`
- `runSimulationChain(...)`가 전체 실행 오케스트레이션 지점이다.
- 단계 실행 순서:
  `stateLoader -> planner -> scenarioA/B -> riskA/B -> abReasoning -> guardrail -> advisor -> reflection`
- 마지막에 다음을 수행한다.
  - `buildRequestLog(...)`
  - `logRequest(...)`
  - `hasAnomaly(requestLog)`
  - `enqueueAnomaly(requestLog)` if needed

3. 로그 저장 모듈
- `src/lib/logger/requestLogger.ts`
  - request log 생성 및 `outputs/online_logs/request_logs` 저장
- `src/lib/logger/guardrailLogger.ts`
  - `guardrail_raw` + `guardrail_derived` 생성
  - `outputs/online_logs/guardrail_logs` 저장
- `src/lib/logger/logStore.ts`
  - 실제 JSON 파일 read/write 유틸

4. anomaly enqueue 지점
- `src/lib/agent.ts` 내부에서 request log 생성 후 `hasAnomaly(requestLog)`가 true면 enqueue
- 실제 queue write는 `src/lib/monitoring/anomalyQueue.ts`
- 저장 위치는 `outputs/online_logs/anomaly_queue`

5. re-evaluation 지점
- `src/lib/monitoring/reEvaluator.ts`
- 실행 스크립트:
  `npm run re-eval:online-anomalies`
- 결과 저장 위치:
  - `outputs/online_logs/re_eval_results`
  - `outputs/online_logs/dataset_candidates`

## 2. 저장되는 로그 구조

request log 안의 guardrail 영역은 아래처럼 raw/derived로 분리된다.

```ts
guardrail: {
  versions: LogVersionInfo
  guardrail_raw: GuardrailEvaluationActual
  guardrail_derived: {
    risk_level: "low" | "medium" | "high"
    confidence: number
    uncertainty: number
    decision: "allow" | "review" | "block"
    output_mode: "normal" | "safe" | "blocked"
    summary: {
      raw_guardrail_mode: "normal" | "cautious" | "blocked"
      output_mode: "normal" | "safe" | "blocked"
      detected_triggers: GuardrailTrigger[]
      trigger_count: number
      reason: string
    }
    signals: {
      cost_issue?: boolean
      effect_issue?: boolean
      recovery_issue?: boolean
      safety_issue?: boolean
    }
    threshold_eval: {
      cost_weight: number
      effect_weight: number
      recovery_weight: number
      safety_weight: number
      total_score: number
    }
    anomaly: {
      anomaly_raw_based: AnomalyFlags
      anomaly_derived_based: AnomalyFlags
    }
  }
}
```

핵심 원칙:

- `guardrail_raw`는 evaluator 원본 출력 전체를 그대로 보존한다.
- `guardrail_derived`는 운영 관찰과 디버깅을 위한 가공층이다.
- anomaly 판정은 raw 기준과 derived 기준을 둘 다 저장한다.

## 3. 로그 저장 위치

기준 루트:

`outputs/online_logs`

하위 디렉토리:

- `request_logs`
- `guardrail_logs`
- `anomaly_queue`
- `re_eval_results`
- `dataset_candidates`
- `examples`

## 4. 버전 필드

모든 persisted log record에는 아래 버전 필드가 들어간다.

```ts
versions: {
  record_version: string
  evaluator_version: string
  threshold_version: string
  calibration_version: string
  signal_mapping_version: string
  prompt_version?: string
}
```

현재 값 해석:

- `record_version`
  - online monitoring record schema 버전
- `evaluator_version`
  - core guardrail evaluator 코드 버전
- `threshold_version`
  - 어떤 threshold set으로 평가했는지
- `calibration_version`
  - confidence/uncertainty calibration 버전
- `signal_mapping_version`
  - raw evaluator output -> derived signal로 가공하는 휴리스틱 버전
- `prompt_version`
  - 시뮬레이션 체인 프롬프트 묶음 버전

## 5. anomaly 계층 분리

현재 anomaly는 두 계층으로 저장된다.

1. `anomaly_raw_based`
- evaluator 원본 출력만 사용한다.
- 사용 필드 예:
  - `risk_level`
  - `raw_guardrail_mode`
  - `confidence_score`
  - `uncertainty_score`
  - `detected_triggers`

2. `anomaly_derived_based`
- 운영용 가공 signal과 summary를 사용한다.
- 사용 필드 예:
  - `decision`
  - `signals.cost_issue`
  - `signals.safety_issue`
  - `signals.recovery_issue`
  - `confidence`
  - `uncertainty`

queue 적재 시 `source` 필드에 어떤 계층이 enqueue를 유발했는지 명시한다.

예:

- `["anomaly_raw_based"]`
- `["anomaly_derived_based"]`
- `["anomaly_raw_based", "anomaly_derived_based"]`

## 6. 휴리스틱 signal 매핑

중요:

- derived signal은 core evaluator의 입력이 아니다.
- derived signal은 online monitoring, 탐지, 관찰, 운영 분석용이다.
- core 판단 원천은 여전히 `guardrail_raw`에 들어 있는 evaluator 자체 결과다.

### 6.1 derived signal 조건식

현재 구현 조건식은 아래와 같다.

```ts
cost_issue =
  hasKeyword(corpus, COST_KEYWORDS) ||
  (financial_pressure !== "low" &&
    financial_pressure !== "none" &&
    financial_pressure !== "stable")

effect_issue =
  hasKeyword(corpus, EFFECT_KEYWORDS) ||
  evaluation.risk_level !== "low" ||
  reasoning.reasoning.comparison.conflicts.length > 0

recovery_issue =
  hasKeyword(corpus, RECOVERY_KEYWORDS) ||
  evaluation.uncertainty_score > 0.4 ||
  riskA.risk_level === "high" ||
  riskB.risk_level === "high"

safety_issue =
  hasKeyword(corpus, SAFETY_KEYWORDS) ||
  evaluation.detected_triggers.includes("high_risk")
```

`corpus`는 아래를 합친 관찰용 텍스트다.

- user decision context
- optionA / optionB
- riskA / riskB reasons
- A/B reasoning summary
- final selection why
- comparison reason / conflicts

### 6.2 raw trigger -> derived signal 대응표

이 매핑은 1:1 규칙이 아니라 관찰용 대응이다.

| raw trigger | derived signal 주 대응 | 실제 연결 방식 |
| --- | --- | --- |
| `ambiguity_high` | `recovery_issue` | `evaluation.uncertainty_score > 0.4`를 통해 반영될 수 있음 |
| `reasoning_conflict` | `effect_issue` | `comparison.conflicts.length > 0`를 통해 반영 |
| `low_confidence` | `recovery_issue` | `evaluation.uncertainty_score > 0.4`일 때 반영될 수 있음 |
| `high_risk` | `safety_issue`, `effect_issue` | `detected_triggers.includes("high_risk")`, `evaluation.risk_level !== "low"` |

추가 설명:

- `cost_issue`는 raw trigger와 직접 1:1 매핑되지 않는다.
- `cost_issue`는 financial pressure와 비용 관련 keyword에 의해 생성된다.
- derived signal은 evaluator의 threshold 비교 로직을 대체하지 않는다.

## 7. 예시 로그 파일

예시 request log JSON 3개는 아래에 생성한다.

- `outputs/online_logs/examples/request-normal-case.json`
- `outputs/online_logs/examples/request-low-confidence-case.json`
- `outputs/online_logs/examples/request-conflict-anomaly-case.json`
