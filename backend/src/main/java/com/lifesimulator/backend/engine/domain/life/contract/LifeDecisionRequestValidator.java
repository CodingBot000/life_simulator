package com.lifesimulator.backend.engine.domain.life.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class LifeDecisionRequestValidator {

  public void validate(JsonNode request) {
    if (!request.hasNonNull("userProfile") || !request.hasNonNull("decision")) {
      throw new IllegalArgumentException("Invalid request: userProfile and decision are required.");
    }
    JsonNode profile = request.path("userProfile");
    JsonNode decision = request.path("decision");
    requireText(profile, "job");
    requireText(profile, "risk_tolerance");
    requireArray(profile, "priority");
    requireText(decision, "optionA");
    requireText(decision, "optionB");
    requireText(decision, "context");
    if (!profile.path("age").isNumber() || profile.path("age").asInt() <= 0) {
      throw new IllegalArgumentException("Invalid request: age must be a positive number.");
    }
  }

  private void requireText(JsonNode node, String field) {
    if (!node.hasNonNull(field) || node.path(field).asText().isBlank()) {
      throw new IllegalArgumentException("Invalid request: " + field + " must be a non-empty string.");
    }
  }

  private void requireArray(JsonNode node, String field) {
    if (!node.path(field).isArray() || node.path(field).isEmpty()) {
      throw new IllegalArgumentException("Invalid request: " + field + " must be a non-empty array.");
    }
  }
}
