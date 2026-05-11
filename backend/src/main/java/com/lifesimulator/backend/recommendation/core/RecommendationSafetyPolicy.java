package com.lifesimulator.backend.recommendation.core;

import java.util.List;
import java.util.Set;

public class RecommendationSafetyPolicy {

  private static final Set<String> EDUCATIONAL_TYPES = Set.of(
    "book",
    "youtube_channel",
    "youtube_video",
    "course",
    "template"
  );

  public List<RecommendationItem> filter(RecommendationIntent intent, List<RecommendationItem> items) {
    if ("restricted".equalsIgnoreCase(intent.safetyLevel())) {
      return items
        .stream()
        .filter(item -> EDUCATIONAL_TYPES.contains(item.type()))
        .filter(item -> !item.affiliate() && !item.sponsored())
        .toList();
    }
    if ("sensitive".equalsIgnoreCase(intent.safetyLevel())) {
      return items
        .stream()
        .filter(item -> EDUCATIONAL_TYPES.contains(item.type()) || !item.affiliate())
        .toList();
    }
    return items;
  }
}
