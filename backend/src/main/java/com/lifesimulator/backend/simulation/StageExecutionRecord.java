package com.lifesimulator.backend.simulation;

import com.lifesimulator.backend.llm.LlmJsonResult;

public record StageExecutionRecord(
  String stageName,
  String executionKind,
  String model,
  int latencyMs,
  int inputTokens,
  int cachedInputTokens,
  int outputTokens,
  int totalTokens,
  double estimatedCostUsd,
  boolean fallbackUsed,
  int retryCount,
  boolean cacheHit,
  boolean schemaValid,
  String errorCode
) {
  public static StageExecutionRecord llm(
    String stageName,
    String executionKind,
    String model,
    LlmJsonResult result
  ) {
    return new StageExecutionRecord(
      stageName,
      executionKind,
      model,
      result.latencyMs(),
      result.usage().inputTokens(),
      result.usage().cachedInputTokens(),
      result.usage().outputTokens(),
      result.usage().totalTokens(),
      result.usage().estimatedCostUsd(),
      false,
      result.retryCount(),
      result.usage().cacheHit(),
      true,
      null
    );
  }

  public static StageExecutionRecord derived(String stageName) {
    return zero(stageName, "derived", "spring-derived", false, null);
  }

  public static StageExecutionRecord fallback(String stageName, String reason) {
    return zero(stageName, "deterministic", "fallback", true, reason);
  }

  private static StageExecutionRecord zero(
    String stageName,
    String executionKind,
    String model,
    boolean fallbackUsed,
    String errorCode
  ) {
    return new StageExecutionRecord(
      stageName,
      executionKind,
      model,
      0,
      0,
      0,
      0,
      0,
      0,
      fallbackUsed,
      0,
      false,
      true,
      errorCode
    );
  }
}
