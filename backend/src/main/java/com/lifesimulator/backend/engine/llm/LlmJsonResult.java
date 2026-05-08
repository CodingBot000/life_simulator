package com.lifesimulator.backend.engine.llm;

import com.fasterxml.jackson.databind.JsonNode;

public record LlmJsonResult(
  JsonNode output,
  String model,
  LlmUsage usage,
  int latencyMs,
  int retryCount
) {
  public static LlmJsonResult of(JsonNode output, String model) {
    return new LlmJsonResult(output, model, LlmUsage.empty(), 0, 0);
  }
}
