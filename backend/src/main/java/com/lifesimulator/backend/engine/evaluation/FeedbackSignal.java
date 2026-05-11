package com.lifesimulator.backend.engine.evaluation;

import java.util.Arrays;

public enum FeedbackSignal {
  HELPFUL("helpful"),
  NOT_HELPFUL("not_helpful"),
  AGREE("agree"),
  DISAGREE("disagree"),
  WOULD_CHOOSE("would_choose"),
  MISSING_CONTEXT("missing_context");

  private final String value;

  FeedbackSignal(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static FeedbackSignal from(String value) {
    return Arrays
      .stream(values())
      .filter(signal -> signal.value.equals(normalize(value)))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Unsupported feedback signal: " + value));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
