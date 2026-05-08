package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.List;

final class LifeResponseJson {

  private final ObjectMapper objectMapper;

  LifeResponseJson(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  ArrayNode array(String... values) {
    ArrayNode array = objectMapper.createArrayNode();
    for (String value : values) {
      array.add(value);
    }
    return array;
  }

  ArrayNode array(List<String> values) {
    ArrayNode array = objectMapper.createArrayNode();
    for (String value : values) {
      array.add(value);
    }
    return array;
  }

  ArrayNode arrayOrEmpty(JsonNode value) {
    return value.isArray() ? value.deepCopy() : objectMapper.createArrayNode();
  }

  ArrayNode arrayOrDefault(JsonNode value, String fallback) {
    return value.isArray() && !value.isEmpty() ? value.deepCopy() : array(fallback);
  }

  String text(String locale, String ko, String en) {
    return "en".equals(locale) ? en : ko;
  }
}
