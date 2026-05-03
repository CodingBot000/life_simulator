package com.lifesimulator.backend.routing;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class SimulationRouter {

  private static final List<String> LIGHT_PATH = List.of("planner", "advisor");
  private static final List<String> STANDARD_PATH = List.of("planner", "scenario", "advisor");
  private static final List<String> CAREFUL_PATH = List.of("planner", "scenario", "risk", "advisor");
  private static final List<String> FULL_PATH = List.of(
    "planner",
    "scenario",
    "risk",
    "ab_reasoning",
    "guardrail",
    "advisor",
    "reflection"
  );

  public BackendRoutingDecision route(JsonNode request, String model) {
    String riskBand = request.at("/userProfile/risk_tolerance").asText("medium");
    String context = request.at("/decision/context").asText("");
    int priorityCount = request.at("/userProfile/priority").isArray()
      ? request.at("/userProfile/priority").size()
      : 0;
    int unknownCount = stateUnknownCount(request);
    String complexity = complexity(context, priorityCount);
    String ambiguity = ambiguity(context, unknownCount);
    String executionMode = executionMode(riskBand, complexity, ambiguity, unknownCount);
    List<String> selectedPath = pathForMode(executionMode);
    Map<String, String> stagePlan = stagePlan(selectedPath, model);

    return new BackendRoutingDecision(
      executionMode,
      selectedPath,
      stagePlan,
      new LinkedHashMap<>(stagePlan),
      reasons(riskBand, complexity, ambiguity, unknownCount, executionMode),
      riskBand,
      complexity,
      ambiguity,
      unknownCount,
      estimateTokens(context, selectedPath)
    );
  }

  private int stateUnknownCount(JsonNode request) {
    int unknown = 0;
    if (request.at("/decision/context").asText("").length() < 80) {
      unknown += 1;
    }
    if (request.at("/userProfile/priority").isEmpty()) {
      unknown += 1;
    }
    return unknown;
  }

  private String complexity(String context, int priorityCount) {
    if (context.length() > 240 || priorityCount >= 4) {
      return "high";
    }
    if (context.length() > 100 || priorityCount >= 2) {
      return "medium";
    }
    return "low";
  }

  private String ambiguity(String context, int unknownCount) {
    String lowered = context.toLowerCase();
    if (unknownCount >= 3 || lowered.contains("모르") || lowered.contains("uncertain")) {
      return "high";
    }
    if (unknownCount >= 2 || lowered.contains("고민") || lowered.contains("걱정")) {
      return "medium";
    }
    return "low";
  }

  private String executionMode(
    String riskBand,
    String complexity,
    String ambiguity,
    int unknownCount
  ) {
    if ("high".equals(riskBand) || "high".equals(complexity) || "high".equals(ambiguity)) {
      return "full";
    }
    if ("medium".equals(riskBand) || unknownCount >= 2) {
      return "careful";
    }
    if ("low".equals(complexity) && "low".equals(ambiguity)) {
      return "light";
    }
    return "standard";
  }

  private List<String> pathForMode(String executionMode) {
    return switch (executionMode) {
      case "light" -> LIGHT_PATH;
      case "standard" -> STANDARD_PATH;
      case "careful" -> CAREFUL_PATH;
      default -> FULL_PATH;
    };
  }

  private Map<String, String> stagePlan(List<String> selectedPath, String model) {
    Map<String, String> plan = new LinkedHashMap<>();
    plan.put("state_loader", model);
    plan.put("planner", model);
    if (selectedPath.contains("scenario")) {
      plan.put("scenario_a", model);
      plan.put("scenario_b", model);
    }
    if (selectedPath.contains("risk")) {
      plan.put("risk_a", model);
      plan.put("risk_b", model);
    }
    if (selectedPath.contains("ab_reasoning")) {
      plan.put("ab_reasoning", model);
    }
    if (selectedPath.contains("guardrail")) {
      plan.put("guardrail", "spring-derived");
    }
    plan.put("advisor", model);
    if (selectedPath.contains("reflection")) {
      plan.put("reflection", model);
    }
    return plan;
  }

  private List<String> reasons(
    String riskBand,
    String complexity,
    String ambiguity,
    int unknownCount,
    String executionMode
  ) {
    List<String> reasons = new ArrayList<>();
    reasons.add("risk_band=" + riskBand);
    reasons.add("complexity=" + complexity);
    reasons.add("ambiguity=" + ambiguity);
    reasons.add("state_unknown_count=" + unknownCount);
    reasons.add("execution_mode=" + executionMode);
    return reasons;
  }

  private int estimateTokens(String context, List<String> selectedPath) {
    return Math.max(600, 500 + context.length() * 2 + selectedPath.size() * 180);
  }
}
