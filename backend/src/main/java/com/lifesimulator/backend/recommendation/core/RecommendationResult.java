package com.lifesimulator.backend.recommendation.core;

import java.time.OffsetDateTime;
import java.util.List;

public record RecommendationResult(
  String requestId,
  OffsetDateTime generatedAt,
  RecommendationIntent intent,
  RecommendationDisclosure disclosure,
  List<RecommendationItem> items,
  List<ProviderStatus> providerStatus
) {
  public RecommendationResult {
    generatedAt = generatedAt == null ? OffsetDateTime.now() : generatedAt;
    items = items == null ? List.of() : List.copyOf(items);
    providerStatus = providerStatus == null ? List.of() : List.copyOf(providerStatus);
  }
}
