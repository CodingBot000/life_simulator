package com.lifesimulator.backend.guardrail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import org.springframework.stereotype.Service;

@Service
public class GuardrailEvaluationService {

  private final ObjectMapper objectMapper;

  public GuardrailEvaluationService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode evaluate(JsonNode response, BackendRoutingDecision routingDecision) {
    double riskScore = maxRiskScore(response);
    double confidence = confidence(response);
    double uncertainty = uncertainty(routingDecision, response);
    boolean highRisk = riskScore >= 0.7 || "high".equals(routingDecision.riskBand());
    boolean lowConfidence = confidence < 0.62;
    boolean ambiguityHigh = "high".equals(routingDecision.ambiguity()) || routingDecision.stateUnknownCount() >= 3;
    boolean conflict = routingDecision.selectedPath().contains("ab_reasoning") &&
      response.at("/reasoning/structured_signals/conflict").asBoolean(false);

    ArrayNode triggers = objectMapper.createArrayNode();
    if (ambiguityHigh) {
      triggers.add("ambiguity_high");
    }
    if (conflict) {
      triggers.add("reasoning_conflict");
    }
    if (lowConfidence) {
      triggers.add("low_confidence");
    }
    if (highRisk) {
      triggers.add("high_risk");
    }

    ObjectNode guardrail = objectMapper.createObjectNode();
    guardrail.put("guardrail_triggered", !triggers.isEmpty());
    guardrail.set("triggers", triggers);
    guardrail.set("strategy", strategies(triggers));
    guardrail.put("risk_score", round(riskScore));
    guardrail.put("confidence_score", round(confidence));
    guardrail.put("uncertainty_score", round(uncertainty));
    guardrail.set("reasoning_signals", reasoningSignals(ambiguityHigh, conflict, lowConfidence, confidence));
    guardrail.put("final_mode", finalMode(highRisk, ambiguityHigh, lowConfidence, conflict));
    return guardrail;
  }

  private double maxRiskScore(JsonNode response) {
    double a = response.at("/riskA/structured_assessment/risk_score").asDouble(0.35);
    double b = response.at("/riskB/structured_assessment/risk_score").asDouble(0.35);
    return Math.max(a, b);
  }

  private double confidence(JsonNode response) {
    double advisor = response.at("/advisor/confidence").asDouble(0);
    if (advisor > 0) {
      return advisor;
    }
    return response.at("/reasoning/reasoning/final_selection/decision_confidence").asDouble(0.68);
  }

  private double uncertainty(BackendRoutingDecision routingDecision, JsonNode response) {
    double uncertainty = 0.18;
    if ("medium".equals(routingDecision.ambiguity())) {
      uncertainty += 0.18;
    }
    if ("high".equals(routingDecision.ambiguity())) {
      uncertainty += 0.34;
    }
    uncertainty += Math.min(0.2, routingDecision.stateUnknownCount() * 0.07);
    if (response.at("/reasoning/structured_signals/missing_info").asBoolean(false)) {
      uncertainty += 0.18;
    }
    return Math.min(0.9, uncertainty);
  }

  private ArrayNode strategies(ArrayNode triggers) {
    ArrayNode strategies = objectMapper.createArrayNode();
    for (JsonNode trigger : triggers) {
      switch (trigger.asText()) {
        case "ambiguity_high" -> addUnique(strategies, "ask_more_info");
        case "reasoning_conflict" -> addUnique(strategies, "neutralize_decision");
        case "high_risk" -> addUnique(strategies, "risk_warning");
        case "low_confidence" -> addUnique(strategies, "soft_recommendation");
        default -> {
        }
      }
    }
    if (strategies.isEmpty()) {
      strategies.add("soft_recommendation");
    }
    return strategies;
  }

  private ObjectNode reasoningSignals(
    boolean ambiguityHigh,
    boolean conflict,
    boolean lowConfidence,
    double confidence
  ) {
    ObjectNode signals = objectMapper.createObjectNode();
    signals.put("conflicting_signals", conflict);
    signals.put("missing_context", ambiguityHigh);
    signals.put("weak_evidence", lowConfidence);
    signals.put("ambiguous_wording", ambiguityHigh);
    signals.put("strong_consensus", confidence >= 0.72 && !conflict);
    signals.put("repeated_evidence", !conflict);
    return signals;
  }

  private String finalMode(
    boolean highRisk,
    boolean ambiguityHigh,
    boolean lowConfidence,
    boolean conflict
  ) {
    if (highRisk && ambiguityHigh && lowConfidence) {
      return "blocked";
    }
    if (highRisk || ambiguityHigh || lowConfidence || conflict) {
      return "cautious";
    }
    return "normal";
  }

  private void addUnique(ArrayNode array, String value) {
    for (JsonNode node : array) {
      if (value.equals(node.asText())) {
        return;
      }
    }
    array.add(value);
  }

  private double round(double value) {
    return Math.round(value * 10_000d) / 10_000d;
  }
}
