package com.lifesimulator.backend.engine.domain.life.mapping;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.contract.GenericDecisionResult;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GenericDecisionToLifeResponseMapper {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final ObjectMapper objectMapper;

  public GenericDecisionToLifeResponseMapper(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public GenericDecisionResult fromLifeResponse(JsonNode response) {
    JsonNode advisor = response.path("advisor");
    Map<String, Object> source = new LinkedHashMap<>();
    source.put("request_id", response.path("request_id").asText(""));
    source.put("routing", objectMap(response.path("routing")));

    String decision = advisor.path("recommended_option").asText(
      advisor.path("decision").asText("undecided")
    );
    return new GenericDecisionResult(
      decision,
      decision,
      advisor.path("confidence").asDouble(0),
      advisor.path("reason").asText(""),
      objectMap(response.path("guardrail")),
      source
    );
  }

  public ObjectNode applyToLifeResponse(ObjectNode response, GenericDecisionResult result) {
    ObjectNode advisor = response.path("advisor").isObject()
      ? (ObjectNode) response.path("advisor")
      : response.putObject("advisor");
    String decision = lifeDecision(result.recommendedOptionId());
    advisor.put("decision", decision);
    advisor.put("recommended_option", decision);
    advisor.put("confidence", result.confidence());
    advisor.put("reason", result.rationale());
    advisor.put("guardrail_applied", result.guardrails() != null && !result.guardrails().isEmpty());
    ObjectNode basis = advisor.path("reasoning_basis").isObject()
      ? (ObjectNode) advisor.path("reasoning_basis")
      : advisor.putObject("reasoning_basis");
    basis.put("selected_reasoning", decision);
    basis.put("core_why", result.rationale());
    basis.put("decision_confidence", result.confidence());
    return response;
  }

  private String lifeDecision(String optionId) {
    if ("A".equalsIgnoreCase(optionId)) {
      return "A";
    }
    if ("B".equalsIgnoreCase(optionId)) {
      return "B";
    }
    return "undecided";
  }

  private Map<String, Object> objectMap(JsonNode node) {
    if (node == null || !node.isObject()) {
      return Map.of();
    }
    return objectMapper.convertValue(node, MAP_TYPE);
  }
}
