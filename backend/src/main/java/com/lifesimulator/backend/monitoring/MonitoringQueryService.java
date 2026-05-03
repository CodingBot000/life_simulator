package com.lifesimulator.backend.monitoring;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class MonitoringQueryService {

  private final ObjectProvider<MonitoringRepository> repository;

  public MonitoringQueryService(ObjectProvider<MonitoringRepository> repository) {
    this.repository = repository;
  }

  public Map<String, Object> metricsSnapshot() {
    Instant to = Instant.now();
    Instant from = to.minus(Duration.ofHours(24));
    MonitoringRepository resolved = repository.getIfAvailable();
    if (resolved == null) {
      return emptyMetricsSnapshot(from, to);
    }
    return metricsSnapshot(resolved, from, to);
  }

  public Map<String, Object> alertsSnapshot() {
    Instant now = Instant.now();
    Map<String, Object> recent = snapshotForWindow(now.minus(Duration.ofMinutes(30)), now);
    Map<String, Object> previous = snapshotForWindow(
      now.minus(Duration.ofMinutes(60)),
      now.minus(Duration.ofMinutes(30))
    );
    Map<String, Object> today = snapshotForWindow(
      LocalDate.now().atStartOfDay().atOffset(OffsetDateTime.now().getOffset()).toInstant(),
      now
    );
    List<Map<String, Object>> alerts = List.of(
      alert("anomaly_rate_spike_30m", "최근 30분 anomaly_rate 급증", recent, "anomaly_rate", 0.15),
      alert("block_rate_spike_30m", "최근 30분 block_rate 급증", recent, "block_rate", 0.2),
      alert("avg_latency_ms_high", "avg_latency_ms 임계치 초과", recent, "avg_latency_ms", 4000)
    );

    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "recent_30m",
      recent,
      "previous_30m",
      previous,
      "today",
      today,
      "alerts",
      alerts,
      "fired_count",
      alerts.stream().filter(alert -> "fired".equals(alert.get("status"))).count()
    );
  }

  public Map<String, Object> criticalCases() {
    Instant to = Instant.now();
    Instant from = to.minus(Duration.ofHours(24));
    MonitoringRepository resolved = repository.getIfAvailable();
    List<Map<String, Object>> cases = resolved == null
      ? List.of()
      : toCriticalCases(resolved.loadCriticalCases(from, to, 10));
    return Map.of("generated_at", OffsetDateTime.now().toString(), "cases", cases);
  }

  public Map<String, Object> report() {
    Map<String, Object> snapshot = metricsSnapshot();
    Map<String, Object> totals = totals(snapshot);
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "report_date",
      LocalDate.now().toString(),
      "traffic_summary",
      Map.of(
        "total_requests",
        totals.get("total_requests"),
        "success_rate",
        totals.get("success_rate"),
        "avg_latency_ms",
        totals.get("avg_latency_ms")
      ),
      "guardrail_summary",
      Map.of(
        "allow_count",
        totals.get("allow_count"),
        "review_count",
        totals.get("review_count"),
        "block_count",
        totals.get("block_count"),
        "block_rate",
        totals.get("block_rate"),
        "review_rate",
        totals.get("review_rate"),
        "low_confidence_rate",
        totals.get("low_confidence_rate")
      ),
      "anomaly_summary",
      Map.of(
        "anomaly_count",
        totals.get("anomaly_count"),
        "anomaly_rate",
        totals.get("anomaly_rate"),
        "underblocking_count",
        0,
        "overblocking_count",
        0,
        "conflict_count",
        0,
        "low_confidence_anomaly_count",
        totals.get("low_confidence_anomaly_count"),
        "raw_based",
        emptyAnomalyBreakdown(),
        "derived_based",
        emptyAnomalyBreakdown()
      ),
      "reeval_summary",
      Map.of("reeval_count", 0, "reeval_mismatch_count", 0, "reeval_mismatch_rate", 0),
      "action_items",
      List.of(),
      "recent_critical_cases",
      snapshot.get("recent_critical_cases")
    );
  }

  private Map<String, Object> snapshotForWindow(Instant from, Instant to) {
    MonitoringRepository resolved = repository.getIfAvailable();
    return resolved == null ? emptyMetricsSnapshot(from, to) : metricsSnapshot(resolved, from, to);
  }

  private Map<String, Object> metricsSnapshot(MonitoringRepository repository, Instant from, Instant to) {
    MonitoringStats stats = repository.loadStats(from, to);
    List<Map<String, Object>> criticalCases = toCriticalCases(repository.loadCriticalCases(from, to, 10));
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "window",
      Map.of("from", from.toString(), "to", to.toString(), "duration_minutes", Duration.between(from, to).toMinutes(), "request_count", stats.totalRequests()),
      "totals",
      totals(stats),
      "anomaly_breakdown",
      Map.of("raw_based", emptyAnomalyBreakdown(), "derived_based", emptyAnomalyBreakdown(), "union", anomalyBreakdown(stats)),
      "anomaly_queue",
      Map.of("total_entries", stats.anomalyCount(), "source_counts", Map.of("anomaly_raw_based", 0, "anomaly_derived_based", stats.anomalyCount())),
      "reeval",
      Map.of("reeval_count", 0, "reeval_mismatch_count", 0, "reeval_mismatch_rate", 0, "mismatches", List.of()),
      "timeline",
      repository.toTimelineResponse(repository.loadTimeline(from, to)),
      "recent_critical_cases",
      criticalCases
    );
  }

  private Map<String, Object> totals(MonitoringStats stats) {
    return Map.ofEntries(
      Map.entry("total_requests", stats.totalRequests()),
      Map.entry("success_rate", stats.successRate()),
      Map.entry("avg_latency_ms", stats.avgLatencyMs()),
      Map.entry("allow_count", stats.allowCount()),
      Map.entry("review_count", stats.reviewCount()),
      Map.entry("block_count", stats.blockCount()),
      Map.entry("block_rate", rate(stats.blockCount(), stats.totalRequests())),
      Map.entry("review_rate", rate(stats.reviewCount(), stats.totalRequests())),
      Map.entry("low_confidence_rate", rate(stats.lowConfidenceCount(), stats.totalRequests())),
      Map.entry("anomaly_count", stats.anomalyCount()),
      Map.entry("anomaly_rate", rate(stats.anomalyCount(), stats.totalRequests())),
      Map.entry("underblocking_count", 0),
      Map.entry("overblocking_count", 0),
      Map.entry("conflict_count", 0),
      Map.entry("low_confidence_anomaly_count", stats.lowConfidenceCount()),
      Map.entry("reeval_count", 0),
      Map.entry("reeval_mismatch_count", 0),
      Map.entry("reeval_mismatch_rate", 0),
      Map.entry("critical_count", stats.criticalCount())
    );
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> totals(Map<String, Object> snapshot) {
    return (Map<String, Object>) snapshot.get("totals");
  }

  private List<Map<String, Object>> toCriticalCases(List<Map<String, Object>> rows) {
    return rows.stream()
      .map(row -> Map.of(
        "request_id",
        row.get("request_id"),
        "timestamp",
        String.valueOf(row.get("created_at")),
        "anomaly_types",
        List.of(row.get("final_mode")),
        "anomaly_sources",
        List.of("anomaly_derived_based"),
        "decision",
        row.get("decision"),
        "confidence",
        row.get("confidence") == null ? 0 : row.get("confidence"),
        "evaluator_version",
        "spring-backend-v1",
        "threshold_version",
        "spring-backend-v1"
      ))
      .toList();
  }

  private Map<String, Object> alert(
    String ruleId,
    String title,
    Map<String, Object> snapshot,
    String totalKey,
    double threshold
  ) {
    double current = ((Number) totals(snapshot).get(totalKey)).doubleValue();
    boolean fired = current > threshold;
    return Map.of(
      "rule_id",
      ruleId,
      "title",
      title,
      "status",
      fired ? "fired" : "ok",
      "severity",
      fired ? "warning" : "info",
      "window",
      "recent_30m",
      "message",
      title,
      "current_value",
      current,
      "threshold",
      threshold
    );
  }

  private Map<String, Object> emptyMetricsSnapshot(Instant from, Instant to) {
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "window",
      Map.of("from", from.toString(), "to", to.toString(), "duration_minutes", Duration.between(from, to).toMinutes(), "request_count", 0),
      "totals",
      totals(new MonitoringStats(0, 0, 0, 0, 0, 0, 0, 0, 0)),
      "anomaly_breakdown",
      Map.of("raw_based", emptyAnomalyBreakdown(), "derived_based", emptyAnomalyBreakdown(), "union", emptyAnomalyBreakdown()),
      "anomaly_queue",
      Map.of("total_entries", 0, "source_counts", Map.of("anomaly_raw_based", 0, "anomaly_derived_based", 0)),
      "reeval",
      Map.of("reeval_count", 0, "reeval_mismatch_count", 0, "reeval_mismatch_rate", 0, "mismatches", List.of()),
      "timeline",
      List.of(),
      "recent_critical_cases",
      List.of()
    );
  }

  private Map<String, Object> anomalyBreakdown(MonitoringStats stats) {
    return Map.of(
      "anomaly_count",
      stats.anomalyCount(),
      "anomaly_rate",
      rate(stats.anomalyCount(), stats.totalRequests()),
      "underblocking_count",
      0,
      "overblocking_count",
      0,
      "conflict_count",
      0,
      "low_confidence_count",
      stats.lowConfidenceCount()
    );
  }

  private Map<String, Object> emptyAnomalyBreakdown() {
    return Map.of(
      "anomaly_count",
      0,
      "anomaly_rate",
      0,
      "underblocking_count",
      0,
      "overblocking_count",
      0,
      "conflict_count",
      0,
      "low_confidence_count",
      0
    );
  }

  private double rate(int count, int total) {
    if (total == 0) {
      return 0;
    }
    return Math.round((count / (double) total) * 10_000d) / 10_000d;
  }
}
