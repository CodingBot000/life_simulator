package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Iterator;
import org.springframework.stereotype.Component;

@Component
public class LifeResponseMerger {

  public JsonNode mergeGenerated(JsonNode deterministic, JsonNode generated, String requestId) {
    ObjectNode merged = deterministic.deepCopy();
    if (generated != null && generated.isObject()) {
      deepMerge(merged, (ObjectNode) generated);
    }
    merged.put("request_id", requestId);
    return merged;
  }

  private void deepMerge(ObjectNode target, ObjectNode source) {
    Iterator<String> names = source.fieldNames();
    while (names.hasNext()) {
      String name = names.next();
      JsonNode sourceValue = source.get(name);
      JsonNode targetValue = target.get(name);
      if (targetValue instanceof ObjectNode targetObject && sourceValue instanceof ObjectNode sourceObject) {
        deepMerge(targetObject, sourceObject);
      } else if (!sourceValue.isNull()) {
        target.set(name, sourceValue);
      }
    }
  }
}
