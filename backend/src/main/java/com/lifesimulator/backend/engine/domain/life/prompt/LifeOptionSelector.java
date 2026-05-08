package com.lifesimulator.backend.engine.domain.life.prompt;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.simulation.SimulationStage;
import org.springframework.stereotype.Component;

@Component
public class LifeOptionSelector {

  public String optionLabelFor(SimulationStage stage) {
    if (stage == SimulationStage.SCENARIO_A || stage == SimulationStage.RISK_A) {
      return "A";
    }
    if (stage == SimulationStage.SCENARIO_B || stage == SimulationStage.RISK_B) {
      return "B";
    }
    return "";
  }

  public String selectedOptionFor(SimulationStage stage, JsonNode request) {
    return switch (optionLabelFor(stage)) {
      case "A" -> request.at("/decision/optionA").asText();
      case "B" -> request.at("/decision/optionB").asText();
      default -> "";
    };
  }
}
