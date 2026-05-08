package com.lifesimulator.backend.guardrail;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.domain.life.guardrail.LifeGuardrailSignalMapper;
import com.lifesimulator.backend.engine.guardrail.GuardrailResultFactory;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class GuardrailEvaluationServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void evaluatesCurrentLifeResponseSignalsWithoutChangingOutputShape() {
    GuardrailEvaluationService service = new GuardrailEvaluationService(
      new GuardrailResultFactory(objectMapper),
      new LifeGuardrailSignalMapper()
    );

    JsonNode guardrail = service.evaluate(response(), routingDecision());

    assertThat(guardrail.path("guardrail_triggered").asBoolean()).isTrue();
    assertThat(textList(guardrail.path("triggers"))).containsExactly("reasoning_conflict", "high_risk");
    assertThat(textList(guardrail.path("strategy"))).containsExactly("neutralize_decision", "risk_warning");
    assertThat(guardrail.path("risk_score").asDouble()).isEqualTo(0.71);
    assertThat(guardrail.path("confidence_score").asDouble()).isEqualTo(0.68);
    assertThat(guardrail.path("final_mode").asText()).isEqualTo("cautious");
    assertThat(guardrail.path("reasoning_signals").path("conflicting_signals").asBoolean()).isTrue();
  }

  private ObjectNode response() {
    ObjectNode response = objectMapper.createObjectNode();
    ObjectNode riskA = response.putObject("riskA");
    riskA.putObject("structured_assessment").put("risk_score", 0.71);
    ObjectNode riskB = response.putObject("riskB");
    riskB.putObject("structured_assessment").put("risk_score", 0.48);
    response.putObject("advisor").put("confidence", 0.68);
    response
      .putObject("reasoning")
      .putObject("structured_signals")
      .put("conflict", true)
      .put("missing_info", false);
    return response;
  }

  private BackendRoutingDecision routingDecision() {
    return new BackendRoutingDecision(
      "full",
      List.of("planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor"),
      Map.of(),
      Map.of(),
      List.of(),
      "medium",
      "medium",
      "low",
      0,
      100
    );
  }

  private List<String> textList(JsonNode array) {
    List<String> values = new ArrayList<>();
    array.forEach(value -> values.add(value.asText()));
    return values;
  }
}
