package com.lifesimulator.backend.engine.contract;

import java.util.Map;

public record DecisionContext(
  String locale,
  Map<String, Object> user,
  Map<String, Object> situation,
  Map<String, Object> memory,
  Map<String, Object> attributes
) {}
