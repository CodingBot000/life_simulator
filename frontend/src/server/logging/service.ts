import type { Pool } from "pg";

import { buildArtifactFileName, writeJsonArtifact } from "../../lib/logger/logStore.ts";
import { logRequest } from "../../lib/logger/requestLogger.ts";
import { hasAnomaly } from "../../lib/monitoring/anomalyDetector.ts";
import { enqueueAnomaly } from "../../lib/monitoring/anomalyQueue.ts";
import {
  enqueueQueueJob,
  listQueueJobs,
  markQueueJobFailed,
  markQueueJobProcessed,
} from "../queue/file-queue.ts";
import { getPgPool } from "./database.ts";
import type {
  DriftMetricSnapshot,
  EvalSampleRecord,
  RequestExecutionEnvelope,
} from "./types.ts";

export const LOG_QUEUE_NAMESPACE = "llm_log_jobs";

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

async function writeStageArtifacts(
  payload: RequestExecutionEnvelope,
): Promise<string[]> {
  const paths: string[] = [];

  for (const stage of payload.stage_logs) {
    const filePath = await writeJsonArtifact(
      "stage_logs",
      buildArtifactFileName(
        `stage-${stage.stage_name}`,
        payload.request_id,
        stage.created_at,
      ),
      stage,
    );

    paths.push(filePath);
  }

  return paths;
}

async function writeAnomalyArtifact(
  payload: RequestExecutionEnvelope,
): Promise<string | null> {
  if (!hasAnomaly(payload.request_log)) {
    return null;
  }

  return writeJsonArtifact(
    "anomaly_events",
    buildArtifactFileName("anomaly_event", payload.request_id, payload.created_at),
    {
      request_id: payload.request_id,
      trace_id: payload.trace_id,
      route_name: payload.route_name,
      selected_model: payload.selected_model,
      guardrail_flags: payload.guardrail_flags,
      created_at: payload.created_at,
    },
  );
}

async function upsertRequestLog(pool: Pool, payload: RequestExecutionEnvelope) {
  await pool.query(
    `
      INSERT INTO llm_request_logs (
        request_id,
        trace_id,
        user_id,
        session_id,
        route_name,
        path,
        model,
        prompt_version,
        context_version,
        decision,
        confidence,
        guardrail_flags,
        latency_ms,
        total_tokens,
        estimated_cost_usd,
        fallback_used,
        retry_count,
        cache_hit,
        schema_valid,
        error_code,
        request_payload,
        response_payload,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11,
        $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20,
        $21::jsonb, $22::jsonb, $23::timestamptz
      )
      ON CONFLICT (request_id) DO UPDATE SET
        trace_id = EXCLUDED.trace_id,
        user_id = EXCLUDED.user_id,
        session_id = EXCLUDED.session_id,
        route_name = EXCLUDED.route_name,
        path = EXCLUDED.path,
        model = EXCLUDED.model,
        prompt_version = EXCLUDED.prompt_version,
        context_version = EXCLUDED.context_version,
        decision = EXCLUDED.decision,
        confidence = EXCLUDED.confidence,
        guardrail_flags = EXCLUDED.guardrail_flags,
        latency_ms = EXCLUDED.latency_ms,
        total_tokens = EXCLUDED.total_tokens,
        estimated_cost_usd = EXCLUDED.estimated_cost_usd,
        fallback_used = EXCLUDED.fallback_used,
        retry_count = EXCLUDED.retry_count,
        cache_hit = EXCLUDED.cache_hit,
        schema_valid = EXCLUDED.schema_valid,
        error_code = EXCLUDED.error_code,
        request_payload = EXCLUDED.request_payload,
        response_payload = EXCLUDED.response_payload
    `,
    [
      payload.request_id,
      payload.trace_id,
      payload.user_id,
      payload.session_id,
      payload.route_name,
      serialize(payload.selected_path),
      payload.selected_model,
      payload.prompt_version,
      payload.context_version,
      payload.decision,
      payload.confidence,
      serialize(payload.guardrail_flags),
      payload.latency_ms,
      payload.total_tokens,
      payload.estimated_cost_usd,
      payload.fallback_used,
      payload.retry_count,
      payload.cache_hit,
      payload.schema_valid,
      null,
      serialize(payload.request_payload),
      serialize(payload.response_payload),
      payload.created_at,
    ],
  );
}

