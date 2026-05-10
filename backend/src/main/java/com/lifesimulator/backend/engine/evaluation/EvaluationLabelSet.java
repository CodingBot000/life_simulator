package com.lifesimulator.backend.engine.evaluation;

import java.util.List;

public record EvaluationLabelSet(
  List<EvaluationEvent> feedbackEvents,
  List<OutcomeLabel> outcomeLabels,
  List<StateCorrectionLabel> stateCorrections,
  List<GuardrailReviewEvent> guardrailReviews
) {
  public EvaluationLabelSet {
    feedbackEvents = feedbackEvents == null ? List.of() : List.copyOf(feedbackEvents);
    outcomeLabels = outcomeLabels == null ? List.of() : List.copyOf(outcomeLabels);
    stateCorrections = stateCorrections == null ? List.of() : List.copyOf(stateCorrections);
    guardrailReviews = guardrailReviews == null ? List.of() : List.copyOf(guardrailReviews);
  }
}
