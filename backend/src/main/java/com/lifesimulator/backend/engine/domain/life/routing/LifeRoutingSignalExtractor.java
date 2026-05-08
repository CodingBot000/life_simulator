package com.lifesimulator.backend.engine.domain.life.routing;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.routing.RoutingSignal;
import org.springframework.stereotype.Component;

@Component
public class LifeRoutingSignalExtractor {

  public RoutingSignal extract(JsonNode request) {
    String riskBand = request.at("/userProfile/risk_tolerance").asText("medium");
    String context = request.at("/decision/context").asText("");
    int priorityCount = request.at("/userProfile/priority").isArray()
      ? request.at("/userProfile/priority").size()
      : 0;
    int unknownCount = stateUnknownCount(request);

    return new RoutingSignal(
      riskBand,
      complexity(context, priorityCount),
      ambiguity(context, unknownCount),
      unknownCount,
      context.length()
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
}
