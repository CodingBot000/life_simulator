package com.lifesimulator.backend.engine.guardrail;

public record GuardrailInput(
  double riskScore,
  double confidenceScore,
  double uncertaintyScore,
  boolean highRisk,
  boolean lowConfidence,
  boolean ambiguityHigh,
  boolean reasoningConflict,
  boolean missingInfo
) {}
