import { readAnomalyQueue } from "../../src/lib/monitoring/anomalyQueue.ts";
import { persistEvalSample } from "../../src/server/logging/service.ts";
import type { EvalSampleRecord } from "../../src/server/logging/types.ts";

async function main() {
  const entries = await readAnomalyQueue();
  const limit = Number.parseInt(
    process.env.EVAL_WORKER_LIMIT ?? `${entries.length}`,
    10,
  );
  let persisted = 0;

  for (const entry of entries.slice(0, Math.max(0, limit))) {
    const requestLog = entry.value.request_log;
    const sample: EvalSampleRecord = {
      request_id: requestLog.request_id,
      trace_id: requestLog.request_id,
      user_id: "anonymous",
      session_id: requestLog.state.session_id,
      route_name: "simulate",
      model: requestLog.meta.model,
      decision: requestLog.guardrail.guardrail_derived.decision,
      confidence: requestLog.guardrail.guardrail_derived.confidence,
      guardrail_flags: {
        ...requestLog.guardrail.guardrail_derived.summary,
        anomaly_sources: entry.value.source,
      },
      expected_payload: {
        current_decision: requestLog.guardrail.guardrail_derived.decision,
        current_mode: requestLog.guardrail.guardrail_derived.output_mode,
        risk_level: requestLog.guardrail.guardrail_derived.risk_level,
      },
      actual_payload: {
        request_log: requestLog,
      },
      source: "anomaly_queue",
      created_at: entry.value.detected_at,
    };

    await persistEvalSample(sample);
    persisted += 1;
  }

  console.info("[eval-worker] persisted", { persisted });
}

main().catch((error) => {
  console.error("[eval-worker] failed", error);
  process.exitCode = 1;
});
