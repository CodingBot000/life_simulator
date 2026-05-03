# Re-eval Mismatch Tuning Recommendations

## 1. 핵심 요약
- total re_eval_results: 13
- total mismatches: 2
- mismatch rate: 0.1538
- top mismatch type: underblocking_related (1)
- critical mismatch count: 1

## 2. mismatch 통계
- by_type: {"underblocking_related":1,"overblocking_related":0,"low_confidence_related":1,"conflict_related":0,"high_confidence_wrong":0,"boundary_shift_only":0}
- by_decision_transition: {"review->block":1,"review->allow":1}
- by_risk_transition: {"medium->high":1,"medium->medium":1}
- by_threshold_version: {"guardrail-threshold-set:baseline":2}
- by_prompt_version: {"life-simulator-prompts.v1":2}
- by_evaluator_version: {"guardrail-evaluator.v1":2}

## 3. 반복 패턴 top 5
1. underblocking_related | review->block | medium->high | threshold=guardrail-threshold-set:baseline | prompt=life-simulator-prompts.v1 | evaluator=guardrail-evaluator.v1 | count=1
2. low_confidence_related | review->allow | medium->medium | threshold=guardrail-threshold-set:baseline | prompt=life-simulator-prompts.v1 | evaluator=guardrail-evaluator.v1 | count=1

## 4. threshold 수정 후보
- underblocking_related 1건: guardrail-threshold-set:baseline 기준에서 block/escalation 임계값 하향 후보를 검토하라.

## 5. calibration 수정 후보
- low_confidence_related 1건: confidence 0.6 미만 구간의 calibration 및 cautious escalation 규칙을 재검토하라.

## 6. 즉시 수정 필요 항목
- review->block 또는 risk 상승이 동반된 underblocking 관련 mismatch 1건은 즉시 threshold 재조정 대상이다.

## 7. 관찰 지속 항목
- 가장 큰 반복 패턴은 underblocking_related / review->block / medium->high 조합이므로 다음 배치까지 관찰을 지속하라.
