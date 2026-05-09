package com.lifesimulator.backend.engine.domain.life.contract;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class LifeDecisionRequestValidator {

  private static final int MAX_OPTION_DETAIL_LENGTH = 2_000;
  private static final int MAX_REEVALUATION_TEXT_LENGTH = 240;

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
    validateOptionDetails(decision.path("optionDetails"));
    validateReevaluation(request.path("reevaluation"));
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

  private void validateOptionDetails(JsonNode optionDetails) {
    if (optionDetails.isMissingNode() || optionDetails.isNull()) {
      return;
    }
    if (!optionDetails.isObject()) {
      throw new IllegalArgumentException("Invalid request: optionDetails must be an object.");
    }
    validateOptionDetail(optionDetails.path("A"), "A");
    validateOptionDetail(optionDetails.path("B"), "B");
  }

  private void validateOptionDetail(JsonNode detail, String optionLabel) {
    if (detail.isMissingNode() || detail.isNull()) {
      return;
    }
    if (!detail.isObject()) {
      throw new IllegalArgumentException("Invalid request: optionDetails." + optionLabel + " must be an object.");
    }
    validateOptionalText(detail, "worstCase", MAX_OPTION_DETAIL_LENGTH);
    validateOptionalText(detail, "rollbackCondition", MAX_OPTION_DETAIL_LENGTH);
  }

  private void validateReevaluation(JsonNode reevaluation) {
    if (reevaluation.isMissingNode() || reevaluation.isNull()) {
      return;
    }
    if (!reevaluation.isObject()) {
      throw new IllegalArgumentException("Invalid request: reevaluation must be an object.");
    }
    validateOptionalText(reevaluation, "reason", MAX_REEVALUATION_TEXT_LENGTH);
    validateOptionalText(reevaluation, "previousRequestId", MAX_REEVALUATION_TEXT_LENGTH);
    JsonNode iteration = reevaluation.path("iteration");
    if (
      !iteration.isMissingNode() &&
      !iteration.isNull() &&
      (!iteration.isIntegralNumber() || iteration.asInt() < 1)
    ) {
      throw new IllegalArgumentException("Invalid request: reevaluation.iteration must be a positive integer.");
    }
  }

  private void validateOptionalText(JsonNode node, String field, int maxLength) {
    JsonNode value = node.path(field);
    if (value.isMissingNode() || value.isNull()) {
      return;
    }
    if (!value.isTextual()) {
      throw new IllegalArgumentException("Invalid request: " + field + " must be a string.");
    }
    if (value.asText().length() > maxLength) {
      throw new IllegalArgumentException("Invalid request: " + field + " is too long.");
    }
  }
}
