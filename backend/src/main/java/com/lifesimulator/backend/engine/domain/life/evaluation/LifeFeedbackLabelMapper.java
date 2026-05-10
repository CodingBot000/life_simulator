package com.lifesimulator.backend.engine.domain.life.evaluation;

import com.lifesimulator.backend.engine.evaluation.FeedbackSignal;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewLabel;
import org.springframework.stereotype.Component;

@Component
public class LifeFeedbackLabelMapper {

  public FeedbackSignal feedbackSignalFor(String value) {
    return FeedbackSignal.from(value);
  }

  public GuardrailReviewLabel guardrailReviewLabelFor(String value) {
    return GuardrailReviewLabel.from(value);
  }

  public boolean isSupportedStatePath(String fieldPath) {
    String value = fieldPath == null ? "" : fieldPath.trim();
    return value.startsWith("stateContext.user_state.") ||
      value.startsWith("stateContext.state_summary.");
  }
}
