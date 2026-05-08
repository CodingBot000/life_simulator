package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class LifeResponseSchemaFactory {

  private final ObjectMapper objectMapper;

  public LifeResponseSchemaFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode outputSchema() {
    ObjectNode schema = objectMapper.createObjectNode();
    schema.put("type", "object");
    schema.put("additionalProperties", true);
    ArrayNode required = schema.putArray("required");
    for (String field : List.of("request_id", "routing", "stateContext", "planner", "guardrail", "advisor", "reflection")) {
      required.add(field);
    }
    ObjectNode properties = schema.putObject("properties");
    properties.putObject("request_id").put("type", "string");
    for (String field : List.of("routing", "stateContext", "planner", "scenarioA", "scenarioB", "riskA", "riskB", "reasoning", "guardrail", "advisor", "reflection")) {
      properties.putObject(field).put("type", "object").put("additionalProperties", true);
    }
    return schema;
  }
}
