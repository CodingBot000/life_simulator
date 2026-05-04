package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;

public interface LlmJsonClient {
  JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback);

  String providerName();

  String modelName();

  boolean enabled();

  boolean fallbackOnError();
}
