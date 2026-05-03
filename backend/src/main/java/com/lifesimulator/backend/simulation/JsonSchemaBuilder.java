package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Iterator;
import org.springframework.stereotype.Component;

@Component
public class JsonSchemaBuilder {

  private final ObjectMapper objectMapper;

  public JsonSchemaBuilder(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public JsonNode schemaFor(JsonNode example) {
    ObjectNode schema = schemaNode(example);
    schema.put("additionalProperties", false);
    return schema;
  }

  private ObjectNode schemaNode(JsonNode value) {
    ObjectNode schema = objectMapper.createObjectNode();
    if (value.isObject()) {
      schema.put("type", "object");
      schema.put("additionalProperties", false);
      ObjectNode properties = schema.putObject("properties");
      ArrayNode required = schema.putArray("required");
      Iterator<String> names = value.fieldNames();
      while (names.hasNext()) {
        String name = names.next();
        properties.set(name, schemaNode(value.get(name)));
        required.add(name);
      }
      return schema;
    }
    if (value.isArray()) {
      schema.put("type", "array");
      schema.put("minItems", value.isEmpty() ? 0 : 1);
      schema.set("items", value.isEmpty() ? stringSchema() : schemaNode(value.get(0)));
      return schema;
    }
    if (value.isBoolean()) {
      schema.put("type", "boolean");
      return schema;
    }
    if (value.isNumber()) {
      schema.put("type", "number");
      return schema;
    }
    return stringSchema();
  }

  private ObjectNode stringSchema() {
    ObjectNode schema = objectMapper.createObjectNode();
    schema.put("type", "string");
    return schema;
  }
}
