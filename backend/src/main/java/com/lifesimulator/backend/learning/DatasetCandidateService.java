package com.lifesimulator.backend.learning;

import com.lifesimulator.backend.engine.evaluation.EvaluationLabelSet;
import com.lifesimulator.backend.engine.learning.DatasetCandidate;
import com.lifesimulator.backend.engine.learning.DatasetCandidateBuildInput;
import com.lifesimulator.backend.engine.learning.DatasetCandidateBuilder;
import com.lifesimulator.backend.engine.learning.DatasetCandidateStatus;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DatasetCandidateService {

  private final DatasetCandidateBuilder builder;
  private final ObjectProvider<DatasetCandidateRepository> repository;
  private final ObjectProvider<SimulationLogLookupRepository> logLookup;

  public DatasetCandidateService(
    DatasetCandidateBuilder builder,
    ObjectProvider<DatasetCandidateRepository> repository,
    ObjectProvider<SimulationLogLookupRepository> logLookup
  ) {
    this.builder = builder;
    this.repository = repository;
    this.logLookup = logLookup;
  }

  public Map<String, Object> build(DatasetCandidateBuildRequest request) {
    if (request == null || request.requestId() == null || request.requestId().isBlank()) {
      throw new IllegalArgumentException("requestId is required.");
    }
    String requestId = request.requestId().trim();
    ensureRequestExists(requestId);
    DatasetCandidateRepository resolved = repo();
    DatasetCandidateRepository.RequestPayloads payloads = resolved.requestPayloads(requestId);
    if (payloads == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }

    List<DatasetCandidate> candidates = builder.build(
      new DatasetCandidateBuildInput(
        requestId,
        payloads.requestPayload(),
        payloads.responsePayload(),
        new EvaluationLabelSet(
          resolved.feedbackEvents(requestId),
          resolved.outcomeLabels(requestId),
          resolved.stateCorrections(requestId),
          resolved.guardrailReviews(requestId)
        )
      )
    );
    candidates.forEach(resolved::upsert);
    return Map.of(
      "requestId",
      requestId,
      "persisted",
      candidates.size(),
      "candidateIds",
      candidates.stream().map(DatasetCandidate::candidateId).toList()
    );
  }

  public Map<String, Object> list(String status, int limit) {
    DatasetCandidateStatus resolvedStatus = DatasetCandidateStatus.from(
      status == null || status.isBlank() ? "candidate" : status
    );
    int boundedLimit = Math.max(1, Math.min(limit <= 0 ? 50 : limit, 200));
    return Map.of("status", resolvedStatus.value(), "items", repo().list(resolvedStatus.value(), boundedLimit));
  }

  private void ensureRequestExists(String requestId) {
    if (!lookup().existsRequest(requestId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }
  }

  private DatasetCandidateRepository repo() {
    DatasetCandidateRepository resolved = repository.getIfAvailable();
    if (resolved == null) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "database_disabled");
    }
    return resolved;
  }

  private SimulationLogLookupRepository lookup() {
    SimulationLogLookupRepository resolved = logLookup.getIfAvailable();
    if (resolved == null) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "database_disabled");
    }
    return resolved;
  }
}
