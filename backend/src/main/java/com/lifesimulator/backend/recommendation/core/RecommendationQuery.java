package com.lifesimulator.backend.recommendation.core;

public record RecommendationQuery(
  String provider,
  String query,
  String reason
) {
  public RecommendationQuery {
    provider = normalize(provider);
    query = normalize(query);
    reason = normalize(reason);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
