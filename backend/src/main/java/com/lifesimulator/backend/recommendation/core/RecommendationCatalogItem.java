package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationCatalogItem(
  String id,
  String provider,
  String itemType,
  String locale,
  String status,
  String title,
  String description,
  String url,
  String imageUrl,
  String priceLabel,
  String mallName,
  String creatorName,
  List<String> keywords,
  List<String> tags,
  List<String> eligibleTopics,
  boolean affiliate,
  boolean sponsored,
  double priorityScore,
  String startsAt,
  String endsAt
) {
  public RecommendationCatalogItem {
    keywords = keywords == null ? List.of() : List.copyOf(keywords);
    tags = tags == null ? List.of() : List.copyOf(tags);
    eligibleTopics = eligibleTopics == null ? List.of() : List.copyOf(eligibleTopics);
  }

  public boolean active() {
    return status == null || status.isBlank() || "active".equalsIgnoreCase(status);
  }
}
