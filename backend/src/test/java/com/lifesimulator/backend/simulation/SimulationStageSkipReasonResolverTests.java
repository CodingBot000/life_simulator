package com.lifesimulator.backend.simulation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SimulationStageSkipReasonResolverTests {

  private final SimulationStageSkipReasonResolver resolver = new SimulationStageSkipReasonResolver();

  @Test
  void createsReasonsForSkippedStagesFromRoutingDecision() {
    BackendRoutingDecision decision = new BackendRoutingDecision(
      "standard",
      List.of("planner", "scenario", "advisor"),
      Map.of("advisor", "gpt-5.4-mini"),
      Map.of("advisor", "gpt-5.4-mini"),
      List.of("risk_band=low", "execution_mode=standard"),
      "low",
      "medium",
      "medium",
      0,
      1200
    );

    Map<String, String> reasons = resolver.reasonsFor(
      decision,
      List.of("risk_a", "risk_b", "ab_reasoning", "reflection")
    );

    assertThat(reasons).containsOnlyKeys("risk_a", "risk_b", "ab_reasoning", "reflection");
    assertThat(reasons.get("risk_a")).contains("standard", "위험도는 low", "부족 정보는 0개");
    assertThat(reasons.get("ab_reasoning")).contains("full 경로");
    assertThat(reasons.get("reflection")).contains("Reflection");
  }

  @Test
  void returnsEmptyMapWhenNoStagesWereSkipped() {
    BackendRoutingDecision decision = new BackendRoutingDecision(
      "full",
      List.of("planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"),
      Map.of("advisor", "gpt-5.4-mini"),
      Map.of("advisor", "gpt-5.4-mini"),
      List.of("execution_mode=full"),
      "high",
      "medium",
      "medium",
      0,
      1800
    );

    assertThat(resolver.reasonsFor(decision, List.of())).isEmpty();
  }
}
