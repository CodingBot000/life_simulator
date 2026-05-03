package com.lifesimulator.backend.monitoring;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnBean(JdbcTemplate.class)
public class MonitoringRepository {

  private final JdbcTemplate jdbcTemplate;

  public MonitoringRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public MonitoringStats loadStats(Instant from, Instant to) {
    Map<String, Object> row = jdbcTemplate.queryForMap(
      """
        SELECT
          COUNT(*)::int AS total_requests,
          COALESCE(AVG(CASE WHEN schema_valid THEN 1 ELSE 0 END), 0) AS success_rate,
          COALESCE(AVG(latency_ms), 0) AS avg_latency_ms,
          COUNT(*) FILTER (
            WHERE COALESCE(guardrail_flags->>'final_mode', 'normal') = 'normal'
          )::int AS allow_count,
          COUNT(*) FILTER (
            WHERE COALESCE(guardrail_flags->>'final_mode', 'normal') IN ('cautious', 'careful', 'review')
          )::int AS review_count,
          COUNT(*) FILTER (
            WHERE COALESCE(guardrail_flags->>'final_mode', 'normal') = 'blocked'
          )::int AS block_count,
          COUNT(*) FILTER (
            WHERE COALESCE(NULLIF(guardrail_flags->>'confidence_score', '')::double precision, 1) < 0.62
          )::int AS low_confidence_count,
          COUNT(*) FILTER (
            WHERE COALESCE((guardrail_flags->>'guardrail_triggered')::boolean, false)
               OR COALESCE(guardrail_flags->>'final_mode', 'normal') <> 'normal'
          )::int AS critical_count
        FROM llm_request_logs
        WHERE created_at BETWEEN ? AND ?
        """,
      Timestamp.from(from),
      Timestamp.from(to)
    );
    int anomalyCount = jdbcTemplate.queryForObject(
      "SELECT COUNT(*)::int FROM llm_anomaly_events WHERE created_at BETWEEN ? AND ?",
      Integer.class,
      Timestamp.from(from),
      Timestamp.from(to)
    );

    return new MonitoringStats(
      number(row, "total_requests").intValue(),
      rounded(number(row, "success_rate").doubleValue()),
      rounded(number(row, "avg_latency_ms").doubleValue()),
      number(row, "allow_count").intValue(),
      number(row, "review_count").intValue(),
      number(row, "block_count").intValue(),
      number(row, "low_confidence_count").intValue(),
      anomalyCount,
      number(row, "critical_count").intValue()
    );
  }

  public List<Map<String, Object>> loadTimeline(Instant from, Instant to) {
    return jdbcTemplate.queryForList(
      """
        SELECT
          date_trunc('hour', created_at) AS bucket_start,
          COUNT(*)::int AS total_requests,
          COALESCE(AVG(latency_ms), 0) AS avg_latency_ms,
          COALESCE(AVG(CASE WHEN COALESCE(guardrail_flags->>'final_mode', 'normal') = 'blocked' THEN 1 ELSE 0 END), 0) AS block_rate,
          COALESCE(AVG(CASE WHEN COALESCE(guardrail_flags->>'final_mode', 'normal') IN ('cautious', 'careful', 'review') THEN 1 ELSE 0 END), 0) AS review_rate,
          COALESCE(AVG(CASE WHEN COALESCE((guardrail_flags->>'guardrail_triggered')::boolean, false) THEN 1 ELSE 0 END), 0) AS anomaly_rate,
          COALESCE(AVG(CASE WHEN COALESCE(NULLIF(guardrail_flags->>'confidence_score', '')::double precision, 1) < 0.62 THEN 1 ELSE 0 END), 0) AS low_confidence_rate
        FROM llm_request_logs
        WHERE created_at BETWEEN ? AND ?
        GROUP BY bucket_start
        ORDER BY bucket_start
        """,
      Timestamp.from(from),
      Timestamp.from(to)
    );
  }

  public List<Map<String, Object>> loadCriticalCases(Instant from, Instant to, int limit) {
    return jdbcTemplate.queryForList(
      """
        SELECT
          request_id,
          created_at,
          decision,
          confidence,
          COALESCE(guardrail_flags->>'final_mode', 'normal') AS final_mode,
          COALESCE(guardrail_flags->>'triggers', '[]') AS triggers
        FROM llm_request_logs
        WHERE created_at BETWEEN ? AND ?
          AND (
            COALESCE((guardrail_flags->>'guardrail_triggered')::boolean, false)
            OR COALESCE(guardrail_flags->>'final_mode', 'normal') <> 'normal'
          )
        ORDER BY created_at DESC
        LIMIT ?
        """,
      Timestamp.from(from),
      Timestamp.from(to),
      limit
    );
  }

  public List<Map<String, Object>> toTimelineResponse(List<Map<String, Object>> rows) {
    List<Map<String, Object>> timeline = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Instant bucketStart = timestamp(row.get("bucket_start"));
      Instant bucketEnd = bucketStart.plusSeconds(3600);
      timeline.add(
        Map.of(
          "bucket_start",
          bucketStart.toString(),
          "bucket_end",
          bucketEnd.toString(),
          "total_requests",
          number(row, "total_requests").intValue(),
          "avg_latency_ms",
          rounded(number(row, "avg_latency_ms").doubleValue()),
          "block_rate",
          rounded(number(row, "block_rate").doubleValue()),
          "review_rate",
          rounded(number(row, "review_rate").doubleValue()),
          "anomaly_rate",
          rounded(number(row, "anomaly_rate").doubleValue()),
          "low_confidence_rate",
          rounded(number(row, "low_confidence_rate").doubleValue()),
          "reeval_mismatch_count",
          0,
          "critical_count",
          0
        )
      );
    }
    return timeline;
  }

  private Number number(Map<String, Object> row, String key) {
    Object value = row.get(key);
    return value instanceof Number number ? number : 0;
  }

  private Instant timestamp(Object value) {
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant();
    }
    if (value instanceof OffsetDateTime timestamp) {
      return timestamp.toInstant();
    }
    return Instant.from(OffsetDateTime.ofInstant(Instant.now(), ZoneOffset.UTC));
  }

  private double rounded(double value) {
    return Math.round(value * 10_000d) / 10_000d;
  }
}
