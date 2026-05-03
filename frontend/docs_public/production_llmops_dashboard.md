# Production LLMOps Dashboard

## Grafana panels

- Request volume: `requests_total` split by `status`.
- End-to-end latency: `request_latency_ms` with p50/p95.
- LLM stage latency: `llm_latency_ms` by `stage_name` and `model`.
- Token burn: `llm_tokens_in_total` and `llm_tokens_out_total`.
- Cost burn: `llm_cost_usd_total` by model.
- Guardrail trigger volume: `guardrail_trigger_total` by trigger.
- Resilience health: `retry_total`, `fallback_total`, `schema_fail_total`.
- Cache efficiency: `cache_hit_total`.
- Drift summary: latest rows from `llm_drift_daily_metrics`.
- Model usage daily: latest rows from `llm_model_usage_daily`.

## Alert conditions

- Critical: `request_failures_total` increases sharply over a 5 minute window.
- Critical: `request_degraded_total` is non-zero in the last 15 minutes.
- Critical: `schema_fail_total` increases from zero.
- Critical: `fallback_total` exceeds baseline for the current day.
- Critical: p95 of `request_latency_ms` or `llm_latency_ms` exceeds the alert threshold.
- Warning: `guardrail_trigger_total{trigger="reasoning_conflict"}` drifts upward.
- Warning: `llm_cost_usd_total` slope exceeds baseline spend.

## Daily checklist

- Confirm yesterday's `llm_model_usage_daily` totals match expected traffic and cost.
- Review the latest `llm_drift_daily_metrics` snapshot for schema, fallback, latency, and low-confidence changes.
- Inspect `outputs/queues/llm_log_jobs/pending` and keep it near zero.
- Inspect `outputs/online_logs/anomaly_queue` for new critical samples.
- Confirm `/api/metrics` is scrapeable and current.

## Anomaly triage

1. Start with the matching row in `llm_anomaly_events`.
2. Open the request artifact in `outputs/online_logs/request_logs`.
3. Compare the stage sequence in `outputs/online_logs/stage_logs`.
4. Check whether the anomaly is routing-driven, provider-driven, or guardrail-driven.
5. If the anomaly hit `fallback` or `schema_fail`, inspect the corresponding stage model first.
6. If the anomaly hit `low_confidence_allow`, re-run the same request in mock mode and compare stage outputs deterministically.

## Drift response procedure

1. If `low_confidence_allow_rate > 0`, inspect routing and guardrail thresholds immediately.
2. If `schema_fail_rate` rises, check provider response formatting, prompt changes, and fallback frequency.
3. If `fallback_rate` rises, inspect provider health and circuit breaker openings.
4. If p95 latency rises, identify the slowest stage in `llm_stage_logs`.
5. If cost rises without traffic growth, inspect premium routing share in `llm_model_usage_daily`.
