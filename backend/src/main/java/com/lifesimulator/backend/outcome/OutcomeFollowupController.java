package com.lifesimulator.backend.outcome;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OutcomeFollowupController {

  private final OutcomeFollowupService outcomeFollowupService;

  public OutcomeFollowupController(OutcomeFollowupService outcomeFollowupService) {
    this.outcomeFollowupService = outcomeFollowupService;
  }

  @PostMapping("/api/outcome-followups")
  public OutcomeFollowupResponse create(
    @RequestBody OutcomeFollowupRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return outcomeFollowupService.create(request, sessionId(headers));
  }

  @PutMapping("/api/outcome-followups/{followupId}")
  public OutcomeFollowupResponse update(
    @PathVariable String followupId,
    @RequestBody OutcomeFollowupRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return outcomeFollowupService.update(followupId, request, sessionId(headers));
  }

  private String sessionId(HttpHeaders headers) {
    String value = headers.getFirst("x-session-id");
    return value == null || value.isBlank() ? null : value.trim();
  }
}
