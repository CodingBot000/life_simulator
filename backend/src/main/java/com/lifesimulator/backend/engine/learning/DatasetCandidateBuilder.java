package com.lifesimulator.backend.engine.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import com.lifesimulator.backend.engine.evaluation.EvaluationEvent;
import com.lifesimulator.backend.engine.evaluation.FeedbackSignal;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewEvent;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewLabel;
import com.lifesimulator.backend.engine.evaluation.OutcomeLabel;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DatasetCandidateBuilder {

  private final ObjectMapper objectMapper;

  public DatasetCandidateBuilder(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public List<DatasetCandidate> build(DatasetCandidateBuildInput input) {
    List<DatasetCandidate> candidates = new ArrayList<>();
    if (hasAdvisorFeedback(input)) {
      candidates.add(candidate(input, DatasetCandidateType.ADVISOR_PREFERENCE, advisorLabels(input), 0.82));
    }
    if (hasReasoningFeedback(input)) {
      candidates.add(candidate(input, DatasetCandidateType.REASONING_PREFERENCE, reasoningLabels(input), 0.76));
    }
    if (!input.labels().guardrailReviews().isEmpty()) {
      candidates.add(candidate(input, DatasetCandidateType.GUARDRAIL_LABEL, guardrailLabels(input), 0.8));
    }
    if (!input.labels().stateCorrections().isEmpty()) {
      candidates.add(candidate(input, DatasetCandidateType.STATE_CORRECTION, objectMapper.valueToTree(input.labels().stateCorrections()), 0.74));
    }
    if (!input.labels().outcomeLabels().isEmpty()) {
      candidates.add(candidate(input, DatasetCandidateType.OUTCOME_SUPERVISION, outcomeLabels(input), outcomeQuality(input)));
    }
    return candidates;
  }

  private boolean hasAdvisorFeedback(DatasetCandidateBuildInput input) {
    return input
      .labels()
      .feedbackEvents()
      .stream()
      .anyMatch(event -> event.target() == DecisionEvaluationTarget.ADVISOR);
  }

  private boolean hasReasoningFeedback(DatasetCandidateBuildInput input) {
    return input
      .labels()
      .feedbackEvents()
      .stream()
      .anyMatch(event -> event.target() == DecisionEvaluationTarget.REASONING_A ||
        event.target() == DecisionEvaluationTarget.REASONING_B ||
        event.target() == DecisionEvaluationTarget.COMPARISON ||
        event.target() == DecisionEvaluationTarget.FINAL_SELECTION);
  }

  private JsonNode advisorLabels(DatasetCandidateBuildInput input) {
    ObjectNode labels = objectMapper.createObjectNode();
    labels.set("feedback", objectMapper.valueToTree(input
      .labels()
      .feedbackEvents()
      .stream()
      .filter(event -> event.target() == DecisionEvaluationTarget.ADVISOR)
      .toList()));
    labels.set("outcomes", outcomeLabels(input));
    labels.put("recommended_option", input.responsePayload().at("/advisor/decision").asText(""));
    labels.put("positive_preference", hasPositiveAdvisorSignal(input));
    return labels;
  }

  private boolean hasPositiveAdvisorSignal(DatasetCandidateBuildInput input) {
    return input
      .labels()
      .feedbackEvents()
      .stream()
      .filter(event -> event.target() == DecisionEvaluationTarget.ADVISOR)
      .anyMatch(event -> event.signal() == FeedbackSignal.AGREE ||
        event.signal() == FeedbackSignal.HELPFUL ||
        event.signal() == FeedbackSignal.WOULD_CHOOSE);
  }

  private JsonNode reasoningLabels(DatasetCandidateBuildInput input) {
    ObjectNode labels = objectMapper.createObjectNode();
    labels.set("feedback", objectMapper.valueToTree(input
      .labels()
      .feedbackEvents()
      .stream()
      .filter(event -> event.target() == DecisionEvaluationTarget.REASONING_A ||
        event.target() == DecisionEvaluationTarget.REASONING_B ||
        event.target() == DecisionEvaluationTarget.COMPARISON ||
        event.target() == DecisionEvaluationTarget.FINAL_SELECTION)
      .toList()));
    labels.put("selected_option", input.responsePayload().at("/reasoning/reasoning/final_selection/selected_option").asText(""));
    return labels;
  }

  private JsonNode guardrailLabels(DatasetCandidateBuildInput input) {
    ObjectNode labels = objectMapper.createObjectNode();
    labels.set("reviews", objectMapper.valueToTree(input.labels().guardrailReviews()));
    labels.put("current_mode", input.responsePayload().at("/guardrail/final_mode").asText(""));
    labels.put("needs_mode_change", input
      .labels()
      .guardrailReviews()
      .stream()
      .map(GuardrailReviewEvent::reviewLabel)
      .anyMatch(label -> label == GuardrailReviewLabel.OVER || label == GuardrailReviewLabel.MISSING));
    return labels;
  }

  private JsonNode outcomeLabels(DatasetCandidateBuildInput input) {
    return objectMapper.valueToTree(input.labels().outcomeLabels());
  }

  private double outcomeQuality(DatasetCandidateBuildInput input) {
    int maxHorizon = input
      .labels()
      .outcomeLabels()
      .stream()
      .mapToInt(OutcomeLabel::horizonDays)
      .max()
      .orElse(0);
    return maxHorizon >= 30 ? 0.9 : 0.7;
  }

  private DatasetCandidate candidate(
    DatasetCandidateBuildInput input,
    DatasetCandidateType type,
    JsonNode labels,
    double qualityScore
  ) {
    return new DatasetCandidate(
      "cand_" + input.requestId() + "_" + type.value(),
      input.requestId(),
      type,
      "feedback_loop",
      input.requestPayload().deepCopy(),
      labels.deepCopy(),
      input.responsePayload().deepCopy(),
      labels.deepCopy(),
      qualityScore,
      DatasetCandidateStatus.CANDIDATE
    );
  }
}
