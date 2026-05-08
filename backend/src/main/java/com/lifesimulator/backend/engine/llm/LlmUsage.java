package com.lifesimulator.backend.engine.llm;

public record LlmUsage(
  int inputTokens,
  int cachedInputTokens,
  int outputTokens,
  int totalTokens,
  double estimatedCostUsd
) {
  public static LlmUsage empty() {
    return new LlmUsage(0, 0, 0, 0, 0);
  }

  public boolean cacheHit() {
    return cachedInputTokens > 0;
  }
}
