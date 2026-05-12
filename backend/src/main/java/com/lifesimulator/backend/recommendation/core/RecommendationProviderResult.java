package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public record RecommendationProviderResult(
  String provider,
  List<RecommendationItem> items,
  ProviderStatus status
) {
  public RecommendationProviderResult {
    items = items == null ? List.of() : List.copyOf(items);
    status = status == null ? ProviderStatus.ok(provider, items.size()) : status;
  }
}
