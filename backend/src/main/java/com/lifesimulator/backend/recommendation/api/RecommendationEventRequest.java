package com.lifesimulator.backend.recommendation.api;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RecommendationEventRequest(
  @JsonProperty("request_id") String requestId,
  String provider,
  @JsonProperty("item_id") String itemId,
  @JsonProperty("event_type") String eventType
) {}
