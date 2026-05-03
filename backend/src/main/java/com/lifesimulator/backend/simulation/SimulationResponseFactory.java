package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Iterator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SimulationResponseFactory {

  private final ObjectMapper objectMapper;

  public SimulationResponseFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void validateRequest(JsonNode request) {
    if (!request.hasNonNull("userProfile") || !request.hasNonNull("decision")) {
      throw new IllegalArgumentException("Invalid request: userProfile and decision are required.");
    }
    JsonNode profile = request.path("userProfile");
    JsonNode decision = request.path("decision");
    requireText(profile, "job");
    requireText(profile, "risk_tolerance");
    requireArray(profile, "priority");
    requireText(decision, "optionA");
    requireText(decision, "optionB");
    requireText(decision, "context");
    if (!profile.path("age").isNumber() || profile.path("age").asInt() <= 0) {
      throw new IllegalArgumentException("Invalid request: age must be a positive number.");
    }
  }

  public JsonNode deterministicResponse(String requestId, JsonNode request, String locale, String model) {
    JsonNode profile = request.path("userProfile");
    JsonNode decision = request.path("decision");
    String optionA = decision.path("optionA").asText("Option A");
    String optionB = decision.path("optionB").asText("Option B");
    String risk = profile.path("risk_tolerance").asText("medium");
    ArrayNode priorities = priorityArray(profile);
    String selected = "high".equals(risk) ? "B" : "A";
    String selectedOption = "A".equals(selected) ? optionA : optionB;

    ObjectNode root = objectMapper.createObjectNode();
    root.put("request_id", requestId);
    root.set("routing", routing(model, risk));
    root.set("stateContext", stateContext(requestId, request, priorities, risk, locale));
    root.set("planner", planner(priorities, decision));
    root.set("scenarioA", scenario(optionA, "A", locale));
    root.set("scenarioB", scenario(optionB, "B", locale));
    root.set("riskA", riskResult(risk, optionA, locale));
    root.set("riskB", riskResult("high".equals(risk) ? "medium" : risk, optionB, locale));
    root.set("reasoning", reasoning(requestId, request, selected, locale));
    root.set("guardrail", guardrail(risk));
    root.set("advisor", advisor(selected, selectedOption, locale));
    root.set("reflection", reflection("high".equals(risk), locale));
    return root;
  }

  public JsonNode mergeGenerated(JsonNode deterministic, JsonNode generated, String requestId) {
    ObjectNode merged = deterministic.deepCopy();
    if (generated != null && generated.isObject()) {
      deepMerge(merged, (ObjectNode) generated);
    }
    merged.put("request_id", requestId);
    return merged;
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

  private ObjectNode routing(String model, String risk) {
    ObjectNode routing = objectMapper.createObjectNode();
    routing.put("execution_mode", "full");
    routing.set("selected_path", array("state_loader", "planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"));
    ObjectNode plan = objectMapper.createObjectNode();
    for (String stage : List.of("state_loader", "planner", "scenario_a", "scenario_b", "risk_a", "risk_b", "ab_reasoning", "advisor", "reflection")) {
      plan.put(stage, model);
    }
    routing.set("stage_model_plan", plan);
    routing.set("stage_fallback_plan", plan.deepCopy());
    routing.set("reasons", array("Spring Boot backend route", "Codex CLI subscription model: " + model));
    ObjectNode profile = routing.putObject("risk_profile");
    profile.put("model_tier", "low_cost");
    profile.put("risk_band", risk);
    profile.put("complexity", "medium");
    profile.put("ambiguity", "medium");
    profile.put("state_unknown_count", 0);
    profile.put("estimated_tokens", 1200);
    return routing;
  }

  private ObjectNode stateContext(String requestId, JsonNode request, ArrayNode priorities, String risk, String locale) {
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
    memory.set("recent_similar_decisions", arrayOrEmpty(prior.path("recent_similar_decisions")));
    memory.set("repeated_patterns", arrayOrDefault(prior.path("repeated_patterns"), "needs explicit tradeoff framing"));
    memory.set("consistency_notes", arrayOrDefault(prior.path("consistency_notes"), "compare against stated priorities"));
    ObjectNode summary = state.putObject("state_summary");
    summary.put("decision_bias", text(locale, "현재 선호보다 장기 우선순위를 먼저 확인해야 합니다.", "Check long-term priorities before current preference."));
    summary.put("current_constraint", request.path("decision").path("context").asText());
    summary.put("agent_guidance", text(locale, "두 선택지의 회복 가능성과 실행 비용을 함께 비교합니다.", "Compare reversibility and execution cost for both options."));
    return state;
  }

  private ObjectNode planner(ArrayNode priorities, JsonNode decision) {
    ObjectNode planner = objectMapper.createObjectNode();
    planner.put("decision_type", "two-option life decision");
    ArrayNode factors = planner.putArray("factors");
    priorities.forEach(priority -> factors.add(priority.asText()));
    factors.add("risk_tolerance");
    factors.add(decision.path("context").asText());
    return planner;
  }

  private ObjectNode scenario(String option, String label, String locale) {
    ObjectNode scenario = objectMapper.createObjectNode();
    scenario.put("three_months", text(locale, label + " 선택 초기에는 실행 비용과 적응 부담이 드러납니다: " + option, label + " exposes execution cost and adaptation load: " + option));
    scenario.put("one_year", text(locale, "1년 뒤에는 우선순위 적합성이 결과를 가릅니다.", "After one year, priority fit separates the outcomes."));
    scenario.put("three_years", text(locale, "3년 관점에서는 되돌리기 어려운 비용과 성장 여지를 함께 봐야 합니다.", "Over three years, weigh irreversible cost against growth room."));
    ObjectNode assessment = scenario.putObject("structured_assessment");
    assessment.put("stability_outlook", "mixed");
    assessment.put("growth_outlook", "stable");
    assessment.put("stress_load", "medium");
    assessment.put("missing_info", false);
    return scenario;
  }

  private ObjectNode riskResult(String risk, String option, String locale) {
    ObjectNode result = objectMapper.createObjectNode();
    result.put("risk_level", risk);
    result.set("reasons", array(text(locale, option + "의 비용, 회복 가능성, 실행 부담을 추가 확인해야 합니다.", "Validate cost, reversibility, and execution load for " + option + ".")));
    ObjectNode assessment = result.putObject("structured_assessment");
    assessment.set("risk_factors", array("execution_uncertainty"));
    assessment.put("missing_info", false);
    assessment.put("risk_score", "high".equals(risk) ? 0.72 : 0.48);
    return result;
  }

  private ObjectNode reasoning(String requestId, JsonNode request, String selected, String locale) {
    ObjectNode reasoning = objectMapper.createObjectNode();
    reasoning.put("case_id", requestId);
    ObjectNode summary = reasoning.putObject("input_summary");
    summary.set("user_profile", request.path("userProfile"));
    summary.set("decision_options", request.path("decision"));
    summary.put("planner_goal", text(locale, "우선순위와 리스크 허용도를 기준으로 두 선택지를 비교합니다.", "Compare both options against priorities and risk tolerance."));
    ObjectNode body = reasoning.putObject("reasoning");
    body.set("a_reasoning", lens("A", 0.68, locale));
    body.set("b_reasoning", lens("B", 0.62, locale));
    ObjectNode comparison = body.putObject("comparison");
    comparison.set("agreements", array(text(locale, "두 선택지 모두 실행 비용 확인이 필요합니다.", "Both options need execution-cost validation.")));
    comparison.set("conflicts", array(text(locale, "안정성과 성장 가능성의 비중이 다릅니다.", "They weight stability and growth differently.")));
    comparison.put("which_fits_user_better", selected);
    comparison.put("reason", text(locale, "현재 입력 기준으로는 선택지 " + selected + "가 우선순위와 더 잘 맞습니다.", "Given the input, option " + selected + " fits the priorities better."));
    ObjectNode finalSelection = body.putObject("final_selection");
    finalSelection.put("selected_reasoning", selected);
    finalSelection.put("selected_option", selected);
    finalSelection.put("why_selected", comparison.path("reason").asText());
    finalSelection.put("decision_confidence", 0.68);
    ObjectNode signals = reasoning.putObject("structured_signals");
    signals.put("conflict", true);
    signals.put("missing_info", false);
    signals.put("low_confidence", false);
    return reasoning;
  }

  private ObjectNode lens(String option, double confidence, String locale) {
    ObjectNode lens = objectMapper.createObjectNode();
    lens.put("stance", "Option " + option);
    lens.put("summary", text(locale, "선택지 " + option + "의 장단점을 우선순위 기준으로 검토합니다.", "Review option " + option + " against the user's priorities."));
    lens.set("key_assumptions", array(text(locale, "현재 입력 정보가 사실이라고 가정합니다.", "Assume the current input is accurate.")));
    lens.set("pros", array(text(locale, "명확한 실행 방향을 제공합니다.", "Provides a clear execution path.")));
    lens.set("cons", array(text(locale, "숨은 비용은 추가 확인이 필요합니다.", "Hidden costs need more validation.")));
    lens.put("recommended_option", option);
    lens.put("confidence", confidence);
    return lens;
  }

  private ObjectNode guardrail(String risk) {
    boolean triggered = "high".equals(risk);
    ObjectNode guardrail = objectMapper.createObjectNode();
    guardrail.put("guardrail_triggered", triggered);
    guardrail.set("triggers", triggered ? array("high_risk") : array());
    guardrail.set("strategy", triggered ? array("risk_warning", "soft_recommendation") : array("soft_recommendation"));
    guardrail.put("risk_score", triggered ? 0.72 : 0.48);
    guardrail.put("confidence_score", 0.68);
    guardrail.put("uncertainty_score", triggered ? 0.45 : 0.28);
    ObjectNode signals = guardrail.putObject("reasoning_signals");
    signals.put("conflicting_signals", true);
    signals.put("missing_context", false);
    signals.put("weak_evidence", false);
    signals.put("ambiguous_wording", false);
    signals.put("strong_consensus", false);
    signals.put("repeated_evidence", true);
    guardrail.put("final_mode", triggered ? "cautious" : "normal");
    return guardrail;
  }

  private ObjectNode advisor(String selected, String selectedOption, String locale) {
    ObjectNode advisor = objectMapper.createObjectNode();
    advisor.put("decision", selected);
    advisor.put("confidence", 0.68);
    advisor.put("reason", text(locale, selectedOption + "이 현재 우선순위와 리스크 허용도에 더 가깝습니다.", selectedOption + " is closer to the current priorities and risk tolerance."));
    advisor.put("guardrail_applied", false);
    advisor.put("recommended_option", selected);
    ObjectNode basis = advisor.putObject("reasoning_basis");
    basis.put("selected_reasoning", selected);
    basis.put("core_why", advisor.path("reason").asText());
    basis.put("decision_confidence", 0.68);
    return advisor;
  }

  private ObjectNode reflection(boolean guardrailNeeded, String locale) {
    ObjectNode reflection = objectMapper.createObjectNode();
    ObjectNode scores = reflection.putObject("scores");
    scores.put("realism", 4);
    scores.put("consistency", 4);
    scores.put("profile_alignment", 4);
    scores.put("recommendation_clarity", 4);
    ObjectNode diagnostic = reflection.putObject("internal_diagnostic");
    diagnostic.put("evaluation", "spring-backend-derived");
    diagnostic.set("issues", array());
    diagnostic.set("improvement_suggestions", array());
    diagnostic.put("overall_comment", "Initial Spring Boot migration response.");
    ObjectNode user = reflection.putObject("user_summary");
    user.put("headline", text(locale, "우선순위 기준의 1차 판단입니다.", "This is a first-pass priority-based decision."));
    user.put("summary", text(locale, "실제 결정 전에는 비용, 시간, 회복 가능성을 한 번 더 확인하세요.", "Before deciding, verify cost, time, and reversibility once more."));
    user.set("cautions", array(text(locale, "정보가 부족한 항목은 결론의 신뢰도를 낮춥니다.", "Missing information lowers confidence.")));
    user.set("suggested_actions", array(text(locale, "각 선택지의 최악의 경우와 되돌릴 수 있는 조건을 적어보세요.", "Write down worst cases and rollback conditions for each option.")));
    ObjectNode review = reflection.putObject("guardrail_review");
    review.put("was_needed", guardrailNeeded);
    review.put("was_triggered", guardrailNeeded);
    review.put("correctness", "good");
    return reflection;
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

  private void requireText(JsonNode node, String field) {
    if (!node.hasNonNull(field) || node.path(field).asText().isBlank()) {
      throw new IllegalArgumentException("Invalid request: " + field + " must be a non-empty string.");
    }
  }

  private void requireArray(JsonNode node, String field) {
    if (!node.path(field).isArray() || node.path(field).isEmpty()) {
      throw new IllegalArgumentException("Invalid request: " + field + " must be a non-empty array.");
    }
  }

  private ArrayNode priorityArray(JsonNode profile) {
    return arrayOrDefault(profile.path("priority"), "stability");
  }

  private ArrayNode arrayOrEmpty(JsonNode value) {
    return value.isArray() ? value.deepCopy() : objectMapper.createArrayNode();
  }

  private ArrayNode arrayOrDefault(JsonNode value, String fallback) {
    return value.isArray() && !value.isEmpty() ? value.deepCopy() : array(fallback);
  }

  private ArrayNode array(String... values) {
    ArrayNode array = objectMapper.createArrayNode();
    for (String value : values) {
      array.add(value);
    }
    return array;
  }

  private String text(String locale, String ko, String en) {
    return "en".equals(locale) ? en : ko;
  }
}
