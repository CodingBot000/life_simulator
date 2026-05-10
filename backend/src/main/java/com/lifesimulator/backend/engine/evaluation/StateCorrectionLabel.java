package com.lifesimulator.backend.engine.evaluation;

import com.fasterxml.jackson.databind.JsonNode;

public record StateCorrectionLabel(
  String requestId,
  String traceId,
  String userId,
  String sessionId,
  String fieldPath,
  JsonNode originalValue,
  JsonNode correctedValue,
  String correctionType,
  String comment
) {}
