package com.lifesimulator.backend.engine.llm;

import com.fasterxml.jackson.databind.JsonNode;

public interface LlmJsonClient {
  LlmJsonResult completeJson(LlmJsonRequest request);

  String providerName();

  String modelName();

  boolean enabled();

  boolean fallbackOnError();
}
