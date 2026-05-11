package com.lifesimulator.backend.engine.routing;

import com.lifesimulator.backend.engine.ExecutionEngineNames;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class DecisionRoutingPolicy {

  private static final List<String> LIGHT_PATH = List.of("planner", "advisor");
  private static final List<String> STANDARD_PATH = List.of("planner", "scenario", "advisor");
  private static final List<String> CAREFUL_PATH = List.of("planner", "scenario", "risk", "advisor");
  private static final List<String> FULL_PATH = List.of(
    "planner",
    "scenario",
    "risk",
    "ab_reasoning",
    "guardrail",
    "advisor",
    "reflection"
  );

  public ExecutionPath route(RoutingSignal signal, String model) {
    ExecutionMode executionMode = executionMode(signal);
    List<String> selectedPath = pathForMode(executionMode);
    Map<String, String> stagePlan = stagePlan(selectedPath, model);

    return new ExecutionPath(
      executionMode,
      selectedPath,
      stagePlan,
      new LinkedHashMap<>(stagePlan),
      reasons(signal, executionMode),
      estimateTokens(signal.contextLength(), selectedPath)
    );
  }

  private ExecutionMode executionMode(RoutingSignal signal) {
    if (
      "high".equals(signal.riskBand()) ||
      "high".equals(signal.complexity()) ||
      "high".equals(signal.ambiguity())
    ) {
      return ExecutionMode.FULL;
    }
    if ("medium".equals(signal.riskBand()) || signal.stateUnknownCount() >= 2) {
      return ExecutionMode.CAREFUL;
    }
    if ("low".equals(signal.complexity()) && "low".equals(signal.ambiguity())) {
      return ExecutionMode.LIGHT;
    }
    return ExecutionMode.STANDARD;
  }

  private List<String> pathForMode(ExecutionMode executionMode) {
    return switch (executionMode) {
      case LIGHT -> LIGHT_PATH;
      case STANDARD -> STANDARD_PATH;
      case CAREFUL -> CAREFUL_PATH;
      case FULL -> FULL_PATH;
    };
  }

  private Map<String, String> stagePlan(List<String> selectedPath, String model) {
    Map<String, String> plan = new LinkedHashMap<>();
    plan.put("state_loader", model);
    plan.put("planner", model);
    if (selectedPath.contains("scenario")) {
      plan.put("scenario_a", model);
      plan.put("scenario_b", model);
    }
    if (selectedPath.contains("risk")) {
      plan.put("risk_a", model);
      plan.put("risk_b", model);
    }
    if (selectedPath.contains("ab_reasoning")) {
      plan.put("ab_reasoning", model);
    }
    if (selectedPath.contains("guardrail")) {
      plan.put("guardrail", ExecutionEngineNames.BACKEND_RULE);
    }
    plan.put("advisor", model);
    if (selectedPath.contains("reflection")) {
      plan.put("reflection", model);
    }
    return plan;
  }

  private List<String> reasons(RoutingSignal signal, ExecutionMode executionMode) {
    List<String> reasons = new ArrayList<>();
    reasons.add("risk_band=" + signal.riskBand());
    reasons.add("complexity=" + signal.complexity());
    reasons.add("ambiguity=" + signal.ambiguity());
    reasons.add("state_unknown_count=" + signal.stateUnknownCount());
    reasons.add("execution_mode=" + executionMode.value());
    return reasons;
  }

  private int estimateTokens(int contextLength, List<String> selectedPath) {
    return Math.max(600, 500 + contextLength * 2 + selectedPath.size() * 180);
  }
}
