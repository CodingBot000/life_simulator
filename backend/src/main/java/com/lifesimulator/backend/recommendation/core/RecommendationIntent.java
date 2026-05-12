package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationIntent(
  String topic,
  String audienceContext,
  List<String> productTypes,
  List<RecommendationQuery> queries,
  List<String> negativeFilters,
  String safetyLevel
) {
  public RecommendationIntent {
    topic = normalize(topic).isBlank() ? "general_decision_support" : normalize(topic);
    audienceContext = normalize(audienceContext);
    productTypes = productTypes == null ? List.of() : List.copyOf(productTypes);
    queries = queries == null ? List.of() : List.copyOf(queries);
    negativeFilters = negativeFilters == null ? List.of() : List.copyOf(negativeFilters);
    safetyLevel = normalize(safetyLevel).isBlank() ? "normal" : normalize(safetyLevel);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
