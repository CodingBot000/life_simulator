package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LifeSimulationSeedFactory {

  private final LifeResponseJson json;
  private final LifeStageSeedFactory stageSeedFactory;
  private final LifeStateSeedFactory stateSeedFactory;
  private final ObjectMapper objectMapper;

  public LifeSimulationSeedFactory(
    ObjectMapper objectMapper,
    LifeStageSeedFactory stageSeedFactory,
    LifeStateSeedFactory stateSeedFactory
  ) {
    this.objectMapper = objectMapper;
    this.json = new LifeResponseJson(objectMapper);
    this.stageSeedFactory = stageSeedFactory;
    this.stateSeedFactory = stateSeedFactory;
  }

  public JsonNode deterministicResponse(
    String requestId,
    JsonNode request,
    String locale,
    BackendRoutingDecision routingDecision
  ) {
    JsonNode profile = request.path("userProfile");
    JsonNode decision = request.path("decision");
    String optionA = decision.path("optionA").asText("Option A");
    String optionB = decision.path("optionB").asText("Option B");
    String risk = profile.path("risk_tolerance").asText("medium");
    ArrayNode priorities = stateSeedFactory.priorityArray(profile);
    String selected = "high".equals(risk) ? "B" : "A";
    String selectedOption = "A".equals(selected) ? optionA : optionB;

    ObjectNode root = objectMapper.createObjectNode();
    root.put("request_id", requestId);
    root.set("routing", routing(routingDecision));
    root.set("stateContext", stateSeedFactory.stateContext(requestId, request, priorities, risk, locale));
    root.set("planner", stageSeedFactory.planner(priorities, decision));
    root.set("scenarioA", stageSeedFactory.scenario(optionA, "A", locale));
    root.set("scenarioB", stageSeedFactory.scenario(optionB, "B", locale));
    root.set("riskA", stageSeedFactory.riskResult(risk, optionA, locale));
    root.set("riskB", stageSeedFactory.riskResult("high".equals(risk) ? "medium" : risk, optionB, locale));
    root.set("reasoning", stageSeedFactory.reasoning(requestId, request, selected, locale));
    root.set("guardrail", stageSeedFactory.guardrail(risk));
    root.set("advisor", stageSeedFactory.advisor(selected, selectedOption, locale));
    root.set("reflection", stageSeedFactory.reflection("high".equals(risk), locale));
    return root;
  }

  private ObjectNode routing(BackendRoutingDecision decision) {
    ObjectNode routing = objectMapper.createObjectNode();
    routing.put("execution_mode", decision.executionMode());
    routing.set("selected_path", json.array(decision.selectedPath()));
    ObjectNode plan = objectMapper.createObjectNode();
    for (Map.Entry<String, String> entry : decision.stageModelPlan().entrySet()) {
      plan.put(entry.getKey(), entry.getValue());
    }
    ObjectNode fallbackPlan = objectMapper.createObjectNode();
    for (Map.Entry<String, String> entry : decision.stageFallbackPlan().entrySet()) {
      fallbackPlan.put(entry.getKey(), entry.getValue());
    }
    routing.set("stage_model_plan", plan);
    routing.set("stage_fallback_plan", fallbackPlan);
    routing.set("reasons", json.array(decision.reasons()));
    ObjectNode profile = routing.putObject("risk_profile");
    profile.put("model_tier", "low_cost");
    profile.put("risk_band", decision.riskBand());
    profile.put("complexity", decision.complexity());
    profile.put("ambiguity", decision.ambiguity());
    profile.put("state_unknown_count", decision.stateUnknownCount());
    profile.put("estimated_tokens", decision.estimatedTokens());
    return routing;
  }
}
