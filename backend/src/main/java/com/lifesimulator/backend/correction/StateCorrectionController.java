package com.lifesimulator.backend.correction;

import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StateCorrectionController {

  private final StateCorrectionService stateCorrectionService;

  public StateCorrectionController(StateCorrectionService stateCorrectionService) {
    this.stateCorrectionService = stateCorrectionService;
  }

  @PostMapping("/api/state-corrections")
  public StateCorrectionResponse create(
    @RequestBody StateCorrectionRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return stateCorrectionService.create(request, sessionId(headers));
  }

  private String sessionId(HttpHeaders headers) {
    String value = headers.getFirst("x-session-id");
    return value == null || value.isBlank() ? null : value.trim();
  }
}
