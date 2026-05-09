package com.lifesimulator.backend.engine.domain.life.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class LifeStageSeedFactory {

  private final LifeResponseJson json;
  private final ObjectMapper objectMapper;

  public LifeStageSeedFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.json = new LifeResponseJson(objectMapper);
  }

  public ObjectNode planner(ArrayNode priorities, JsonNode decision) {
    ObjectNode planner = objectMapper.createObjectNode();
    planner.put("decision_type", "two-option life decision");
    ArrayNode factors = planner.putArray("factors");
    priorities.forEach(priority -> factors.add(priority.asText()));
    factors.add("risk_tolerance");
    factors.add(decision.path("context").asText());
    return planner;
  }

  public ObjectNode scenario(String option, String label, String locale) {
    ObjectNode scenario = objectMapper.createObjectNode();
    scenario.put("three_months", json.text(locale, label + " 선택 초기에는 실행 비용과 적응 부담이 드러납니다: " + option, label + " exposes execution cost and adaptation load: " + option));
    scenario.put("one_year", json.text(locale, "1년 뒤에는 우선순위 적합성이 결과를 가릅니다.", "After one year, priority fit separates the outcomes."));
    scenario.put("three_years", json.text(locale, "3년 관점에서는 되돌리기 어려운 비용과 성장 여지를 함께 봐야 합니다.", "Over three years, weigh irreversible cost against growth room."));
    ObjectNode assessment = scenario.putObject("structured_assessment");
    assessment.put("stability_outlook", "mixed");
    assessment.put("growth_outlook", "stable");
    assessment.put("stress_load", "medium");
    assessment.put("missing_info", false);
    return scenario;
  }

  public ObjectNode riskResult(String risk, String option, String locale) {
    ObjectNode result = objectMapper.createObjectNode();
    result.put("risk_level", risk);
    result.set("reasons", json.array(json.text(locale, option + "의 비용, 회복 가능성, 실행 부담을 추가 확인해야 합니다.", "Validate cost, reversibility, and execution load for " + option + ".")));
    ObjectNode assessment = result.putObject("structured_assessment");
    assessment.set("risk_factors", json.array("execution_uncertainty"));
    assessment.put("missing_info", false);
    assessment.put("risk_score", "high".equals(risk) ? 0.72 : 0.48);
    return result;
  }

  public ObjectNode reasoning(String requestId, JsonNode request, String selected, String locale) {
    ObjectNode reasoning = objectMapper.createObjectNode();
    reasoning.put("case_id", requestId);
    ObjectNode summary = reasoning.putObject("input_summary");
    summary.set("user_profile", request.path("userProfile"));
    summary.set("decision_options", request.path("decision"));
    summary.put("planner_goal", json.text(locale, "우선순위와 리스크 허용도를 기준으로 두 선택지를 비교합니다.", "Compare both options against priorities and risk tolerance."));
    ObjectNode body = reasoning.putObject("reasoning");
    body.set("a_reasoning", lens("A", 0.68, locale));
    body.set("b_reasoning", lens("B", 0.62, locale));
    ObjectNode comparison = body.putObject("comparison");
    comparison.set("agreements", json.array(json.text(locale, "두 선택지 모두 실행 비용 확인이 필요합니다.", "Both options need execution-cost validation.")));
    comparison.set("conflicts", json.array(json.text(locale, "안정성과 성장 가능성의 비중이 다릅니다.", "They weight stability and growth differently.")));
    comparison.put("which_fits_user_better", selected);
    comparison.put("reason", json.text(locale, "현재 입력 기준으로는 선택지 " + selected + "가 우선순위와 더 잘 맞습니다.", "Given the input, option " + selected + " fits the priorities better."));
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

  public ObjectNode guardrail(String risk) {
    boolean triggered = "high".equals(risk);
    ObjectNode guardrail = objectMapper.createObjectNode();
    guardrail.put("guardrail_triggered", triggered);
    guardrail.set("triggers", triggered ? json.array("high_risk") : json.array());
    guardrail.set("strategy", triggered ? json.array("risk_warning", "soft_recommendation") : json.array("soft_recommendation"));
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

  public ObjectNode advisor(String selected, String selectedOption, String locale) {
    ObjectNode advisor = objectMapper.createObjectNode();
    advisor.put("decision", selected);
    advisor.put("confidence", 0.68);
    advisor.put("reason", json.text(locale, selectedOption + "이 현재 우선순위와 리스크 허용도에 더 가깝습니다.", selectedOption + " is closer to the current priorities and risk tolerance."));
    advisor.put("guardrail_applied", false);
    advisor.put("recommended_option", selected);
    ObjectNode basis = advisor.putObject("reasoning_basis");
    basis.put("selected_reasoning", selected);
    basis.put("core_why", advisor.path("reason").asText());
    basis.put("decision_confidence", 0.68);
    return advisor;
  }

  public ObjectNode reflection(boolean guardrailNeeded, String locale, JsonNode request) {
    boolean hasOptionFollowup = hasOptionFollowup(request);
    ObjectNode reflection = objectMapper.createObjectNode();
    ObjectNode scores = reflection.putObject("scores");
    scores.put("realism", 4);
    scores.put("consistency", 4);
    scores.put("profile_alignment", 4);
    scores.put("recommendation_clarity", 4);
    ObjectNode diagnostic = reflection.putObject("internal_diagnostic");
    diagnostic.put("evaluation", "spring-backend-derived");
    diagnostic.set("issues", json.array());
    diagnostic.set("improvement_suggestions", json.array());
    diagnostic.put("overall_comment", "Initial Spring Boot migration response.");
    ObjectNode user = reflection.putObject("user_summary");
    user.put(
      "headline",
      hasOptionFollowup
        ? json.text(locale, "추가 조건을 반영한 재판단입니다.", "This rerun reflects the additional option conditions.")
        : json.text(locale, "우선순위 기준의 1차 판단입니다.", "This is a first-pass priority-based decision.")
    );
    user.put(
      "summary",
      hasOptionFollowup
        ? json.text(locale, "실행 전에는 각 선택지의 중단 기준과 확인 기간을 구체화하세요.", "Before acting, define each option's stop rule and review window.")
        : json.text(locale, "실제 결정 전에는 비용, 시간, 회복 가능성을 한 번 더 확인하세요.", "Before deciding, verify cost, time, and reversibility once more.")
    );
    user.set("cautions", json.array(json.text(locale, "정보가 부족한 항목은 결론의 신뢰도를 낮춥니다.", "Missing information lowers confidence.")));
    user.set(
      "suggested_actions",
      json.array(
        hasOptionFollowup
          ? json.text(locale, "정한 되돌림 조건을 실행 전 체크리스트와 일정표에 옮기세요.", "Move the rollback conditions into a pre-action checklist and calendar.")
          : json.text(locale, "각 선택지의 최악의 경우와 되돌릴 수 있는 조건을 적어보세요.", "Write down worst cases and rollback conditions for each option.")
      )
    );
    ObjectNode review = reflection.putObject("guardrail_review");
    review.put("was_needed", guardrailNeeded);
    review.put("was_triggered", guardrailNeeded);
    review.put("correctness", "good");
    return reflection;
  }

  private ObjectNode lens(String option, double confidence, String locale) {
    ObjectNode lens = objectMapper.createObjectNode();
    lens.put("stance", "Option " + option);
    lens.put("summary", json.text(locale, "선택지 " + option + "의 장단점을 우선순위 기준으로 검토합니다.", "Review option " + option + " against the user's priorities."));
    lens.set("key_assumptions", json.array(json.text(locale, "현재 입력 정보가 사실이라고 가정합니다.", "Assume the current input is accurate.")));
    lens.set("pros", json.array(json.text(locale, "명확한 실행 방향을 제공합니다.", "Provides a clear execution path.")));
    lens.set("cons", json.array(json.text(locale, "숨은 비용은 추가 확인이 필요합니다.", "Hidden costs need more validation.")));
    lens.put("recommended_option", option);
    lens.put("confidence", confidence);
    return lens;
  }

  private boolean hasOptionFollowup(JsonNode request) {
    JsonNode optionDetails = request.at("/decision/optionDetails");
    return hasAnyFollowupText(optionDetails.path("A")) || hasAnyFollowupText(optionDetails.path("B"));
  }

  private boolean hasAnyFollowupText(JsonNode detail) {
    return hasText(detail.path("worstCase")) || hasText(detail.path("rollbackCondition"));
  }

  private boolean hasText(JsonNode value) {
    return value.isTextual() && !value.asText().isBlank();
  }
}
