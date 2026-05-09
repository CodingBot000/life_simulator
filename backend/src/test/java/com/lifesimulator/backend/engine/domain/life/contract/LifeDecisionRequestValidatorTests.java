package com.lifesimulator.backend.engine.domain.life.contract;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

class LifeDecisionRequestValidatorTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final LifeDecisionRequestValidator validator = new LifeDecisionRequestValidator();

  @Test
  void acceptsPartialFollowupDetailsForReevaluation() {
    ObjectNode request = validRequest();
    ObjectNode optionDetails = ((ObjectNode) request.path("decision")).putObject("optionDetails");
    optionDetails.putObject("A").put("worstCase", "A worst case");
    request.putObject("reevaluation")
      .put("reason", "option_followup")
      .put("iteration", 2);

    assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
  }

  @Test
  void rejectsInvalidReevaluationIteration() {
    ObjectNode request = validRequest();
    request.putObject("reevaluation").put("iteration", 0);

    assertThatThrownBy(() -> validator.validate(request))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("reevaluation.iteration");
  }

  private ObjectNode validRequest() {
    ObjectNode request = objectMapper.createObjectNode();
    ObjectNode profile = request.putObject("userProfile");
    profile.put("age", 32);
    profile.put("job", "developer");
    profile.put("risk_tolerance", "medium");
    profile.putArray("priority").add("stability").add("income");
    ObjectNode decision = request.putObject("decision");
    decision.put("optionA", "Stay");
    decision.put("optionB", "Move");
    decision.put("context", "Career decision context");
    return request;
  }
}
