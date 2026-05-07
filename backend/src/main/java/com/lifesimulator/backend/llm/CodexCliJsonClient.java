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
  public LlmJsonResult completeJson(LlmJsonRequest request) {
    long startedAt = System.nanoTime();
    JsonNode output = codexCliClient.completeJson(request.prompt(), request.outputSchema());
    return new LlmJsonResult(output, modelName(), LlmUsage.empty(), elapsedMillis(startedAt), 0);
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

  private int elapsedMillis(long startedAt) {
    return Math.max(0, (int) ((System.nanoTime() - startedAt) / 1_000_000));
  }
}
