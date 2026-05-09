package com.lifesimulator.backend.engine.domain.life.prompt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.contract.GenericDecisionRequest;
import com.lifesimulator.backend.engine.domain.life.mapping.LifeRequestToGenericDecisionMapper;
import com.lifesimulator.backend.engine.prompt.StageInputMapper;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.simulation.SimulationStage;
import org.springframework.stereotype.Component;

@Component
public class LifeStageInputMapper implements StageInputMapper {

  private final LifeOptionSelector optionSelector;
  private final LifeRequestToGenericDecisionMapper genericDecisionMapper;
  private final ObjectMapper objectMapper;

  public LifeStageInputMapper(
    ObjectMapper objectMapper,
    LifeOptionSelector optionSelector,
    LifeRequestToGenericDecisionMapper genericDecisionMapper
  ) {
    this.objectMapper = objectMapper;
    this.optionSelector = optionSelector;
    this.genericDecisionMapper = genericDecisionMapper;
  }

  @Override
  public JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  ) {
    GenericDecisionRequest genericDecision = genericDecisionMapper.map(request, locale);
    JsonNode optionDetails = request.at("/decision/optionDetails");
    JsonNode reevaluation = request.path("reevaluation");
    ObjectNode input = objectMapper.createObjectNode();
    input.put("caseId", requestId);
    input.put("outputLocale", locale);
    input.set("caseInput", request);
    input.set("genericDecision", objectMapper.valueToTree(genericDecision));
    input.set("optionDetails", objectOrEmpty(optionDetails));
    input.set("reevaluation", objectOrEmpty(reevaluation));
    input.put("hasOptionFollowup", hasOptionFollowup(optionDetails));
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
    String optionLabel = optionSelector.optionLabelFor(stage);
    if (!optionLabel.isBlank()) {
      input.put("optionLabel", optionLabel);
      input.put("selectedOption", optionSelector.selectedOptionFor(stage, request));
      input.set("selectedOptionDetails", objectOrEmpty(optionDetails.path(optionLabel)));
    }
    return input;
  }

  private ObjectNode objectOrEmpty(JsonNode node) {
    return node != null && node.isObject()
      ? (ObjectNode) node.deepCopy()
      : objectMapper.createObjectNode();
  }

  private boolean hasOptionFollowup(JsonNode optionDetails) {
    if (optionDetails == null || !optionDetails.isObject()) {
      return false;
    }
    return hasAnyFollowupText(optionDetails.path("A")) || hasAnyFollowupText(optionDetails.path("B"));
  }

  private boolean hasAnyFollowupText(JsonNode detail) {
    return hasText(detail.path("worstCase")) || hasText(detail.path("rollbackCondition"));
  }

  private boolean hasText(JsonNode value) {
    return value.isTextual() && !value.asText().isBlank();
  }
}
