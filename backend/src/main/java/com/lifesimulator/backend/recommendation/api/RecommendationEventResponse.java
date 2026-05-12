package com.lifesimulator.backend.recommendation.api;

public record RecommendationEventResponse(
  boolean accepted,
  String status
) {
  public static RecommendationEventResponse ok() {
    return new RecommendationEventResponse(true, "accepted");
  }
}
