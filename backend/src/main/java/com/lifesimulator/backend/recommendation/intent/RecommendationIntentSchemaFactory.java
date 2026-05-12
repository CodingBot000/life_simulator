package com.lifesimulator.backend.recommendation.intent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;

public class RecommendationIntentSchemaFactory {

  private final ObjectMapper objectMapper;

  public RecommendationIntentSchemaFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode outputSchema() {
    ObjectNode schema = objectMapper.createObjectNode();
    schema.put("type", "object");
    schema.put("additionalProperties", false);
    ArrayNode required = schema.putArray("required");
    for (String field : List.of("topic", "audience_context", "product_types", "queries", "negative_filters", "safety_level")) {
      required.add(field);
    }

    ObjectNode properties = schema.putObject("properties");
    ObjectNode topic = properties.putObject("topic");
    topic.put("type", "string");
    ArrayNode topicEnum = topic.putArray("enum");
    for (String value : List.of("career_change", "financial_planning", "relationship", "learning", "wellbeing", "general_decision_support")) {
      topicEnum.add(value);
    }
    properties.putObject("audience_context").put("type", "string");
    properties.putObject("safety_level").put("type", "string");

    ObjectNode productTypes = properties.putObject("product_types");
    productTypes.put("type", "array");
    productTypes.putObject("items").put("type", "string");

    ObjectNode negativeFilters = properties.putObject("negative_filters");
    negativeFilters.put("type", "array");
    negativeFilters.putObject("items").put("type", "string");

    ObjectNode queries = properties.putObject("queries");
    queries.put("type", "array");
    ObjectNode queryItem = queries.putObject("items");
    queryItem.put("type", "object");
    queryItem.put("additionalProperties", false);
    ArrayNode queryRequired = queryItem.putArray("required");
    for (String field : List.of("provider", "query", "reason")) {
      queryRequired.add(field);
    }
    ObjectNode queryProperties = queryItem.putObject("properties");
    queryProperties.putObject("provider").put("type", "string");
    queryProperties.putObject("query").put("type", "string");
    queryProperties.putObject("reason").put("type", "string");

    return schema;
  }
}
