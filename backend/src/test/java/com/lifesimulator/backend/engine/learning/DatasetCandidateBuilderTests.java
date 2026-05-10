package com.lifesimulator.backend.engine.learning;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import com.lifesimulator.backend.engine.evaluation.EvaluationEvent;
import com.lifesimulator.backend.engine.evaluation.EvaluationLabelSet;
import com.lifesimulator.backend.engine.evaluation.FeedbackSignal;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewEvent;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewLabel;
import com.lifesimulator.backend.engine.evaluation.OutcomeLabel;
import java.util.List;
import org.junit.jupiter.api.Test;

class DatasetCandidateBuilderTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final DatasetCandidateBuilder builder = new DatasetCandidateBuilder(objectMapper);

  @Test
  void buildsAdvisorAndOutcomeCandidatesFromFeedbackLabels() {
    List<DatasetCandidate> candidates = builder.build(
      new DatasetCandidateBuildInput(
        "request-1",
        requestPayload(),
        responsePayload(),
        new EvaluationLabelSet(
          List.of(feedback(DecisionEvaluationTarget.ADVISOR, FeedbackSignal.AGREE)),
          List.of(outcome()),
          List.of(),
          List.of()
        )
      )
    );

    assertThat(candidates).extracting(DatasetCandidate::type)
      .contains(DatasetCandidateType.ADVISOR_PREFERENCE, DatasetCandidateType.OUTCOME_SUPERVISION);
    assertThat(candidates).allMatch(candidate -> candidate.status() == DatasetCandidateStatus.CANDIDATE);
  }

  @Test
  void buildsGuardrailCandidateWhenReviewSuggestsModeChange() {
    List<DatasetCandidate> candidates = builder.build(
      new DatasetCandidateBuildInput(
        "request-2",
        requestPayload(),
        responsePayload(),
        new EvaluationLabelSet(
          List.of(),
          List.of(),
          List.of(),
          List.of(new GuardrailReviewEvent("request-2", "trace", null, "session", "user", GuardrailReviewLabel.OVER, "normal", List.of("too_conservative"), "too much"))
        )
      )
    );

    DatasetCandidate guardrail = candidates.getFirst();
    assertThat(guardrail.type()).isEqualTo(DatasetCandidateType.GUARDRAIL_LABEL);
    assertThat(guardrail.labelPayload().path("needs_mode_change").asBoolean()).isTrue();
  }

  private EvaluationEvent feedback(DecisionEvaluationTarget target, FeedbackSignal signal) {
    return new EvaluationEvent(
      "request-1",
      "trace",
      null,
      "session",
      target,
      "A",
      signal,
      5,
      List.of("clear_reasoning"),
      "good",
      objectMapper.createObjectNode()
    );
  }

  private OutcomeLabel outcome() {
    return new OutcomeLabel(
      "request-1",
      "trace",
      null,
      "session",
      "A",
      4,
      2,
      "worked",
      List.of("role_scope"),
      30,
      objectMapper.createObjectNode()
    );
  }

  private ObjectNode requestPayload() {
    ObjectNode request = objectMapper.createObjectNode();
    request.putObject("decision").put("optionA", "Stay").put("optionB", "Move");
    return request;
  }

  private ObjectNode responsePayload() {
    ObjectNode response = objectMapper.createObjectNode();
    response.putObject("advisor").put("decision", "A");
    response.putObject("guardrail").put("final_mode", "cautious");
    ObjectNode finalSelection = response
      .putObject("reasoning")
      .putObject("reasoning")
      .putObject("final_selection");
    finalSelection.put("selected_option", "A");
    return response;
  }
}
