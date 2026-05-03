package com.lifesimulator.backend.logging;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;

public record SimulationExecutionEnvelope(
  String requestId,
  String traceId,
  String routeName,
  String executionMode,
  List<String> selectedPath,
  String selectedModel,
  String decision,
  double confidence,
  JsonNode guardrailFlags,
  int latencyMs,
  int totalTokens,
  double estimatedCostUsd,
  boolean fallbackUsed,
  int retryCount,
  boolean cacheHit,
  boolean schemaValid,
  int schemaFailureCount,
  JsonNode requestPayload,
  JsonNode responsePayload,
  List<SimulationStageLog> stageLogs,
  Instant createdAt
) {}
