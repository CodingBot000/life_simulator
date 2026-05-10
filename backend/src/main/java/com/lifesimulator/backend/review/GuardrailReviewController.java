package com.lifesimulator.backend.review;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GuardrailReviewController {

  private final GuardrailReviewService guardrailReviewService;

  public GuardrailReviewController(GuardrailReviewService guardrailReviewService) {
    this.guardrailReviewService = guardrailReviewService;
  }

  @PostMapping("/api/guardrail-reviews")
  public GuardrailReviewResponse create(
    @RequestBody GuardrailReviewRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return guardrailReviewService.create(request, sessionId(headers));
  }

  private String sessionId(HttpHeaders headers) {
    String value = headers.getFirst("x-session-id");
    return value == null || value.isBlank() ? null : value.trim();
  }
}
