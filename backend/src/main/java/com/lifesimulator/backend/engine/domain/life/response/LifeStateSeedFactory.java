package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class LifeStateSeedFactory {

  private final LifeResponseJson json;
  private final ObjectMapper objectMapper;

  public LifeStateSeedFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.json = new LifeResponseJson(objectMapper);
  }

  public ArrayNode priorityArray(JsonNode profile) {
    return json.arrayOrDefault(profile.path("priority"), "stability");
  }

  public ObjectNode stateContext(
    String requestId,
    JsonNode request,
    ArrayNode priorities,
    String risk,
    String locale
  ) {
    ObjectNode state = objectMapper.createObjectNode();
    state.put("case_id", requestId);
    ObjectNode userState = state.putObject("user_state");
    ObjectNode profileState = userState.putObject("profile_state");
    profileState.put("risk_preference", risk);
    profileState.put("decision_style", "balanced comparison");
    profileState.set("top_priorities", priorities.deepCopy());
    ObjectNode situational = userState.putObject("situational_state");
    situational.put("career_stage", request.path("userProfile").path("job").asText());
    situational.put("financial_pressure", "medium");
    situational.put("time_pressure", "medium");
    situational.put("emotional_state", "uncertain but ready to compare");
    ObjectNode memory = userState.putObject("memory_state");
    JsonNode prior = request.path("prior_memory");
    memory.set("recent_similar_decisions", json.arrayOrEmpty(prior.path("recent_similar_decisions")));
    memory.set("repeated_patterns", json.arrayOrDefault(prior.path("repeated_patterns"), "needs explicit tradeoff framing"));
    memory.set("consistency_notes", json.arrayOrDefault(prior.path("consistency_notes"), "compare against stated priorities"));
    ObjectNode summary = state.putObject("state_summary");
    summary.put("decision_bias", json.text(locale, "현재 선호보다 장기 우선순위를 먼저 확인해야 합니다.", "Check long-term priorities before current preference."));
    summary.put("current_constraint", request.path("decision").path("context").asText());
    summary.put("agent_guidance", json.text(locale, "두 선택지의 회복 가능성과 실행 비용을 함께 비교합니다.", "Compare reversibility and execution cost for both options."));
    return state;
  }
}
