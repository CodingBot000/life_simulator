package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import org.springframework.stereotype.Component;

@Component
public class StageInputFactory {

  private final ObjectMapper objectMapper;

  public StageInputFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  ) {
    ObjectNode input = objectMapper.createObjectNode();
    input.put("caseId", requestId);
    input.put("outputLocale", locale);
    input.set("caseInput", request);
    input.set("routing", response.path("routing"));
    input.set("stateContext", response.path("stateContext"));
    input.set("plannerResult", response.path("planner"));
    input.set("scenarioA", response.path("scenarioA"));
    input.set("scenarioB", response.path("scenarioB"));
    input.set("riskA", response.path("riskA"));
    input.set("riskB", response.path("riskB"));
    input.set("abReasoning", response.path("reasoning"));
    input.set("guardrailResult", response.path("guardrail"));
    input.set("advisorResult", response.path("advisor"));
    input.put("stageName", stage.stageName());
    input.put("executionMode", routingDecision.executionMode());
    if (stage == SimulationStage.SCENARIO_A || stage == SimulationStage.RISK_A) {
      input.put("optionLabel", "A");
      input.put("selectedOption", request.at("/decision/optionA").asText());
    }
    if (stage == SimulationStage.SCENARIO_B || stage == SimulationStage.RISK_B) {
      input.put("optionLabel", "B");
      input.put("selectedOption", request.at("/decision/optionB").asText());
    }
    return input;
  }
}
