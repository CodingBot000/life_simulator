package com.lifesimulator.backend.engine.domain.life.guardrail;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.guardrail.GuardrailInput;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import org.springframework.stereotype.Component;

@Component
public class LifeGuardrailSignalMapper {

  public GuardrailInput inputFor(JsonNode response, BackendRoutingDecision routingDecision) {
    double riskScore = maxRiskScore(response);
    double confidence = confidence(response);
    double uncertainty = uncertainty(routingDecision, response);
    boolean highRisk = riskScore >= 0.7 || "high".equals(routingDecision.riskBand());
    boolean lowConfidence = confidence < 0.62;
    boolean ambiguityHigh =
      "high".equals(routingDecision.ambiguity()) ||
      routingDecision.stateUnknownCount() >= 3;
    boolean conflict =
      routingDecision.selectedPath().contains("ab_reasoning") &&
      response.at("/reasoning/structured_signals/conflict").asBoolean(false);
    boolean missingInfo = response.at("/reasoning/structured_signals/missing_info").asBoolean(false);

    return new GuardrailInput(
      riskScore,
      confidence,
      uncertainty,
      highRisk,
      lowConfidence,
      ambiguityHigh,
      conflict,
      missingInfo
    );
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
}
