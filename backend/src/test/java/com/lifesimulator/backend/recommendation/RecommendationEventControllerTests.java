package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.lifesimulator.backend.recommendation.api.RecommendationEventController;
import com.lifesimulator.backend.recommendation.api.RecommendationEventRequest;
import com.lifesimulator.backend.recommendation.core.RecommendationEventSink;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class RecommendationEventControllerTests {

  @Test
  void acceptsKnownRecommendationEvents() {
    CapturingSink sink = new CapturingSink();
    RecommendationEventController controller = new RecommendationEventController(sink);

    var response = controller.recordEvent(
      new RecommendationEventRequest("request-1", "catalog", "ko-career-book-001", "click")
    );

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().accepted()).isTrue();
    assertThat(sink.eventType).isEqualTo("click");
    assertThat(sink.itemId).isEqualTo("ko-career-book-001");
  }

  @Test
  void rejectsUnknownEventType() {
    RecommendationEventController controller = new RecommendationEventController(
      (requestId, provider, itemId, eventType) -> {}
    );

    assertThatThrownBy(() -> controller.recordEvent(
      new RecommendationEventRequest("request-1", "catalog", "item-1", "purchase")
    )).isInstanceOf(IllegalArgumentException.class);
  }

  private static class CapturingSink implements RecommendationEventSink {
    private String requestId;
    private String provider;
    private String itemId;
    private String eventType;

    @Override
    public void record(String requestId, String provider, String itemId, String eventType) {
      this.requestId = requestId;
      this.provider = provider;
      this.itemId = itemId;
      this.eventType = eventType;
    }
  }
}
