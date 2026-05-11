package com.lifesimulator.backend.review;

import static com.lifesimulator.backend.testsupport.ObjectProviderTestSupport.providerOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class GuardrailReviewServiceTests {

  private final GuardrailReviewRepository repository = mock(GuardrailReviewRepository.class);
  private final SimulationLogLookupRepository logLookup = mock(SimulationLogLookupRepository.class);
  private final GuardrailReviewService service = new GuardrailReviewService(
    providerOf(repository),
    providerOf(logLookup),
    new LifeFeedbackLabelMapper()
  );

  @Test
  void createPersistsMappedReviewLabel() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(logLookup.traceIdFor("request-1")).thenReturn("trace-1");
    when(repository.insert(any())).thenAnswer(invocation -> {
      GuardrailReviewRepository.GuardrailReviewRow row = invocation.getArgument(0);
      return new GuardrailReviewResponse(row.reviewId(), row.requestId(), row.reviewLabel(), row.correctMode(), "created");
    });

    GuardrailReviewResponse response = service.create(
      new GuardrailReviewRequest("request-1", "user", "over", "normal", List.of("too_conservative", " "), " note "),
      "session-1"
    );

    ArgumentCaptor<GuardrailReviewRepository.GuardrailReviewRow> captor = ArgumentCaptor.forClass(GuardrailReviewRepository.GuardrailReviewRow.class);
    verify(repository).insert(captor.capture());
    assertThat(response.reviewId()).startsWith("grv_");
    assertThat(captor.getValue().traceId()).isEqualTo("trace-1");
    assertThat(captor.getValue().reviewLabel()).isEqualTo("over");
    assertThat(captor.getValue().reasonTags()).containsExactly("too_conservative");
    assertThat(captor.getValue().comment()).isEqualTo("note");
  }

  @Test
  void rejectsInvalidReviewLabel() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);

    assertThatThrownBy(() -> service.create(
      new GuardrailReviewRequest("request-1", "user", "invalid", null, List.of(), null),
      "session-1"
    ))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Unsupported guardrail review label");
  }
}
