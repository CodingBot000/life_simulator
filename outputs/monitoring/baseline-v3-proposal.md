# Baseline-v3 Proposal

## 핵심 관찰
- baseline-v2 review 20건 중 20건은 v2 추가 규칙이 없어도 baseline base rule만으로 이미 review였다.
- reasoning_conflict는 20/20, calibration floor(confidence < 0.6)는 20/20, high_uncertainty는 18/20에 걸렸다.
- ambiguity_high는 19/20에서 발생했고, 이 중 13건은 generated text의 ambiguity regex 영향도 포함한다.

## 상위 규칙 3개
- 1. baseline.threshold_score_gate_from_reasoning_conflict: support=20, direct_gate=2. reasoning_conflict가 20/20에 존재하고 carefulMin=1이라 conflict score만으로도 review 경로가 열린다.
- 2. baseline_v2.calibration_floor_confidence_lt_0_6: support=20, direct_gate=0. confidence < 0.6 floor가 20/20에 걸려 allow 복구 여지를 모두 막는다. 현재 세트에서는 mode를 직접 바꾸진 않았지만 lock-in rule로 작동한다.
- 3. baseline.high_uncertainty_ge_0_66: support=18, direct_gate=12. uncertainty >= 0.66가 18/20에서 발생했고, 실제 direct review gate의 최다 원인이다.

## 해석
- 과보수화의 직접 원인은 baseline-v2 추가 규칙보다 기존 base evaluator 쪽이 더 크다.
- 특히 reasoning_conflict가 전 케이스에 깔린 상태에서 threshold gate가 너무 쉽게 열리고, confidence/uncertainty 스코어가 모두 safe band 아래로 떨어져 allow 후보가 사라졌다.
- 따라서 baseline-v3는 threshold-only 조정보다 conflict/ambiguity/uncertainty 산식 보정이 우선이다.

## baseline-v3 제안
- `confidence < 0.6 => no allow` 정책은 유지한다. low_confidence_allow 금지는 계속 가져간다.
- `reasoning_conflict` 단독으로는 review를 만들지 않도록 줄인다. 방법은 `escalationWeight 2 -> 1` 또는 conflict-only path에 별도 `carefulMin >= 3`를 두는 방식이 적절하다.
- `medium risk strengthening`은 `confidence < 0.6` alone 조건을 제거하고, `low_confidence trigger` 또는 `ambiguity_high`가 동반될 때만 강화한다. 현재는 calibration floor와 중복된다.
- ambiguity regex는 generated `scenario_text` / `risk_text`가 아니라 `user_input`과 user-context 텍스트에만 적용한다. 현재는 모델이 쓴 `불확실`, `애매` 같은 표현이 다시 ambiguity trigger를 증폭시킨다.
- uncertainty / confidence 산식은 conflict, missing_context 패널티를 낮춰 conflict-only medium 케이스가 safe band(`confidence >= 0.62`, `uncertainty <= 0.38`)에 진입할 수 있게 보정한다.

## allow 복구 후보
- 1차 후보군: case-01, case-04, case-05, case-07, case-14, case-15, case-19, case-20
- 최우선 후보: case-01, case-15
- 위 후보들은 `high_risk`와 `low_confidence trigger`가 없어서 v3에서 가장 먼저 allow 복구 실험을 해볼 수 있다.
- 반대로 high-risk 6건과 explicit low-confidence trigger 11건은 review/block 쪽에 남겨 두는 것이 underblocking 0 유지에 유리하다.
