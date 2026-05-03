package com.lifesimulator.backend.logging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnBean(JdbcTemplate.class)
public class SimulationLogRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public SimulationLogRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public void save(SimulationExecutionEnvelope envelope) {
    upsertRequestLog(envelope);
    upsertStageLogs(envelope);
    upsertGuardrailEvent(envelope);
    upsertAnomalyEvent(envelope);
    upsertDailyUsage(envelope);
  }

  private void upsertRequestLog(SimulationExecutionEnvelope envelope) {
    jdbcTemplate.update(
      """
        INSERT INTO llm_request_logs (
          request_id, trace_id, route_name, path, model, prompt_version,
          context_version, decision, confidence, guardrail_flags, latency_ms,
          total_tokens, estimated_cost_usd, fallback_used, retry_count, cache_hit,
          schema_valid, error_code, request_payload, response_payload, created_at
        )
        VALUES (
          ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?,
          ?, ?::jsonb, ?::jsonb, ?
        )
        ON CONFLICT (request_id) DO UPDATE SET
          trace_id = EXCLUDED.trace_id,
          route_name = EXCLUDED.route_name,
          path = EXCLUDED.path,
          model = EXCLUDED.model,
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
          request_payload = EXCLUDED.request_payload,
          response_payload = EXCLUDED.response_payload
        """,
      envelope.requestId(),
      envelope.traceId(),
      envelope.routeName(),
      json(envelope.selectedPath()),
      envelope.selectedModel(),
      "spring-backend-v1",
      "spring-backend-v1",
      envelope.decision(),
      envelope.confidence(),
      json(envelope.guardrailFlags()),
      envelope.latencyMs(),
      envelope.totalTokens(),
      BigDecimal.valueOf(envelope.estimatedCostUsd()),
      envelope.fallbackUsed(),
      envelope.retryCount(),
      envelope.cacheHit(),
      envelope.schemaValid(),
      null,
      json(envelope.requestPayload()),
      json(envelope.responsePayload()),
      Timestamp.from(envelope.createdAt())
    );
  }

  private void upsertStageLogs(SimulationExecutionEnvelope envelope) {
    for (SimulationStageLog stage : envelope.stageLogs()) {
      jdbcTemplate.update(
        """
          INSERT INTO llm_stage_logs (
            request_id, trace_id, route_name, path, stage_name, model, decision,
            confidence, guardrail_flags, latency_ms, input_tokens, output_tokens,
            total_tokens, estimated_cost_usd, fallback_used, retry_count, cache_hit,
            schema_valid, error_code, request_payload, response_payload, created_at
          )
          VALUES (
            ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?::jsonb, ?::jsonb, ?
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
            request_payload = EXCLUDED.request_payload,
            response_payload = EXCLUDED.response_payload
          """,
        stage.requestId(),
        stage.traceId(),
        stage.routeName(),
        json(stage.selectedPath()),
        stage.stageName(),
        stage.model(),
        envelope.decision(),
        envelope.confidence(),
        json(envelope.guardrailFlags()),
        stage.latencyMs(),
        stage.inputTokens(),
        stage.outputTokens(),
        stage.totalTokens(),
        BigDecimal.valueOf(stage.estimatedCostUsd()),
        stage.fallbackUsed(),
        stage.retryCount(),
        stage.cacheHit(),
        stage.schemaValid(),
        null,
        json(stage.requestPayload()),
        json(stage.responsePayload()),
        Timestamp.from(stage.createdAt())
      );
    }
  }

  private void upsertGuardrailEvent(SimulationExecutionEnvelope envelope) {
    jdbcTemplate.update(
      """
        INSERT INTO llm_guardrail_events (
          request_id, trace_id, route_name, path, model, decision, confidence,
          guardrail_flags, latency_ms, total_tokens, estimated_cost_usd,
          fallback_used, retry_count, cache_hit, schema_valid, error_code, created_at
        )
        VALUES (
          ?, ?, ?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT (request_id) DO UPDATE SET
          guardrail_flags = EXCLUDED.guardrail_flags,
          decision = EXCLUDED.decision,
          confidence = EXCLUDED.confidence,
          latency_ms = EXCLUDED.latency_ms,
          total_tokens = EXCLUDED.total_tokens,
          estimated_cost_usd = EXCLUDED.estimated_cost_usd
        """,
      envelope.requestId(),
      envelope.traceId(),
      envelope.routeName(),
      json(envelope.selectedPath()),
      envelope.selectedModel(),
      envelope.decision(),
      envelope.confidence(),
      json(envelope.guardrailFlags()),
      envelope.latencyMs(),
      envelope.totalTokens(),
      BigDecimal.valueOf(envelope.estimatedCostUsd()),
      envelope.fallbackUsed(),
      envelope.retryCount(),
      envelope.cacheHit(),
      envelope.schemaValid(),
      null,
      Timestamp.from(envelope.createdAt())
    );
  }

  private void upsertAnomalyEvent(SimulationExecutionEnvelope envelope) {
    if (!isAnomaly(envelope.guardrailFlags())) {
      return;
    }

    jdbcTemplate.update(
      """
        INSERT INTO llm_anomaly_events (
          request_id, trace_id, route_name, path, model, decision, confidence,
          guardrail_flags, latency_ms, total_tokens, estimated_cost_usd,
          fallback_used, retry_count, cache_hit, schema_valid, error_code, created_at
        )
        VALUES (
          ?, ?, ?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT (request_id, created_at) DO NOTHING
        """,
      envelope.requestId(),
      envelope.traceId(),
      envelope.routeName(),
      json(envelope.selectedPath()),
      envelope.selectedModel(),
      envelope.decision(),
      envelope.confidence(),
      json(envelope.guardrailFlags()),
      envelope.latencyMs(),
      envelope.totalTokens(),
      BigDecimal.valueOf(envelope.estimatedCostUsd()),
      envelope.fallbackUsed(),
      envelope.retryCount(),
      envelope.cacheHit(),
      envelope.schemaValid(),
      "request_anomaly",
      Timestamp.from(envelope.createdAt())
    );
  }

  private void upsertDailyUsage(SimulationExecutionEnvelope envelope) {
    jdbcTemplate.update(
      """
        INSERT INTO llm_model_usage_daily (
          metric_date, route_name, model, request_count, input_tokens, output_tokens,
          total_tokens, estimated_cost_usd, fallback_count, retry_count,
          cache_hit_count, created_at
        )
        VALUES (CAST(? AS date), ?, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (metric_date, route_name, model) DO UPDATE SET
          request_count = llm_model_usage_daily.request_count + 1,
          total_tokens = llm_model_usage_daily.total_tokens + EXCLUDED.total_tokens,
          estimated_cost_usd = llm_model_usage_daily.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
          fallback_count = llm_model_usage_daily.fallback_count + EXCLUDED.fallback_count,
          retry_count = llm_model_usage_daily.retry_count + EXCLUDED.retry_count,
          cache_hit_count = llm_model_usage_daily.cache_hit_count + EXCLUDED.cache_hit_count
        """,
      envelope.createdAt().toString().substring(0, 10),
      envelope.routeName(),
      envelope.selectedModel(),
      envelope.totalTokens(),
      BigDecimal.valueOf(envelope.estimatedCostUsd()),
      envelope.fallbackUsed() ? 1 : 0,
      envelope.retryCount(),
      envelope.cacheHit() ? 1 : 0,
      Timestamp.from(envelope.createdAt())
    );
  }

  private boolean isAnomaly(JsonNode guardrail) {
    return guardrail.path("guardrail_triggered").asBoolean(false) ||
      guardrail.path("final_mode").asText("").equals("blocked");
  }

  private String json(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize log payload.", error);
    }
  }
}
