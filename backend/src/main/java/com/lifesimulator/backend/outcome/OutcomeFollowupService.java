package com.lifesimulator.backend.outcome;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeEvaluationTargetMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OutcomeFollowupService {

  private static final int MAX_NOTE_LENGTH = 2_000;

  private final ObjectMapper objectMapper;
  private final ObjectProvider<OutcomeFollowupRepository> repository;
  private final ObjectProvider<SimulationLogLookupRepository> logLookup;
  private final LifeEvaluationTargetMapper targetMapper;

  public OutcomeFollowupService(
    ObjectMapper objectMapper,
    ObjectProvider<OutcomeFollowupRepository> repository,
    ObjectProvider<SimulationLogLookupRepository> logLookup,
    LifeEvaluationTargetMapper targetMapper
  ) {
    this.objectMapper = objectMapper;
    this.repository = repository;
    this.logLookup = logLookup;
    this.targetMapper = targetMapper;
  }

  public OutcomeFollowupResponse create(OutcomeFollowupRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    return repo().insert(row("out_" + UUID.randomUUID(), request, sessionId));
  }

  public OutcomeFollowupResponse update(String followupId, OutcomeFollowupRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    OutcomeFollowupResponse response = repo().update(followupId, row(followupId, request, sessionId));
    if (response == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "outcome_followup_not_found");
    }
    return response;
  }

  private OutcomeFollowupRepository.OutcomeFollowupRow row(
    String followupId,
    OutcomeFollowupRequest request,
    String sessionId
  ) {
    String requestId = request.requestId().trim();
    return new OutcomeFollowupRepository.OutcomeFollowupRow(
      followupId,
      requestId,
      lookup().traceIdFor(requestId),
      null,
      sessionId,
      targetMapper.optionIdFor(request.actualChoice()),
      request.satisfactionScore(),
      request.regretScore(),
      trimOptional(request.outcomeNote()),
      listOrEmpty(request.unexpectedFactors()),
      request.horizonDays() == null ? 0 : Math.max(0, request.horizonDays()),
      request.metadata() == null ? objectMapper.createObjectNode() : request.metadata()
    );
  }

  private void validate(OutcomeFollowupRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Outcome followup request is required.");
    }
    requireText(request.requestId(), "requestId");
    requireText(request.actualChoice(), "actualChoice");
    validateChoice(request.actualChoice());
    validateScore(request.satisfactionScore(), "satisfactionScore");
    validateScore(request.regretScore(), "regretScore");
    if (request.outcomeNote() != null && request.outcomeNote().length() > MAX_NOTE_LENGTH) {
      throw new IllegalArgumentException("outcomeNote is too long.");
    }
  }

  private void validateChoice(String value) {
    String normalized = targetMapper.optionIdFor(value);
    if (!List.of("A", "B", "undecided", "other").contains(normalized)) {
      throw new IllegalArgumentException("actualChoice must be A, B, undecided, or other.");
    }
  }

  private void ensureRequestExists(String requestId) {
    if (!lookup().existsRequest(requestId.trim())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }
  }

  private OutcomeFollowupRepository repo() {
    OutcomeFollowupRepository resolved = repository.getIfAvailable();
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

  private void requireText(String value, String field) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(field + " is required.");
    }
  }

  private void validateScore(Integer value, String field) {
    if (value != null && (value < 1 || value > 5)) {
      throw new IllegalArgumentException(field + " must be between 1 and 5.");
    }
  }

  private List<String> listOrEmpty(List<String> values) {
    return values == null ? List.of() : values.stream().filter(value -> value != null && !value.isBlank()).toList();
  }

  private String trimOptional(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
