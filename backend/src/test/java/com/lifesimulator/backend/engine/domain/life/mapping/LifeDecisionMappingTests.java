package com.lifesimulator.backend.engine.domain.life.mapping;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.contract.GenericDecisionResult;
import org.junit.jupiter.api.Test;

class LifeDecisionMappingTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void mapsLifeRequestIntoGenericDecisionRequest() {
    ObjectNode request = objectMapper.createObjectNode();
    ObjectNode profile = request.putObject("userProfile");
    profile.put("age", 32);
    profile.put("job", "developer");
    profile.put("risk_tolerance", "low");
    profile.putArray("priority").add("stability").add("income");
    ObjectNode decision = request.putObject("decision");
    decision.put("optionA", "Stay");
    decision.put("optionB", "Move");
    decision.put("context", "Career decision context");
    ObjectNode optionDetails = decision.putObject("optionDetails");
    optionDetails.putObject("A")
      .put("worstCase", "Growth stalls")
      .put("rollbackCondition", "Switch after six months without scope expansion");
    optionDetails.putObject("B")
      .put("worstCase", "New role does not fit")
      .put("rollbackCondition", "Restart search during probation");
    ObjectNode reevaluation = request.putObject("reevaluation");
    reevaluation.put("reason", "option_followup");
    reevaluation.put("iteration", 2);
    reevaluation.put("previousRequestId", "request-1");

    var generic = new LifeRequestToGenericDecisionMapper(objectMapper).map(request, "en");

    assertThat(generic.subject().type()).isEqualTo("life_decision");
    assertThat(generic.question().context()).isEqualTo("Career decision context");
    assertThat(generic.preference().riskTolerance()).isEqualTo("low");
    assertThat(generic.preference().priorities()).containsExactly("stability", "income");
    assertThat(generic.options()).hasSize(2);
    assertThat(generic.options().get(0).id()).isEqualTo("A");
    assertThat(generic.options().get(0).label()).isEqualTo("Stay");
    assertThat(generic.options().get(0).attributes())
      .containsEntry("worstCase", "Growth stalls")
      .containsEntry("rollbackCondition", "Switch after six months without scope expansion");
    assertThat(generic.options().get(1).id()).isEqualTo("B");
    assertThat(generic.options().get(1).label()).isEqualTo("Move");
    assertThat(generic.options().get(1).attributes())
      .containsEntry("worstCase", "New role does not fit")
      .containsEntry("rollbackCondition", "Restart search during probation");
    assertThat(generic.hints())
      .containsEntry("reevaluationReason", "option_followup")
      .containsEntry("iteration", 2)
      .containsEntry("previousRequestId", "request-1");
  }

  @Test
  void mapsGenericResultBackIntoLifeAdvisorShape() {
    ObjectNode response = objectMapper.createObjectNode();
    GenericDecisionResult result = new GenericDecisionResult(
      "B",
      "Move",
      0.74,
      "Better fit.",
      java.util.Map.of(),
      java.util.Map.of()
    );

    ObjectNode mapped = new GenericDecisionToLifeResponseMapper(objectMapper)
      .applyToLifeResponse(response, result);

    assertThat(mapped.path("advisor").path("decision").asText()).isEqualTo("B");
    assertThat(mapped.path("advisor").path("recommended_option").asText()).isEqualTo("B");
    assertThat(mapped.path("advisor").path("confidence").asDouble()).isEqualTo(0.74);
    assertThat(mapped.path("advisor").path("reason").asText()).isEqualTo("Better fit.");
    assertThat(mapped.path("advisor").path("guardrail_applied").asBoolean()).isFalse();
    assertThat(mapped.path("advisor").path("reasoning_basis").path("selected_reasoning").asText())
      .isEqualTo("B");
  }
}
