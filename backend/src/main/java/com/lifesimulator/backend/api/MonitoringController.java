package com.lifesimulator.backend.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MonitoringController {

  @GetMapping("/api/monitoring/metrics")
  public Map<String, Object> metricsSnapshot() {
    return emptyMetricsSnapshot();
  }

  @GetMapping("/api/monitoring/critical-cases")
  public Map<String, Object> criticalCases() {
    return Map.of("generated_at", OffsetDateTime.now().toString(), "cases", List.of());
  }

  @GetMapping("/api/monitoring/alerts")
  public Map<String, Object> alerts() {
    Map<String, Object> snapshot = emptyMetricsSnapshot();
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "recent_30m",
      snapshot,
      "previous_30m",
      snapshot,
      "today",
      snapshot,
      "alerts",
      List.of(),
      "fired_count",
      0
    );
  }

  @GetMapping("/api/monitoring/report")
  public Map<String, Object> report() {
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "report_date",
      LocalDate.now().toString(),
      "traffic_summary",
      Map.of("total_requests", 0, "success_rate", 0, "avg_latency_ms", 0),
      "guardrail_summary",
      Map.of(
        "allow_count",
        0,
        "review_count",
        0,
        "block_count",
        0,
        "block_rate",
        0,
        "review_rate",
        0,
        "low_confidence_rate",
        0
      ),
      "anomaly_summary",
      Map.of(
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
        "low_confidence_anomaly_count",
        0,
        "raw_based",
        emptyAnomalyBreakdown(),
        "derived_based",
        emptyAnomalyBreakdown()
      ),
      "reeval_summary",
      Map.of("reeval_count", 0, "reeval_mismatch_count", 0, "reeval_mismatch_rate", 0),
      "action_items",
      List.of("Spring Boot monitoring persistence is not migrated yet."),
      "recent_critical_cases",
      List.of()
    );
  }

  private Map<String, Object> emptyMetricsSnapshot() {
    return Map.of(
      "generated_at",
      OffsetDateTime.now().toString(),
      "window",
      Map.of("from", "", "to", "", "duration_minutes", 0, "request_count", 0),
      "totals",
      Map.ofEntries(
        Map.entry("total_requests", 0),
        Map.entry("success_rate", 0),
        Map.entry("avg_latency_ms", 0),
        Map.entry("allow_count", 0),
        Map.entry("review_count", 0),
        Map.entry("block_count", 0),
        Map.entry("block_rate", 0),
        Map.entry("review_rate", 0),
        Map.entry("low_confidence_rate", 0),
        Map.entry("anomaly_count", 0),
        Map.entry("anomaly_rate", 0),
        Map.entry("underblocking_count", 0),
        Map.entry("overblocking_count", 0),
        Map.entry("conflict_count", 0),
        Map.entry("low_confidence_anomaly_count", 0),
        Map.entry("reeval_count", 0),
        Map.entry("reeval_mismatch_count", 0),
        Map.entry("reeval_mismatch_rate", 0),
        Map.entry("critical_count", 0)
      ),
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
}
