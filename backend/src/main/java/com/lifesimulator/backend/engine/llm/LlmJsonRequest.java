package com.lifesimulator.backend.engine.llm;

import com.fasterxml.jackson.databind.JsonNode;

public record LlmJsonRequest(
  String stageName,
  String prompt,
  JsonNode outputSchema,
  JsonNode fallback
) {}
