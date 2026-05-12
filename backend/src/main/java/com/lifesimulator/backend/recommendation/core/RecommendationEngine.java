package com.lifesimulator.backend.recommendation.core;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public class RecommendationEngine {

  private final RecommendationIntentExtractor intentExtractor;
  private final List<RecommendationProvider> providers;
  private final RecommendationRanker ranker;
  private final RecommendationSafetyPolicy safetyPolicy;

  public RecommendationEngine(
    RecommendationIntentExtractor intentExtractor,
    List<RecommendationProvider> providers,
    RecommendationRanker ranker,
    RecommendationSafetyPolicy safetyPolicy
  ) {
    this.intentExtractor = intentExtractor;
    this.providers = List.copyOf(providers);
    this.ranker = ranker;
    this.safetyPolicy = safetyPolicy;
  }

  public RecommendationResult recommend(RecommendationContext context) {
    validate(context);
    RecommendationIntent intent = intentExtractor.extract(context);
    List<RecommendationItem> items = new ArrayList<>();
    List<ProviderStatus> statuses = new ArrayList<>();

    for (RecommendationProvider provider : providers) {
      if (!context.allowsProvider(provider.name())) {
        statuses.add(ProviderStatus.disabled(provider.name(), "provider not enabled for request"));
        continue;
      }
      try {
        RecommendationProviderResult result = provider.search(context, intent);
        items.addAll(result.items());
        statuses.add(result.status());
      } catch (RuntimeException error) {
        statuses.add(ProviderStatus.error(provider.name(), message(error)));
      }
    }

    List<RecommendationItem> filtered = safetyPolicy.filter(intent, items);
    List<RecommendationItem> ranked = ranker.rank(context, intent, filtered);

    return new RecommendationResult(
      context.requestId(),
      OffsetDateTime.now(),
      intent,
      disclosure(ranked),
      ranked,
      statuses
    );
  }

  private void validate(RecommendationContext context) {
    if (context == null) {
      throw new IllegalArgumentException("recommendation context is required");
    }
    if (context.requestId().isBlank()) {
      throw new IllegalArgumentException("request_id is required");
    }
  }

  private RecommendationDisclosure disclosure(List<RecommendationItem> items) {
    boolean affiliateIncluded = items.stream().anyMatch(item -> item.affiliate() || item.sponsored());
    return new RecommendationDisclosure(
      "추천",
      affiliateIncluded
        ? "추천 항목에는 광고 또는 제휴 링크가 포함될 수 있습니다."
        : "추천 항목은 시뮬레이션 결과를 바탕으로 선별된 참고 자료입니다.",
      affiliateIncluded
    );
  }

  private String message(RuntimeException error) {
    String message = error.getMessage();
    return message == null || message.isBlank() ? error.getClass().getSimpleName() : message;
  }
}
