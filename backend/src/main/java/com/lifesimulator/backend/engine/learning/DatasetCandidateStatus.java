package com.lifesimulator.backend.engine.learning;

import java.util.Arrays;

public enum DatasetCandidateStatus {
  CANDIDATE("candidate"),
  ACCEPTED("accepted"),
  REJECTED("rejected"),
  EXPORTED("exported");

  private final String value;

  DatasetCandidateStatus(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static DatasetCandidateStatus from(String value) {
    return Arrays
      .stream(values())
      .filter(status -> status.value.equals(normalize(value)))
      .findFirst()
      .orElseThrow(() -> new IllegalArgumentException("Unsupported dataset candidate status: " + value));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
