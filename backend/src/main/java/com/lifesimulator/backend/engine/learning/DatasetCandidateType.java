package com.lifesimulator.backend.engine.learning;

import java.util.Arrays;

public enum DatasetCandidateType {
  ADVISOR_PREFERENCE("advisor_preference"),
  REASONING_PREFERENCE("reasoning_preference"),
  GUARDRAIL_LABEL("guardrail_label"),
  STATE_CORRECTION("state_correction"),
  OUTCOME_SUPERVISION("outcome_supervision");

  private final String value;

  DatasetCandidateType(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static DatasetCandidateType from(String value) {
    return Arrays
      .stream(values())
      .filter(type -> type.value.equals(normalize(value)))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Unsupported dataset candidate type: " + value));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
