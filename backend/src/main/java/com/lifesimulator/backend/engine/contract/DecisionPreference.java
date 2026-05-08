package com.lifesimulator.backend.engine.contract;

import java.util.List;
import java.util.Map;

public record DecisionPreference(
  String riskTolerance,
  List<String> priorities,
  Map<String, Object> attributes
) {}
