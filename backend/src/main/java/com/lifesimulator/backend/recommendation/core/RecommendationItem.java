package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationItem(
  String id,
  String provider,
  String type,
  String title,
  String description,
  String url,
  String imageUrl,
  String priceLabel,
  String mallName,
  String creatorName,
  boolean affiliate,
  boolean sponsored,
  String why,
  double rankScore,
  List<String> tags
) {
  public RecommendationItem {
    id = normalize(id);
    provider = normalize(provider);
    type = normalize(type);
    title = normalize(title);
    description = normalize(description);
    url = normalize(url);
    imageUrl = blankToNull(imageUrl);
    priceLabel = blankToNull(priceLabel);
    mallName = blankToNull(mallName);
    creatorName = blankToNull(creatorName);
    why = normalize(why);
    rankScore = clamp(rankScore);
    tags = tags == null ? List.of() : List.copyOf(tags);
  }

  public RecommendationItem withRank(double score, String reason) {
    return new RecommendationItem(
      id,
      provider,
      type,
      title,
      description,
      url,
      imageUrl,
      priceLabel,
      mallName,
      creatorName,
      affiliate,
      sponsored,
      reason,
      score,
      tags
    );
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }

  private static String blankToNull(String value) {
    String normalized = normalize(value);
    return normalized.isBlank() ? null : normalized;
  }

  private static double clamp(double value) {
    if (Double.isNaN(value) || value < 0) {
      return 0;
    }
    return Math.min(1, value);
  }
}
