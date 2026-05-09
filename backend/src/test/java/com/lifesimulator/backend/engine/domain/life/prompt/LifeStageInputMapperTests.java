package com.lifesimulator.backend.engine.domain.life.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.domain.life.mapping.LifeRequestToGenericDecisionMapper;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.simulation.SimulationStage;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LifeStageInputMapperTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void includesFollowupDetailsInGenericDecisionAndSelectedOptionContext() {
    LifeStageInputMapper mapper = new LifeStageInputMapper(
      objectMapper,
      new LifeOptionSelector(),
      new LifeRequestToGenericDecisionMapper(objectMapper)
    );

    var input = mapper.inputFor(
      SimulationStage.RISK_A,
      "request-2",
      "ko",
      request(),
      objectMapper.createObjectNode(),
      routingDecision()
    );

    assertThat(input.path("hasOptionFollowup").asBoolean()).isTrue();
    assertThat(input.at("/optionDetails/A/worstCase").asText()).isEqualTo("성장 정체가 더 심해진다");
    assertThat(input.at("/selectedOptionDetails/rollbackCondition").asText())
      .isEqualTo("6개월 안에 역할 확장이 없으면 이직 준비로 전환한다");
    assertThat(input.at("/genericDecision/options/0/attributes/worstCase").asText())
      .isEqualTo("성장 정체가 더 심해진다");
    assertThat(input.at("/genericDecision/hints/reevaluationReason").asText())
      .isEqualTo("option_followup");
  }

  private ObjectNode request() {
    ObjectNode request = objectMapper.createObjectNode();
    ObjectNode profile = request.putObject("userProfile");
    profile.put("age", 32);
    profile.put("job", "developer");
    profile.put("risk_tolerance", "medium");
    profile.putArray("priority").add("stability").add("income");
    ObjectNode decision = request.putObject("decision");
    decision.put("optionA", "현재 회사에 남는다");
    decision.put("optionB", "스타트업으로 이직한다");
    decision.put("context", "현재 연봉은 안정적이지만 성장 정체를 느끼고 있다.");
    ObjectNode optionDetails = decision.putObject("optionDetails");
    optionDetails.putObject("A")
      .put("worstCase", "성장 정체가 더 심해진다")
      .put("rollbackCondition", "6개월 안에 역할 확장이 없으면 이직 준비로 전환한다");
    optionDetails.putObject("B")
      .put("worstCase", "업무 강도와 문화가 맞지 않는다")
      .put("rollbackCondition", "수습 기간 안에 적합성이 낮으면 재탐색한다");
    request.putObject("reevaluation")
      .put("reason", "option_followup")
      .put("iteration", 2)
      .put("previousRequestId", "request-1");
    return request;
  }

  private BackendRoutingDecision routingDecision() {
    return new BackendRoutingDecision(
      "careful",
      List.of("planner", "scenario", "risk", "advisor"),
      Map.of("risk_a", "test-model"),
      Map.of(),
      List.of(),
      "medium",
      "medium",
      "low",
      0,
      200
    );
  }
}
