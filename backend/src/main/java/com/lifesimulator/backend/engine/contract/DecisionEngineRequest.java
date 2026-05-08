package com.lifesimulator.backend.engine.contract;

import com.fasterxml.jackson.databind.JsonNode;

public record DecisionEngineRequest(
  JsonNode payload,
  String requestId,
  String traceId,
  String locale
) {}
