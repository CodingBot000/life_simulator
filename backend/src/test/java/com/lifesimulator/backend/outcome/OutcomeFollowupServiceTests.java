package com.lifesimulator.backend.outcome;

import static com.lifesimulator.backend.testsupport.ObjectProviderTestSupport.providerOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeEvaluationTargetMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OutcomeFollowupServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final OutcomeFollowupRepository repository = mock(OutcomeFollowupRepository.class);
  private final SimulationLogLookupRepository logLookup = mock(SimulationLogLookupRepository.class);
  private final OutcomeFollowupService service = new OutcomeFollowupService(
    objectMapper,
    providerOf(repository),
    providerOf(logLookup),
    new LifeEvaluationTargetMapper()
  );

  @Test
  void updatePersistsNormalizedOutcomeRow() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(logLookup.traceIdFor("request-1")).thenReturn("trace-1");
    when(repository.update(any(), any())).thenAnswer(invocation -> {
      OutcomeFollowupRepository.OutcomeFollowupRow row = invocation.getArgument(1);
      return new OutcomeFollowupResponse(row.followupId(), row.requestId(), row.actualChoice(), row.satisfactionScore(), row.regretScore(), "created", "updated");
    });

    OutcomeFollowupResponse response = service.update(
      "out-1",
      new OutcomeFollowupRequest(
        " request-1 ",
        "option_b",
        4,
        2,
        " note ",
        List.of("time", " "),
        -5,
        objectMapper.createObjectNode()
      ),
      "session-1"
    );

    ArgumentCaptor<OutcomeFollowupRepository.OutcomeFollowupRow> captor = ArgumentCaptor.forClass(OutcomeFollowupRepository.OutcomeFollowupRow.class);
    verify(repository).update(any(), captor.capture());
    OutcomeFollowupRepository.OutcomeFollowupRow row = captor.getValue();
    assertThat(response.followupId()).isEqualTo("out-1");
    assertThat(row.requestId()).isEqualTo("request-1");
    assertThat(row.traceId()).isEqualTo("trace-1");
    assertThat(row.actualChoice()).isEqualTo("B");
    assertThat(row.unexpectedFactors()).containsExactly("time");
    assertThat(row.horizonDays()).isZero();
  }

  @Test
  void rejectsInvalidActualChoice() {
    assertThatThrownBy(() -> service.create(
      new OutcomeFollowupRequest("request-1", "C", 4, 2, null, List.of(), 0, null),
      "session-1"
    ))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("actualChoice");
  }
}
