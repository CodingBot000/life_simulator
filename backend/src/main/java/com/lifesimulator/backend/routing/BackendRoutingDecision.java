package com.lifesimulator.backend.routing;

import java.util.List;
import java.util.Map;

public record BackendRoutingDecision(
  String executionMode,
  List<String> selectedPath,
  Map<String, String> stageModelPlan,
  Map<String, String> stageFallbackPlan,
  List<String> reasons,
  String riskBand,
  String complexity,
  String ambiguity,
  int stateUnknownCount,
  int estimatedTokens
) {
  public String selectedModel() {
    return stageModelPlan.getOrDefault("advisor", stageModelPlan.getOrDefault("planner", "unknown"));
  }
}
