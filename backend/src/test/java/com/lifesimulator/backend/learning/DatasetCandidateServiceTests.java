package com.lifesimulator.backend.learning;

import static com.lifesimulator.backend.testsupport.ObjectProviderTestSupport.providerOf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.evaluation.EvaluationLabelSet;
import com.lifesimulator.backend.engine.learning.DatasetCandidate;
import com.lifesimulator.backend.engine.learning.DatasetCandidateBuilder;
import com.lifesimulator.backend.engine.learning.DatasetCandidateStatus;
import com.lifesimulator.backend.engine.learning.DatasetCandidateType;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class DatasetCandidateServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final DatasetCandidateBuilder builder = mock(DatasetCandidateBuilder.class);
  private final DatasetCandidateRepository repository = mock(DatasetCandidateRepository.class);
  private final SimulationLogLookupRepository logLookup = mock(SimulationLogLookupRepository.class);
  private final DatasetCandidateService service = new DatasetCandidateService(
    builder,
    providerOf(repository),
    providerOf(logLookup)
  );

  @Test
  void buildCollectsLabelsAndUpsertsCandidates() {
    when(logLookup.existsRequest("request-1")).thenReturn(true);
    when(repository.requestPayloads("request-1")).thenReturn(new DatasetCandidateRepository.RequestPayloads(
      objectMapper.createObjectNode().put("input", true),
      objectMapper.createObjectNode().put("output", true)
    ));
    when(repository.feedbackEvents("request-1")).thenReturn(List.of());
    when(repository.outcomeLabels("request-1")).thenReturn(List.of());
    when(repository.stateCorrections("request-1")).thenReturn(List.of());
    when(repository.guardrailReviews("request-1")).thenReturn(List.of());
    DatasetCandidate candidate = new DatasetCandidate(
      "cand-1",
      "request-1",
      DatasetCandidateType.ADVISOR_PREFERENCE,
      "feedback_loop",
      objectMapper.createObjectNode(),
      objectMapper.createObjectNode(),
      objectMapper.createObjectNode(),
      objectMapper.createObjectNode(),
      0.8,
      DatasetCandidateStatus.CANDIDATE
    );
    when(builder.build(any())).thenReturn(List.of(candidate));

    Map<String, Object> response = service.build(new DatasetCandidateBuildRequest(" request-1 "));

    ArgumentCaptor<com.lifesimulator.backend.engine.learning.DatasetCandidateBuildInput> captor =
      ArgumentCaptor.forClass(com.lifesimulator.backend.engine.learning.DatasetCandidateBuildInput.class);
    verify(builder).build(captor.capture());
    verify(repository).upsert(candidate);
    assertThat(captor.getValue().labels()).isInstanceOf(EvaluationLabelSet.class);
    assertThat(response).containsEntry("requestId", "request-1").containsEntry("persisted", 1);
  }

  @Test
  void buildRejectsUnknownRequest() {
    when(logLookup.existsRequest("request-1")).thenReturn(false);

    assertThatThrownBy(() -> service.build(new DatasetCandidateBuildRequest("request-1")))
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("request_not_found");
  }

  @Test
  void listBoundsLimitAndDelegatesToRepository() {
    when(repository.list("candidate", 200)).thenReturn(List.of(Map.of("candidateId", "cand-1")));

    Map<String, Object> response = service.list("candidate", 1000);

    verify(repository).list("candidate", 200);
    assertThat(response).containsEntry("status", "candidate");
  }
}
