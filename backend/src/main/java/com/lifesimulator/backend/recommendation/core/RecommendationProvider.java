package com.lifesimulator.backend.recommendation.core;

public interface RecommendationProvider {
  String name();

  RecommendationProviderResult search(RecommendationContext context, RecommendationIntent intent);
}
