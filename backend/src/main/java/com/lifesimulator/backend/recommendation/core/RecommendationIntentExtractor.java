package com.lifesimulator.backend.recommendation.core;

public interface RecommendationIntentExtractor {
  RecommendationIntent extract(RecommendationContext context);
}
