package com.lifesimulator.backend.recommendation.life;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.recommendation.api.RecommendationRequest;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class LifeRecommendationContextMapper {

  private static final int DEFAULT_MAX_ITEMS = 6;

  public RecommendationContext map(RecommendationRequest request, int maxAllowedItems) {
    JsonNode caseInput = request.caseInput();
    JsonNode response = request.simulationResponse();
    int maxItems = clamp(request.maxItems(), maxAllowedItems);
    return new RecommendationContext(
      request.requestId(),
      request.locale(),
      user(caseInput),
      decision(caseInput, response),
      result(response),
      request.enabledProviders(),
      maxItems
    );
  }

  private UserContext user(JsonNode caseInput) {
    return new UserContext(
      text(caseInput, LifeRecommendationFieldPaths.CASE_JOB),
      stringList(caseInput.at(LifeRecommendationFieldPaths.CASE_PRIORITY)),
      text(caseInput, LifeRecommendationFieldPaths.CASE_RISK_TOLERANCE)
    );
  }

  private DecisionContext decision(JsonNode caseInput, JsonNode response) {
    return new DecisionContext(
      text(caseInput, LifeRecommendationFieldPaths.DECISION_CONTEXT),
      List.of(
        text(caseInput, LifeRecommendationFieldPaths.DECISION_OPTION_A),
        text(caseInput, LifeRecommendationFieldPaths.DECISION_OPTION_B)
      )
        .stream()
        .filter(value -> !value.isBlank())
        .toList(),
      text(response, LifeRecommendationFieldPaths.ADVISOR_DECISION)
    );
  }

  private ResultContext result(JsonNode response) {
    return new ResultContext(
      text(response, LifeRecommendationFieldPaths.ADVISOR_REASON),
      stringList(response.at(LifeRecommendationFieldPaths.PLANNER_FACTORS)),
      stringList(response.at(LifeRecommendationFieldPaths.REFLECTION_ACTIONS)),
      riskLevel(response)
    );
  }

  private String riskLevel(JsonNode response) {
    String riskA = text(response, LifeRecommendationFieldPaths.RISK_A_LEVEL);
    String riskB = text(response, LifeRecommendationFieldPaths.RISK_B_LEVEL);
    if ("high".equalsIgnoreCase(riskA) || "high".equalsIgnoreCase(riskB)) {
      return "high";
    }
    if ("medium".equalsIgnoreCase(riskA) || "medium".equalsIgnoreCase(riskB)) {
      return "medium";
    }
    if ("low".equalsIgnoreCase(riskA) || "low".equalsIgnoreCase(riskB)) {
      return "low";
    }
    return "";
  }

  private int clamp(Integer requested, int maxAllowedItems) {
    int value = requested == null ? DEFAULT_MAX_ITEMS : requested;
    return Math.max(1, Math.min(value, maxAllowedItems));
  }

  private List<String> stringList(JsonNode node) {
    if (!node.isArray()) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    for (JsonNode item : node) {
      String value = item.asText("").trim();
      if (!value.isBlank()) {
        values.add(value);
      }
    }
    return values;
  }

  private String text(JsonNode node, String pointer) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return "";
    }
    return node.at(pointer).asText("").trim();
  }
}
