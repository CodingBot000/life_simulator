package com.lifesimulator.backend.correction;

import com.fasterxml.jackson.databind.JsonNode;

public record StateCorrectionRequest(
  String requestId,
  String fieldPath,
  JsonNode originalValue,
  JsonNode correctedValue,
  String correctionType,
  String comment
) {}
