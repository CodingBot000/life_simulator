package com.lifesimulator.backend.feedback;

import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FeedbackController {

  private final FeedbackService feedbackService;
  private final FeedbackSummaryService summaryService;

  public FeedbackController(FeedbackService feedbackService, FeedbackSummaryService summaryService) {
    this.feedbackService = feedbackService;
    this.summaryService = summaryService;
  }

  @PostMapping("/api/feedback")
  public FeedbackResponse create(@RequestBody FeedbackRequest request, @RequestHeader HttpHeaders headers) {
    return feedbackService.create(request, sessionId(headers));
  }

  @PutMapping("/api/feedback/{feedbackId}")
  public FeedbackResponse update(
    @PathVariable String feedbackId,
    @RequestBody FeedbackRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return feedbackService.update(feedbackId, request, sessionId(headers));
  }

  @GetMapping("/api/feedback/summary")
  public Map<String, Object> summary(@RequestParam String requestId) {
    return summaryService.summary(requestId);
  }

  private String sessionId(HttpHeaders headers) {
    String value = headers.getFirst("x-session-id");
    return value == null || value.isBlank() ? null : value.trim();
  }
}
