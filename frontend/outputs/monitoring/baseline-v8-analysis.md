# Baseline-v8 Analysis

## Summary
- generated_at: 2026-04-02T09:24:08.439Z
- seed_case_count: 20
- baseline-v7 latest allow/review/block: 3/17/0
- baseline-v8 run1 allow/review/block: 3/17/0
- baseline-v8 run2 allow/review/block: 3/17/0
- allow_count_delta_vs_v7: 0
- recovered_allow_seed_ids: case-13, case-14

## Target Checks
- run1 allow_count in target range 3~5: true
- run2 allow_count in target range 3~5: true
- underblocking stayed at 0: true
- low_confidence_allow stayed at 0: true
- decision consistency passed: true
- score consistency passed: true

## Deterministic Logs
- deterministic_mode_all_true: true
- scoring_input_source_structured_only: true
- generation_variance_flag_zero: true
- run1 deterministic_mode_true_count: 20/20
- run2 deterministic_mode_true_count: 20/20

## Consistency
- decision_changed_seed_ids: none
- confidence_delta_exceeded_seed_ids: none
- uncertainty_delta_exceeded_seed_ids: none
- max_confidence_delta: 0.05
- max_uncertainty_delta: 0.08

## Spotlight
- case-01: review -> review, confidence_delta 0.02
- case-04: allow -> allow, scoring_source structured_only
- case-14: allow -> allow, deterministic true
- case-19: review -> review, uncertainty_delta 0

## Interpretation
- baseline-v8 keeps the threshold policy intact and moves stability into upstream structured generation plus structured-only scoring inputs.
- ambiguity_high now comes only from raw user input/context, while confidence and uncertainty use deterministic weighted sums over structured signals.
- Two-pass replay met the requested deterministic guardrail conditions.

