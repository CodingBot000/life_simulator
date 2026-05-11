package com.lifesimulator.backend.recommendation.api;

import com.lifesimulator.backend.recommendation.core.RecommendationEventSink;
import java.util.Set;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RecommendationEventController {

  private static final Set<String> ALLOWED_EVENT_TYPES = Set.of("impression", "click", "dismiss");

  private final RecommendationEventSink eventSink;

  public RecommendationEventController(RecommendationEventSink eventSink) {
    this.eventSink = eventSink;
  }

  @PostMapping(value = "/api/recommendation-events", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<RecommendationEventResponse> recordEvent(
    @RequestBody RecommendationEventRequest request
  ) {
    validate(request);
    eventSink.record(request.requestId(), request.provider(), request.itemId(), request.eventType());
    return ResponseEntity.ok(RecommendationEventResponse.ok());
  }

  private void validate(RecommendationEventRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("request body is required");
    }
    if (blank(request.requestId())) {
      throw new IllegalArgumentException("request_id is required");
    }
    if (blank(request.provider())) {
      throw new IllegalArgumentException("provider is required");
    }
    if (blank(request.itemId())) {
      throw new IllegalArgumentException("item_id is required");
    }
    if (!ALLOWED_EVENT_TYPES.contains(request.eventType())) {
      throw new IllegalArgumentException("event_type must be one of impression, click, dismiss");
    }
  }

  private boolean blank(String value) {
    return value == null || value.isBlank();
  }
}
