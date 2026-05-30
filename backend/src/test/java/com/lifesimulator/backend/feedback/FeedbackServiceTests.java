package com.lifesimulator.backend.feedback;

import static com.lifesimulator.backend.testsupport.ObjectProviderTestSupport.providerOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeEvaluationTargetMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class FeedbackServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final FeedbackRepository repository = mock(FeedbackRepository.class);
  private final SimulationLogLookupRepository logLookup = mock(SimulationLogLookupRepository.class);
  private final FeedbackService service = new FeedbackService(
    objectMapper,
    providerOf(repository),
    providerOf(logLookup),
    new LifeEvaluationTargetMapper(),
    new LifeFeedbackLabelMapper()
  );

  @Test
  void createPersistsMappedFeedbackRow() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(logLookup.traceIdFor("request-1")).thenReturn("trace-1");
    when(repository.insert(any())).thenAnswer(invocation -> {
      FeedbackRepository.FeedbackRow row = invocation.getArgument(0);
      return new FeedbackResponse(row.feedbackId(), row.requestId(), row.targetType(), row.feedbackSignal(), row.rating(), "created", "updated");
    });

    FeedbackResponse response = service.create(
      new FeedbackRequest(
        " request-1 ",
        "advisor",
        "option_a",
        "would_choose",
        5,
        List.of("clear_reasoning", " "),
        " good ",
        objectMapper.createObjectNode().put("source", "test")
      ),
      "session-1"
    );

    ArgumentCaptor<FeedbackRepository.FeedbackRow> captor = ArgumentCaptor.forClass(FeedbackRepository.FeedbackRow.class);
    verify(repository).insert(captor.capture());
    FeedbackRepository.FeedbackRow row = captor.getValue();
    assertThat(response.feedbackId()).startsWith("fb_");
    assertThat(row.requestId()).isEqualTo("request-1");
    assertThat(row.traceId()).isEqualTo("trace-1");
    assertThat(row.sessionId()).isEqualTo("session-1");
    assertThat(row.targetType()).isEqualTo("advisor");
    assertThat(row.targetOption()).isEqualTo("A");
    assertThat(row.feedbackSignal()).isEqualTo("would_choose");
    assertThat(row.reasonTags()).containsExactly("clear_reasoning");
    assertThat(row.comment()).isEqualTo("good");
  }

  @Test
  void updateThrowsNotFoundWhenRepositoryDoesNotUpdateRow() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(repository.update(any(), any())).thenReturn(null);

    assertThatThrownBy(() -> service.update(
      "fb-missing",
      new FeedbackRequest("request-1", "advisor", "A", "agree", 5, List.of(), null, null),
      "session-1"
    ))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("feedback_not_found");
  }

  @Test
  void createReturnsFallbackResponseWhenDatabaseUnavailable() {
    FeedbackService fallbackService = service(null, null);

    FeedbackResponse response = fallbackService.create(
      new FeedbackRequest(" request-1 ", "advisor", "A", "agree", 4, List.of(), null, null),
      "session-1"
    );

    assertThat(response.feedbackId()).startsWith("fb_");
    assertThat(response.requestId()).isEqualTo("request-1");
    assertThat(response.targetType()).isEqualTo("advisor");
    assertThat(response.feedbackSignal()).isEqualTo("agree");
    assertThat(response.rating()).isEqualTo(4);
    assertThat(response.createdAt()).isNotBlank();
    assertThat(response.updatedAt()).isEqualTo(response.createdAt());
  }

  @Test
  void updateReturnsFallbackResponseWhenDatabaseUnavailable() {
    FeedbackService fallbackService = service(null, null);

    FeedbackResponse response = fallbackService.update(
      "fb-local",
      new FeedbackRequest("request-1", "advisor", "A", "helpful", 5, List.of(), null, null),
      "session-1"
    );

    assertThat(response.feedbackId()).isEqualTo("fb-local");
    assertThat(response.requestId()).isEqualTo("request-1");
    assertThat(response.feedbackSignal()).isEqualTo("helpful");
  }

  @Test
  void summaryReturnsEmptyItemsWhenDatabaseUnavailable() {
    FeedbackService fallbackService = service(null, null);

    assertThat(fallbackService.summary("request-1"))
      .containsEntry("requestId", "request-1")
      .containsEntry("items", List.of());
  }

  @Test
  void rejectsOutOfRangeRating() {
    assertThatThrownBy(() -> service.create(
      new FeedbackRequest("request-1", "advisor", "A", "agree", 6, List.of(), null, null),
      "session-1"
    ))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("rating");
  }

  private FeedbackService service(
    FeedbackRepository repository,
    SimulationLogLookupRepository logLookup
  ) {
    return new FeedbackService(
      objectMapper,
      providerOf(repository),
      providerOf(logLookup),
      new LifeEvaluationTargetMapper(),
      new LifeFeedbackLabelMapper()
    );
  }
}
