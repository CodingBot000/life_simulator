package com.lifesimulator.backend.engine.contract;

import java.util.Map;

public record GenericDecisionResult(
  String recommendedOptionId,
  String recommendedOptionLabel,
  double confidence,
  String rationale,
  Map<String, Object> guardrails,
  Map<String, Object> source
) {}
