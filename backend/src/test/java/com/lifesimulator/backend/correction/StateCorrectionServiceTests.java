package com.lifesimulator.backend.correction;

import static com.lifesimulator.backend.testsupport.ObjectProviderTestSupport.providerOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class StateCorrectionServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final StateCorrectionRepository repository = mock(StateCorrectionRepository.class);
  private final SimulationLogLookupRepository logLookup = mock(SimulationLogLookupRepository.class);
  private final StateCorrectionService service = new StateCorrectionService(
    objectMapper,
    providerOf(repository),
    providerOf(logLookup),
    new LifeFeedbackLabelMapper()
  );

  @Test
  void createPersistsSupportedStatePath() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(logLookup.traceIdFor("request-1")).thenReturn("trace-1");
    when(repository.insert(any())).thenAnswer(invocation -> {
      StateCorrectionRepository.StateCorrectionRow row = invocation.getArgument(0);
      return new StateCorrectionResponse(row.correctionId(), row.requestId(), row.fieldPath(), row.correctionType(), "created");
    });

    StateCorrectionResponse response = service.create(
      new StateCorrectionRequest(
        "request-1",
        "stateContext.user_state.profile_state.decision_style",
        objectMapper.valueToTree("old"),
        objectMapper.valueToTree("new"),
        "user_correction",
        " trim "
      ),
      "session-1"
    );

    ArgumentCaptor<StateCorrectionRepository.StateCorrectionRow> captor = ArgumentCaptor.forClass(StateCorrectionRepository.StateCorrectionRow.class);
    verify(repository).insert(captor.capture());
    assertThat(response.correctionId()).startsWith("corr_");
    assertThat(captor.getValue().traceId()).isEqualTo("trace-1");
    assertThat(captor.getValue().comment()).isEqualTo("trim");
  }

  @Test
  void rejectsUnsupportedStatePath() {
    assertThatThrownBy(() -> service.create(
      new StateCorrectionRequest("request-1", "advisor.reason", null, objectMapper.valueToTree("new"), "user_correction", null),
      "session-1"
    ))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("fieldPath");
  }
}
