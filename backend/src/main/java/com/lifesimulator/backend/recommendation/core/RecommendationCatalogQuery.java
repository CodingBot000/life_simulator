package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationCatalogQuery(
  String locale,
  String topic,
  List<String> keywords,
  int limit
) {
  public RecommendationCatalogQuery {
    locale = locale == null || locale.isBlank() ? "ko" : locale.trim();
    topic = topic == null || topic.isBlank() ? "general_decision_support" : topic.trim();
    keywords = keywords == null ? List.of() : List.copyOf(keywords);
    limit = Math.max(1, limit);
  }
}
