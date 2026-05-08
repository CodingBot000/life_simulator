package com.lifesimulator.backend.engine.guardrail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class GuardrailResultFactory {

  private final ObjectMapper objectMapper;

  public GuardrailResultFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode create(GuardrailInput input) {
    ArrayNode triggers = triggers(input);
    ObjectNode guardrail = objectMapper.createObjectNode();
    guardrail.put("guardrail_triggered", !triggers.isEmpty());
    guardrail.set("triggers", triggers);
    guardrail.set("strategy", strategies(triggers));
    guardrail.put("risk_score", round(input.riskScore()));
    guardrail.put("confidence_score", round(input.confidenceScore()));
    guardrail.put("uncertainty_score", round(input.uncertaintyScore()));
    guardrail.set("reasoning_signals", reasoningSignals(input));
    guardrail.put("final_mode", finalMode(input));
    return guardrail;
  }

  private ArrayNode triggers(GuardrailInput input) {
    ArrayNode triggers = objectMapper.createArrayNode();
    if (input.ambiguityHigh()) {
      triggers.add("ambiguity_high");
    }
    if (input.reasoningConflict()) {
      triggers.add("reasoning_conflict");
    }
    if (input.lowConfidence()) {
      triggers.add("low_confidence");
    }
    if (input.highRisk()) {
      triggers.add("high_risk");
    }
    return triggers;
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

  private ObjectNode reasoningSignals(GuardrailInput input) {
    ObjectNode signals = objectMapper.createObjectNode();
    signals.put("conflicting_signals", input.reasoningConflict());
    signals.put("missing_context", input.ambiguityHigh());
    signals.put("weak_evidence", input.lowConfidence());
    signals.put("ambiguous_wording", input.ambiguityHigh());
    signals.put("strong_consensus", input.confidenceScore() >= 0.72 && !input.reasoningConflict());
    signals.put("repeated_evidence", !input.reasoningConflict());
    return signals;
  }

  private String finalMode(GuardrailInput input) {
    if (input.highRisk() && input.ambiguityHigh() && input.lowConfidence()) {
      return "blocked";
    }
    if (
      input.highRisk() ||
      input.ambiguityHigh() ||
      input.lowConfidence() ||
      input.reasoningConflict()
    ) {
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
