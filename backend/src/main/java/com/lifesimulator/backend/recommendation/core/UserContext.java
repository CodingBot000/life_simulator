package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record UserContext(
  String job,
  List<String> priorities,
  String riskTolerance
) {
  public UserContext {
    priorities = priorities == null ? List.of() : List.copyOf(priorities);
    job = normalize(job);
    riskTolerance = normalize(riskTolerance);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
