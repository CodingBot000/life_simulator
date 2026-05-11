package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record ResultContext(
  String advisorReason,
  List<String> plannerFactors,
  List<String> suggestedActions,
  String riskLevel
) {
  public ResultContext {
    advisorReason = normalize(advisorReason);
    plannerFactors = plannerFactors == null ? List.of() : List.copyOf(plannerFactors);
    suggestedActions = suggestedActions == null ? List.of() : List.copyOf(suggestedActions);
    riskLevel = normalize(riskLevel);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
