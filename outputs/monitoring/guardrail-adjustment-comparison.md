# Guardrail Adjustment Comparison

- generated_at: 2026-03-29T11:41:47.517Z
- seed_case_count: 20

## baseline
- matched_seed_count: 19
- missing_seed_ids: case-13
- allow/review/block: 0/19/0
- block_rate: 0
- underblocking_count: 0
- low_confidence_allow_count: 0
- low_confidence_anomaly_count: 19
- threshold_adjusted_count: 0
- calibration_adjusted_count: 0

## baseline-v2
- matched_seed_count: 20
- missing_seed_ids: none
- allow/review/block: 0/20/0
- block_rate: 0
- underblocking_count: 0
- low_confidence_allow_count: 0
- low_confidence_anomaly_count: 20
- threshold_adjusted_count: 14
- calibration_adjusted_count: 20

## comparison
- underblocking_count_delta: 0
- underblocking_rate_delta: 0
- low_confidence_allow_count_delta: 0
- low_confidence_allow_rate_delta: 0
- block_count_delta: 0
- block_rate_delta: 0
- threshold_adjusted_count_delta: 14
- calibration_adjusted_count_delta: 20
- underblocking_reduced: false
- low_confidence_allow_removed: false
