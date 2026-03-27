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

- risk accuracy: 0.60
- mode accuracy: 0.57
- 주요 실패 패턴: mode normal -> careful (8건), risk low -> medium (8건), mode block -> careful (4건)

## Guardrail Threshold Tuning

- baseline 성능: preferred 0.59, acceptable 0.86, overblocking 1, underblocking 2
- conservative 성능: preferred 0.55, acceptable 0.86, overblocking 1, underblocking 2
- aggressive 성능: preferred 0.64, acceptable 0.77, overblocking 1, underblocking 4
- 추천 threshold set: baseline
- 발견된 과잉 차단 / 과소 차단 패턴: overblocking baseline: high_risk (1건) / conservative: high_risk (1건) / aggressive: high_risk (1건); underblocking baseline: ambiguity_high+reasoning_conflict+high_risk (1건), ambiguity_high+reasoning_conflict+low_confidence+high_risk (1건) / conservative: ambiguity_high+reasoning_conflict+high_risk (1건), ambiguity_high+reasoning_conflict+low_confidence+high_risk (1건) / aggressive: no_trigger (2건), ambiguity_high+reasoning_conflict+high_risk (1건)

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
