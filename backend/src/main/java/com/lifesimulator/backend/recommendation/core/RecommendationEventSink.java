package com.lifesimulator.backend.recommendation.core;

public interface RecommendationEventSink {
  void record(String requestId, String provider, String itemId, String eventType);
}
