package com.lifesimulator.backend.api;

import com.lifesimulator.backend.monitoring.MonitoringQueryService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MonitoringController {

  private final MonitoringQueryService monitoringQueryService;

  public MonitoringController(MonitoringQueryService monitoringQueryService) {
    this.monitoringQueryService = monitoringQueryService;
  }

  @GetMapping("/api/monitoring/metrics")
  public Map<String, Object> metricsSnapshot() {
    return monitoringQueryService.metricsSnapshot();
  }

  @GetMapping("/api/monitoring/critical-cases")
  public Map<String, Object> criticalCases() {
    return monitoringQueryService.criticalCases();
  }

  @GetMapping("/api/monitoring/alerts")
  public Map<String, Object> alerts() {
    return monitoringQueryService.alertsSnapshot();
  }

  @GetMapping("/api/monitoring/report")
  public Map<String, Object> report() {
    return monitoringQueryService.report();
  }
}