async function upsertStageLogs(pool: Pool, payload: RequestExecutionEnvelope) {
  for (const stage of payload.stage_logs) {
    await pool.query(
      `
        INSERT INTO llm_stage_logs (
          request_id,
          trace_id,
          user_id,
          session_id,
          route_name,
          path,
          stage_name,
          model,
          decision,
          confidence,
          guardrail_flags,
          latency_ms,
          input_tokens,
          output_tokens,
          total_tokens,
          estimated_cost_usd,
          fallback_used,
          retry_count,
          cache_hit,
          schema_valid,
          error_code,
          request_payload,
          response_payload,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11::jsonb,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
          $22::jsonb, $23::jsonb, $24::timestamptz
        )
        ON CONFLICT (request_id, stage_name) DO UPDATE SET
          model = EXCLUDED.model,
          decision = EXCLUDED.decision,
          confidence = EXCLUDED.confidence,
          guardrail_flags = EXCLUDED.guardrail_flags,
          latency_ms = EXCLUDED.latency_ms,
          input_tokens = EXCLUDED.input_tokens,
          output_tokens = EXCLUDED.output_tokens,
          total_tokens = EXCLUDED.total_tokens,
          estimated_cost_usd = EXCLUDED.estimated_cost_usd,
          fallback_used = EXCLUDED.fallback_used,
          retry_count = EXCLUDED.retry_count,
          cache_hit = EXCLUDED.cache_hit,
          schema_valid = EXCLUDED.schema_valid,
          error_code = EXCLUDED.error_code,
          request_payload = EXCLUDED.request_payload,
          response_payload = EXCLUDED.response_payload
      `,
      [
        stage.request_id,
        stage.trace_id,
        stage.user_id,
        stage.session_id,
        stage.route_name,
        serialize(stage.selected_path),
        stage.stage_name,
        stage.model,
        payload.decision,
        payload.confidence,
        serialize(payload.guardrail_flags),
        stage.latency_ms,
        stage.input_tokens,
        stage.output_tokens,
        stage.total_tokens,
        stage.estimated_cost_usd,
        stage.fallback_used,
        stage.retry_count,
        stage.cache_hit,
        stage.schema_valid,
        stage.error_code ?? null,
        serialize(stage.request_payload),
        serialize(stage.response_payload),
        stage.created_at,
      ],
    );
  }
}

async function upsertGuardrailEvent(pool: Pool, payload: RequestExecutionEnvelope) {
  await pool.query(
    `
      INSERT INTO llm_guardrail_events (
        request_id,
        trace_id,
        user_id,
        session_id,
        route_name,
        path,
        model,
        decision,
        confidence,
        guardrail_flags,
        latency_ms,
        total_tokens,
        estimated_cost_usd,
        fallback_used,
        retry_count,
        cache_hit,
        schema_valid,
        error_code,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11,
        $12, $13, $14, $15, $16, $17, $18, $19::timestamptz
      )
      ON CONFLICT (request_id) DO UPDATE SET
        guardrail_flags = EXCLUDED.guardrail_flags,
        decision = EXCLUDED.decision,
        confidence = EXCLUDED.confidence,
        latency_ms = EXCLUDED.latency_ms,
        total_tokens = EXCLUDED.total_tokens,
        estimated_cost_usd = EXCLUDED.estimated_cost_usd
    `,
    [
      payload.request_id,
      payload.trace_id,
      payload.user_id,
      payload.session_id,
      payload.route_name,
      serialize(payload.selected_path),
      payload.selected_model,
      payload.guardrail_flags.decision,
      payload.guardrail_flags.confidence,
      serialize(payload.guardrail_flags),
      payload.latency_ms,
      payload.total_tokens,
      payload.estimated_cost_usd,
      payload.fallback_used,
      payload.retry_count,
      payload.cache_hit,
      payload.schema_valid,
      null,
      payload.created_at,
    ],
  );
}

async function upsertAnomalyEvent(pool: Pool, payload: RequestExecutionEnvelope) {
  if (!hasAnomaly(payload.request_log)) {
    return;
  }

  await pool.query(
    `
      INSERT INTO llm_anomaly_events (
        request_id,
        trace_id,
        user_id,
        session_id,
        route_name,
        path,
        model,
        decision,
        confidence,
        guardrail_flags,
        latency_ms,
        total_tokens,
        estimated_cost_usd,
        fallback_used,
        retry_count,
        cache_hit,
        schema_valid,
        error_code,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11,
        $12, $13, $14, $15, $16, $17, $18, $19::timestamptz
      )
      ON CONFLICT (request_id, created_at) DO NOTHING
    `,
    [
      payload.request_id,
      payload.trace_id,
      payload.user_id,
      payload.session_id,
      payload.route_name,
      serialize(payload.selected_path),
      payload.selected_model,
      payload.decision,
      payload.confidence,
      serialize({
        ...payload.guardrail_flags,
        anomaly_detected: true,
      }),
      payload.latency_ms,
      payload.total_tokens,
      payload.estimated_cost_usd,
      payload.fallback_used,
      payload.retry_count,
      payload.cache_hit,
      payload.schema_valid,
      "request_anomaly",
      payload.created_at,
    ],
  );
}

