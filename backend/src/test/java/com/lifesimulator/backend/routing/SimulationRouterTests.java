package com.lifesimulator.backend.routing;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.ExecutionEngineNames;
import com.lifesimulator.backend.engine.domain.life.routing.LifeRoutingSignalExtractor;
import com.lifesimulator.backend.engine.routing.DecisionRoutingPolicy;
import org.junit.jupiter.api.Test;

class SimulationRouterTests {

  private final ObjectMapper json = new ObjectMapper();
  private final SimulationRouter router = new SimulationRouter(
    new LifeRoutingSignalExtractor(),
    new DecisionRoutingPolicy()
  );

  @Test
  void preservesLightPathForLowComplexityRequest() {
    BackendRoutingDecision decision = router.route(
      request("선택 기준과 필요한 정보가 충분히 정리되어 있고 두 선택지의 차이가 명확해서 추가 검토 부담이 낮은 상황입니다.", "low"),
      "mock"
    );

    assertThat(decision.executionMode()).isEqualTo("light");
    assertThat(decision.selectedPath()).containsExactly("planner", "advisor");
    assertThat(decision.stageModelPlan()).containsEntry("state_loader", "mock");
    assertThat(decision.stageModelPlan()).containsEntry("advisor", "mock");
    assertThat(decision.reasons()).contains("execution_mode=light");
  }

  @Test
  void preservesFullPathForHighAmbiguityRequest() {
    BackendRoutingDecision decision = router.route(
      request("모르겠고 uncertain 해서 비교 정보가 부족합니다.", "low"),
      "mock"
    );

    assertThat(decision.executionMode()).isEqualTo("full");
    assertThat(decision.selectedPath())
      .containsExactly(
        "planner",
        "scenario",
        "risk",
        "ab_reasoning",
        "guardrail",
        "advisor",
        "reflection"
      );
    assertThat(decision.stageModelPlan()).containsEntry("guardrail", ExecutionEngineNames.BACKEND_RULE);
    assertThat(decision.reasons()).contains("ambiguity=high", "execution_mode=full");
  }

  private JsonNode request(String context, String riskTolerance) {
    ObjectNode request = json.createObjectNode();
    request.set("decision", json.createObjectNode().put("context", context));
    ObjectNode userProfile = json.createObjectNode().put("risk_tolerance", riskTolerance);
    userProfile.set("priority", json.createArrayNode().add("stability"));
    request.set("userProfile", userProfile);
    return request;
  }
}
