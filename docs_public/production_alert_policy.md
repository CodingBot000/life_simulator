# Production Alert Policy

## Immediate alerts

- `low_confidence_allow > 0`
  - Action: inspect the latest request and guardrail artifacts immediately.
- Unexpected `block` decisions appear
  - Action: compare the affected request against the deterministic baseline and current drift snapshot.
- `schema_fail_rate` spikes
  - Action: inspect the failing stage/model pair and fallback usage.
- `fallback_rate` spikes
  - Action: inspect provider health, timeout events, and circuit breaker openings.
- `p95 latency` spikes
  - Action: identify the slowest stage and check upstream provider health.

## Observation alerts

- Review ratio changes materially
  - Action: inspect routing drift and recent guardrail trigger mix.
- Cost increases
  - Action: inspect premium-model share and token growth.
- Specific guardrail rule spikes
  - Action: inspect the corresponding request cohort and recent prompt changes.

## Escalation rules

- Critical alerts page immediately if the condition persists for 5 minutes.
- Warning alerts create an inbox task and are reviewed in the next operator pass.
- Repeated warning alerts over the same metric within 24 hours are promoted to critical.