async function upsertDailyUsage(pool: Pool, payload: RequestExecutionEnvelope) {
  const metricDate = payload.created_at.slice(0, 10);
  const grouped = new Map<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      fallbackCount: number;
      retryCount: number;
      cacheHitCount: number;
      requestCount: number;
    }
  >();

  for (const stage of payload.stage_logs) {
    const current = grouped.get(stage.model) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      fallbackCount: 0,
      retryCount: 0,
      cacheHitCount: 0,
      requestCount: 0,
    };

    current.inputTokens += stage.input_tokens;
    current.outputTokens += stage.output_tokens;
    current.totalTokens += stage.total_tokens;
    current.estimatedCostUsd += stage.estimated_cost_usd;
    current.fallbackCount += Number(stage.fallback_used);
    current.retryCount += stage.retry_count;
    current.cacheHitCount += Number(stage.cache_hit);
    current.requestCount = 1;

    grouped.set(stage.model, current);
  }

  for (const [model, value] of grouped.entries()) {
    await pool.query(
      `
        INSERT INTO llm_model_usage_daily (
          metric_date,
          route_name,
          model,
          request_count,
          input_tokens,
          output_tokens,
          total_tokens,
          estimated_cost_usd,
          fallback_count,
          retry_count,
          cache_hit_count,
          created_at
        )
        VALUES (
          $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz
        )
        ON CONFLICT (metric_date, route_name, model) DO UPDATE SET
          request_count = llm_model_usage_daily.request_count + EXCLUDED.request_count,
          input_tokens = llm_model_usage_daily.input_tokens + EXCLUDED.input_tokens,
          output_tokens = llm_model_usage_daily.output_tokens + EXCLUDED.output_tokens,
          total_tokens = llm_model_usage_daily.total_tokens + EXCLUDED.total_tokens,
          estimated_cost_usd = llm_model_usage_daily.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
          fallback_count = llm_model_usage_daily.fallback_count + EXCLUDED.fallback_count,
          retry_count = llm_model_usage_daily.retry_count + EXCLUDED.retry_count,
          cache_hit_count = llm_model_usage_daily.cache_hit_count + EXCLUDED.cache_hit_count
      `,
      [
        metricDate,
        payload.route_name,
        model,
        value.requestCount,
        value.inputTokens,
        value.outputTokens,
        value.totalTokens,
        Number(value.estimatedCostUsd.toFixed(6)),
        value.fallbackCount,
        value.retryCount,
        value.cacheHitCount,
        payload.created_at,
      ],
    );
  }
}

async function persistEnvelopeToDatabase(payload: RequestExecutionEnvelope) {
  const pool = getPgPool();

  if (!pool) {
    return;
  }

  await upsertRequestLog(pool, payload);
  await upsertStageLogs(pool, payload);
  await upsertGuardrailEvent(pool, payload);
  await upsertAnomalyEvent(pool, payload);
  await upsertDailyUsage(pool, payload);
}

export async function persistRequestExecutionEnvelope(
  payload: RequestExecutionEnvelope,
): Promise<void> {
  await logRequest(payload.request_log);
  await writeStageArtifacts(payload);
  await writeAnomalyArtifact(payload);

  if (hasAnomaly(payload.request_log)) {
    await enqueueAnomaly(payload.request_log);
  }

  await persistEnvelopeToDatabase(payload);
}

export async function enqueueRequestLogJob(
  payload: RequestExecutionEnvelope,
): Promise<string> {
  const queuePath = await enqueueQueueJob(LOG_QUEUE_NAMESPACE, payload);

  if (process.env.LLMOPS_INLINE_QUEUE_DRAIN === "true") {
    await processLogQueue();
  }

  return queuePath;
}

