package com.lifesimulator.backend.engine.domain.life.mapping;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.contract.DecisionContext;
import com.lifesimulator.backend.engine.contract.DecisionOption;
import com.lifesimulator.backend.engine.contract.DecisionPreference;
import com.lifesimulator.backend.engine.contract.DecisionQuestion;
import com.lifesimulator.backend.engine.contract.DecisionSubject;
import com.lifesimulator.backend.engine.contract.GenericDecisionRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LifeRequestToGenericDecisionMapper {

  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final ObjectMapper objectMapper;

  public LifeRequestToGenericDecisionMapper(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public GenericDecisionRequest map(JsonNode request, String locale) {
    JsonNode profile = request.path("userProfile");
    JsonNode decision = request.path("decision");
    Map<String, Object> memory = objectMap(request.path("prior_memory"));
    Map<String, Object> hints = objectMap(request.path("state_hints"));

    return new GenericDecisionRequest(
      subject(profile, decision),
      question(decision),
      context(locale, profile, decision, memory, hints),
      preference(profile),
      options(decision),
      memory,
      hints
    );
  }

  private DecisionSubject subject(JsonNode profile, JsonNode decision) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("source_contract", "life_simulator_v1");
    attributes.put("age", profile.path("age").asInt(0));
    attributes.put("job", profile.path("job").asText(""));
    attributes.put("decision_context", decision.path("context").asText(""));
    return new DecisionSubject("life_decision", attributes);
  }

  private DecisionQuestion question(JsonNode decision) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("decision_type", "two_option_life_decision");
    attributes.put("source_fields", List.of("decision.optionA", "decision.optionB", "decision.context"));
    return new DecisionQuestion(
      "Recommend the option that best fits the user's priorities and constraints.",
      decision.path("context").asText(""),
      attributes
    );
  }

  private DecisionContext context(
    String locale,
    JsonNode profile,
    JsonNode decision,
    Map<String, Object> memory,
    Map<String, Object> hints
  ) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("decision", objectMap(decision));
    return new DecisionContext(
      locale,
      objectMap(profile),
      hints,
      memory,
      attributes
    );
  }

  private DecisionPreference preference(JsonNode profile) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("risk_tolerance", profile.path("risk_tolerance").asText("medium"));
    return new DecisionPreference(
      profile.path("risk_tolerance").asText("medium"),
      stringList(profile.path("priority")),
      attributes
    );
  }

  private List<DecisionOption> options(JsonNode decision) {
    return List.of(
      option("A", "optionA", decision.path("optionA").asText("")),
      option("B", "optionB", decision.path("optionB").asText(""))
    );
  }

  private DecisionOption option(String id, String sourceField, String label) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("source_field", sourceField);
    attributes.put("display_label", id);
    return new DecisionOption(id, label, attributes);
  }

  private List<String> stringList(JsonNode node) {
    List<String> values = new ArrayList<>();
    if (!node.isArray()) {
      return values;
    }
    node.forEach(value -> values.add(value.asText()));
    return values;
  }

  private Map<String, Object> objectMap(JsonNode node) {
    if (node == null || !node.isObject()) {
      return Map.of();
    }
    return objectMapper.convertValue(node, MAP_TYPE);
  }
}
