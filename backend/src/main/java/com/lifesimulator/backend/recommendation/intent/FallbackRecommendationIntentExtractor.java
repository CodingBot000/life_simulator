package com.lifesimulator.backend.recommendation.intent;

import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;

public class FallbackRecommendationIntentExtractor implements RecommendationIntentExtractor {

  private final RecommendationIntentExtractor primary;
  private final RecommendationIntentExtractor fallback;
  private final boolean primaryEnabled;

  public FallbackRecommendationIntentExtractor(
    RecommendationIntentExtractor primary,
    RecommendationIntentExtractor fallback,
    boolean primaryEnabled
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.primaryEnabled = primaryEnabled;
  }

  @Override
  public RecommendationIntent extract(RecommendationContext context) {
    if (!primaryEnabled) {
      return fallback.extract(context);
    }
    try {
      return primary.extract(context);
    } catch (RuntimeException error) {
      return fallback.extract(context);
    }
  }
}