export async function processLogQueue(maxJobs = 50): Promise<{
  processed: number;
  failed: number;
}> {
  const jobs = await listQueueJobs<RequestExecutionEnvelope>(LOG_QUEUE_NAMESPACE);
  let processed = 0;
  let failed = 0;

  for (const job of jobs.slice(0, maxJobs)) {
    try {
      await persistRequestExecutionEnvelope(job.payload);
      await markQueueJobProcessed(LOG_QUEUE_NAMESPACE, job.path);
      processed += 1;
    } catch (error) {
      console.error("[llmops] failed to process log queue job", error);
      await markQueueJobFailed(LOG_QUEUE_NAMESPACE, job.path);
      failed += 1;
    }
  }

  return {
    processed,
    failed,
  };
}

export async function persistDriftSnapshot(
  snapshot: DriftMetricSnapshot,
): Promise<void> {
  await writeJsonArtifact(
    "drift_metrics",
    buildArtifactFileName(
      `drift-${snapshot.bucket_label}`,
      snapshot.route_name,
      snapshot.created_at,
    ),
    snapshot,
  );

  const pool = getPgPool();

  if (!pool) {
    return;
  }

  await pool.query(
    `
      INSERT INTO llm_drift_daily_metrics (
        metric_date,
        bucket_label,
        route_name,
        guardrail_flags,
        latency_ms,
        total_tokens,
        estimated_cost_usd,
        schema_valid,
        error_code,
        created_at
      )
      VALUES (
        $1::date, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10::timestamptz
      )
      ON CONFLICT (metric_date, bucket_label, route_name) DO UPDATE SET
        guardrail_flags = EXCLUDED.guardrail_flags,
        latency_ms = EXCLUDED.latency_ms,
        total_tokens = EXCLUDED.total_tokens,
        estimated_cost_usd = EXCLUDED.estimated_cost_usd,
        schema_valid = EXCLUDED.schema_valid,
        error_code = EXCLUDED.error_code
    `,
    [
      snapshot.metric_date,
      snapshot.bucket_label,
      snapshot.route_name,
      serialize(snapshot),
      snapshot.p95_latency_ms,
      snapshot.avg_tokens,
      snapshot.avg_cost_usd,
      snapshot.schema_fail_rate === 0,
      snapshot.anomalies.length > 0 ? "drift_detected" : null,
      snapshot.created_at,
    ],
  );

  for (const anomaly of snapshot.anomalies) {
    await pool.query(
      `
        INSERT INTO llm_anomaly_events (
          request_id,
          trace_id,
          user_id,
          session_id,
          route_name,
          path,
          model,
          decision,
          confidence,
          guardrail_flags,
          latency_ms,
          total_tokens,
          estimated_cost_usd,
          fallback_used,
          retry_count,
          cache_hit,
          schema_valid,
          error_code,
          created_at
        )
        VALUES (
          $1, $2, NULL, NULL, $3, '[]'::jsonb, NULL, NULL, NULL,
          $4::jsonb, NULL, NULL, NULL, false, 0, false, true, $5, $6::timestamptz
        )
      `,
      [
        anomaly.request_id ?? null,
        anomaly.trace_id ?? null,
        anomaly.route_name,
        serialize(anomaly),
        anomaly.anomaly_type,
        anomaly.created_at,
      ],
    );
  }
}

export async function persistEvalSample(sample: EvalSampleRecord): Promise<void> {
  await writeJsonArtifact(
    "eval_samples",
    buildArtifactFileName("eval_sample", sample.request_id, sample.created_at),
    sample,
  );

  const pool = getPgPool();

  if (!pool) {
    return;
  }

  await pool.query(
    `
      INSERT INTO llm_eval_samples (
        request_id,
        trace_id,
        user_id,
        session_id,
        route_name,
        path,
        model,
        decision,
        confidence,
        guardrail_flags,
        latency_ms,
        total_tokens,
        estimated_cost_usd,
        fallback_used,
        retry_count,
        cache_hit,
        schema_valid,
        error_code,
        expected_payload,
        actual_payload,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, '[]'::jsonb, $6, $7, $8, $9::jsonb, NULL, NULL, NULL,
        false, 0, false, true, NULL, $10::jsonb, $11::jsonb, $12::timestamptz
      )
      ON CONFLICT (request_id) DO UPDATE SET
        expected_payload = EXCLUDED.expected_payload,
        actual_payload = EXCLUDED.actual_payload,
        confidence = EXCLUDED.confidence
    `,
    [
      sample.request_id,
      sample.trace_id,
      sample.user_id,
      sample.session_id,
      sample.route_name,
      sample.model,
      sample.decision,
      sample.confidence,
      serialize(sample.guardrail_flags),
      serialize(sample.expected_payload),
      serialize(sample.actual_payload),
      sample.created_at,
    ],
  );
}
