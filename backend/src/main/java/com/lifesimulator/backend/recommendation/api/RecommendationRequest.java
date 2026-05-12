package com.lifesimulator.backend.recommendation.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record RecommendationRequest(
  @JsonProperty("request_id") String requestId,
  String locale,
  @JsonProperty("case_input") JsonNode caseInput,
  @JsonProperty("simulation_response") JsonNode simulationResponse,
  @JsonProperty("max_items") Integer maxItems,
  @JsonProperty("enabled_providers") List<String> enabledProviders
) {
  public RecommendationRequest {
    locale = locale == null || locale.isBlank() ? "ko" : locale.trim();
    enabledProviders = enabledProviders == null ? List.of() : List.copyOf(enabledProviders);
  }
}
