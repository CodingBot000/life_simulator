package com.lifesimulator.backend.engine.domain.life.evaluation;

import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import org.springframework.stereotype.Component;

@Component
public class LifeEvaluationTargetMapper {

  public DecisionEvaluationTarget targetFor(String lifeTargetType) {
    return switch (normalize(lifeTargetType)) {
      case "reasoning_a", "a_reasoning" -> DecisionEvaluationTarget.REASONING_A;
      case "reasoning_b", "b_reasoning" -> DecisionEvaluationTarget.REASONING_B;
      case "comparison" -> DecisionEvaluationTarget.COMPARISON;
      case "final_selection" -> DecisionEvaluationTarget.FINAL_SELECTION;
      case "advisor" -> DecisionEvaluationTarget.ADVISOR;
      case "guardrail" -> DecisionEvaluationTarget.GUARDRAIL;
      case "reflection" -> DecisionEvaluationTarget.REFLECTION;
      default -> DecisionEvaluationTarget.from(lifeTargetType);
    };
  }

  public String optionIdFor(String value) {
    String normalized = normalize(value);
    if (normalized.equals("a") || normalized.equals("option_a")) {
      return "A";
    }
    if (normalized.equals("b") || normalized.equals("option_b")) {
      return "B";
    }
    if (normalized.equals("undecided")) {
      return "undecided";
    }
    return value == null ? "" : value.trim();
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }
}
