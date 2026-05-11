package com.lifesimulator.backend.feedback;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class FeedbackSummaryService {

  private final FeedbackService feedbackService;

  public FeedbackSummaryService(FeedbackService feedbackService) {
    this.feedbackService = feedbackService;
  }

  public Map<String, Object> summary(String requestId) {
    return feedbackService.summary(requestId);
  }
}
