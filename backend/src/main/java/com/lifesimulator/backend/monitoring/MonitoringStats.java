package com.lifesimulator.backend.monitoring;

public record MonitoringStats(
  int totalRequests,
  double successRate,
  double avgLatencyMs,
  int allowCount,
  int reviewCount,
  int blockCount,
  int lowConfidenceCount,
  int anomalyCount,
  int criticalCount
) {}
