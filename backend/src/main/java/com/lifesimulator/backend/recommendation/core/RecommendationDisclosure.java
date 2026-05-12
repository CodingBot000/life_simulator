package com.lifesimulator.backend.recommendation.core;

public record RecommendationDisclosure(
  String label,
  String text,
  boolean affiliateIncluded
) {}
