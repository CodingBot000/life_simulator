package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.config.SimulatorProperties;

public class MockJsonClient implements LlmJsonClient {

  private final SimulatorProperties properties;

  public MockJsonClient(SimulatorProperties properties) {
    this.properties = properties;
  }

  @Override
  public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
    return fallback.deepCopy();
  }

  @Override
  public String providerName() {
    return "mock";
  }

  @Override
  public String modelName() {
    return properties.getMock().getModel();
  }

  @Override
  public boolean enabled() {
    return true;
  }

  @Override
  public boolean fallbackOnError() {
    return true;
  }
}
