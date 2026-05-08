package com.lifesimulator.backend.engine.routing;

import java.util.List;
import java.util.Map;

public record ExecutionPath(
  ExecutionMode executionMode,
  List<String> selectedPath,
  Map<String, String> stageModelPlan,
  Map<String, String> stageFallbackPlan,
  List<String> reasons,
  int estimatedTokens
) {}
