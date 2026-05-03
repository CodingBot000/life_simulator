# Playground Outputs

- generated_at: 2026-03-26T18:57:59Z

## Case Summaries

- case-01-career-stability: `playground/outputs/case-01-career-stability/summary.md`
- case-02-career-growth: `playground/outputs/case-02-career-growth/summary.md`
- case-03-startup-vs-job: `playground/outputs/case-03-startup-vs-job/summary.md`
- case-04-relationship: `playground/outputs/case-04-relationship/summary.md`
- case-05-relocation: `playground/outputs/case-05-relocation/summary.md`
- case-06-freelance-vs-fulltime: `playground/outputs/case-06-freelance-vs-fulltime/summary.md`
- case-07-manager-vs-ic: `playground/outputs/case-07-manager-vs-ic/summary.md`
- case-08-smallbiz-vs-employment: `playground/outputs/case-08-smallbiz-vs-employment/summary.md`
- case-09-overseas-study-vs-work: `playground/outputs/case-09-overseas-study-vs-work/summary.md`
- case-10-sideproject-vs-rest: `playground/outputs/case-10-sideproject-vs-rest/summary.md`

## Guardrail Verification Summary

- total cases: 10
- normal cases: 3
- cautious cases: 6
- blocked cases: 1
- good: 10
- over: 0
- missing: 0

### Failure Cases

- none

## Guardrail Evaluation

- risk accuracy: 1.00
- mode accuracy: 1.00
- 주요 실패 패턴: 없음

## Guardrail Threshold Tuning

- baseline 성능: preferred 1, acceptable 1, overblocking 0, underblocking 0
- conservative 성능: preferred 0.95, acceptable 1, overblocking 0, underblocking 0
- aggressive 성능: preferred 0.68, acceptable 0.73, overblocking 0, underblocking 6
- 추천 threshold set: baseline
- 발견된 과잉 차단 / 과소 차단 패턴: overblocking baseline: 없음 / conservative: 없음 / aggressive: 없음; underblocking baseline: 없음 / conservative: 없음 / aggressive: low_confidence (3건), no_trigger (3건)

## Guardrail Auto Optimization

- best threshold: carefulMin=1, blockMin=4
- 기존 baseline vs optimized 비교: baseline score 54, optimized score 54, preferred 0.73 -> 0.73, acceptable 1 -> 1
- 개선 여부: same
- 과잉/과소 차단 패턴: overblocking 없음; underblocking 없음

## Guardrail Confidence Calibration

- mode accuracy: 1
- acceptable match rate: 1
- confidence band accuracy: 0.8
- uncertainty band accuracy: 0.85
- overconfident 패턴: cal-13
- underconfident 패턴: cal-09, cal-15, cal-20
- 새로 발견된 borderline 특징: ambiguity_high / risk=low / conf=medium / unc=low (1건), ambiguity_high / risk=low / conf=medium / unc=medium (1건), ambiguity_high / risk=medium / conf=medium / unc=low (1건)

## Guardrail Dataset Relabeling

- legacy backup: data/guardrail_dataset_legacy_20260328.jsonl, data/guardrail_threshold_dataset_legacy_20260328.jsonl
- guardrail_dataset 변경: 15건, risk 변경 12건, mode 변경 13건
- threshold_dataset 변경: 18건, preferred mode 변경 9건
- mode 변경 케이스: case-02, case-03, case-04, case-05, case-06, case-07, case-08, case-09, case-10, case-16, case-21, case-25
- 변경 이유 패턴: 새 confidence / uncertainty 의미론에 맞춰 expected를 정렬 (10건), block 기준이 좁아져 low-confidence 고불확실 사례가 block -> careful로 완화 (8건), weak evidence / low confidence 반영으로 normal -> careful로 상향 (6건), conflicting signals가 confidence를 깎아 normal -> careful로 상향 (4건), high risk + high confidence 조합이 분리되어 careful -> block으로 강화 (2건)
