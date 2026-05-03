package com.lifesimulator.backend.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BackendWorkerService {

  private final ObjectMapper objectMapper;
  private final ObjectProvider<JdbcTemplate> jdbcTemplate;

  public BackendWorkerService(ObjectMapper objectMapper, ObjectProvider<JdbcTemplate> jdbcTemplate) {
    this.objectMapper = objectMapper;
    this.jdbcTemplate = jdbcTemplate;
  }

  public Map<String, Object> runLogWorker() {
    return Map.of("processed", 0, "failed", 0, "mode", "inline_persistence");
  }

  public Map<String, Object> runDriftWorker(int bucketHours) {
    JdbcTemplate jdbc = jdbcTemplate.getIfAvailable();
    if (jdbc == null) {
      return Map.of("processed", 0, "reason", "database_disabled");
    }

    Instant to = Instant.now();
    Instant from = to.minusSeconds(Math.max(1, bucketHours) * 3600L);
    Map<String, Object> stats = jdbc.queryForMap(
      """
        SELECT
          COUNT(*)::int AS request_count,
          COALESCE(AVG(latency_ms), 0) AS avg_latency_ms,
          COALESCE(AVG(total_tokens), 0) AS avg_total_tokens,
          COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
          COUNT(*) FILTER (
            WHERE COALESCE((guardrail_flags->>'guardrail_triggered')::boolean, false)
          )::int AS anomaly_count
        FROM llm_request_logs
        WHERE created_at BETWEEN ? AND ?
        """,
      Timestamp.from(from),
      Timestamp.from(to)
    );
    String bucketLabel = "last_" + bucketHours + "h";
    jdbc.update(
      """
        INSERT INTO llm_drift_daily_metrics (
          metric_date, bucket_label, route_name, guardrail_flags, latency_ms,
          total_tokens, estimated_cost_usd, schema_valid, created_at
        )
        VALUES (?, ?, 'simulate', ?::jsonb, ?, ?, ?, true, ?)
        ON CONFLICT (metric_date, bucket_label, route_name) DO UPDATE SET
          guardrail_flags = EXCLUDED.guardrail_flags,
          latency_ms = EXCLUDED.latency_ms,
          total_tokens = EXCLUDED.total_tokens,
          estimated_cost_usd = EXCLUDED.estimated_cost_usd,
          created_at = EXCLUDED.created_at
        """,
      LocalDate.now(ZoneOffset.UTC),
      bucketLabel,
      json(stats),
      number(stats, "avg_latency_ms").doubleValue(),
      number(stats, "avg_total_tokens").doubleValue(),
      BigDecimal.valueOf(number(stats, "estimated_cost_usd").doubleValue()),
      Timestamp.from(to)
    );
    return Map.of("processed", 1, "bucket", bucketLabel, "stats", stats);
  }

  public Map<String, Object> runEvalWorker(int limit) {
    JdbcTemplate jdbc = jdbcTemplate.getIfAvailable();
    if (jdbc == null) {
      return Map.of("persisted", 0, "reason", "database_disabled");
    }

    int persisted = jdbc.update(
      """
        INSERT INTO llm_eval_samples (
          request_id, trace_id, route_name, model, decision, confidence,
          guardrail_flags, expected_payload, actual_payload, created_at
        )
        SELECT
          logs.request_id,
          logs.trace_id,
          logs.route_name,
          logs.model,
          logs.decision,
          logs.confidence,
          logs.guardrail_flags,
          jsonb_build_object(
            'current_decision', logs.decision,
            'current_mode', logs.guardrail_flags->>'final_mode'
          ),
          jsonb_build_object(
            'request_payload', logs.request_payload,
            'response_payload', logs.response_payload
          ),
          logs.created_at
        FROM llm_anomaly_events anomaly
        JOIN llm_request_logs logs ON logs.request_id = anomaly.request_id
        ORDER BY anomaly.created_at DESC
        LIMIT ?
        ON CONFLICT (request_id) DO UPDATE SET
          decision = EXCLUDED.decision,
          confidence = EXCLUDED.confidence,
          guardrail_flags = EXCLUDED.guardrail_flags,
          expected_payload = EXCLUDED.expected_payload,
          actual_payload = EXCLUDED.actual_payload
        """,
      Math.max(0, limit)
    );
    return Map.of("persisted", persisted);
  }

  private Number number(Map<String, Object> row, String key) {
    Object value = row.get(key);
    return value instanceof Number number ? number : 0;
  }

  private String json(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize worker payload.", error);
    }
  }
}
