package com.lifesimulator.backend.recommendation.persistence;

import com.lifesimulator.backend.recommendation.core.RecommendationEventSink;
import org.springframework.stereotype.Component;

@Component
public class NoopRecommendationEventSink implements RecommendationEventSink {

  @Override
  public void record(String requestId, String provider, String itemId, String eventType) {
    // Event persistence is intentionally deferred until the DB-backed phase.
  }
}
