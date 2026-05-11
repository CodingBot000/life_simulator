package com.lifesimulator.backend.engine.evaluation;

import java.util.Arrays;

public enum GuardrailReviewLabel {
  GOOD("good"),
  OVER("over"),
  MISSING("missing"),
  UNKNOWN("unknown");

  private final String value;

  GuardrailReviewLabel(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static GuardrailReviewLabel from(String value) {
    return Arrays
      .stream(values())
      .filter(label -> label.value.equals(normalize(value)))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Unsupported guardrail review label: " + value));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
