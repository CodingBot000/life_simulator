package com.lifesimulator.backend.engine.evaluation;

import java.util.Arrays;

public enum DecisionEvaluationTarget {
  REASONING_A("reasoning_a"),
  REASONING_B("reasoning_b"),
  COMPARISON("comparison"),
  FINAL_SELECTION("final_selection"),
  ADVISOR("advisor"),
  GUARDRAIL("guardrail"),
  REFLECTION("reflection");

  private final String value;

  DecisionEvaluationTarget(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static DecisionEvaluationTarget from(String value) {
    return Arrays
      .stream(values())
      .filter(target -> target.value.equals(normalize(value)))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Unsupported evaluation target: " + value));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
