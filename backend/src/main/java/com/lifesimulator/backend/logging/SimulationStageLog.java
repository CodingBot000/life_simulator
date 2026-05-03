package com.lifesimulator.backend.logging;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;

public record SimulationStageLog(
  String requestId,
  String traceId,
  String routeName,
  String executionMode,
  List<String> selectedPath,
  String stageName,
  String model,
  String executionKind,
  int latencyMs,
  int inputTokens,
  int outputTokens,
  int totalTokens,
  double estimatedCostUsd,
  boolean fallbackUsed,
  int retryCount,
  boolean cacheHit,
  boolean schemaValid,
  int schemaFailureCount,
  JsonNode requestPayload,
  JsonNode responsePayload,
  Instant createdAt
) {}
