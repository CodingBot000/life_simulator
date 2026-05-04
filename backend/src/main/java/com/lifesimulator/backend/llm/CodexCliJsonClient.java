package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.config.SimulatorProperties;

public class CodexCliJsonClient implements LlmJsonClient {

  private final CodexCliClient codexCliClient;
  private final SimulatorProperties properties;

  public CodexCliJsonClient(CodexCliClient codexCliClient, SimulatorProperties properties) {
    this.codexCliClient = codexCliClient;
    this.properties = properties;
  }

  @Override
  public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
    return codexCliClient.completeJson(prompt, outputSchema);
  }

  @Override
  public String providerName() {
    return "codex";
  }

  @Override
  public String modelName() {
    return properties.getCodex().getModel();
  }

  @Override
  public boolean enabled() {
    return properties.getCodex().isEnabled();
  }

  @Override
  public boolean fallbackOnError() {
    return properties.getCodex().isFallbackOnError();
  }
}
