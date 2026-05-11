package com.lifesimulator.backend.correction;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StateCorrectionService {

  private static final int MAX_COMMENT_LENGTH = 2_000;

  private final ObjectMapper objectMapper;
  private final ObjectProvider<StateCorrectionRepository> repository;
  private final ObjectProvider<SimulationLogLookupRepository> logLookup;
  private final LifeFeedbackLabelMapper labelMapper;

  public StateCorrectionService(
    ObjectMapper objectMapper,
    ObjectProvider<StateCorrectionRepository> repository,
    ObjectProvider<SimulationLogLookupRepository> logLookup,
    LifeFeedbackLabelMapper labelMapper
  ) {
    this.objectMapper = objectMapper;
    this.repository = repository;
    this.logLookup = logLookup;
    this.labelMapper = labelMapper;
  }

  public StateCorrectionResponse create(StateCorrectionRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    String requestId = request.requestId().trim();
    return repo().insert(
      new StateCorrectionRepository.StateCorrectionRow(
        "corr_" + UUID.randomUUID(),
        requestId,
        lookup().traceIdFor(requestId),
        null,
        sessionId,
        request.fieldPath().trim(),
        request.originalValue(),
        request.correctedValue(),
        request.correctionType().trim(),
        trimOptional(request.comment())
      )
    );
  }

  private void validate(StateCorrectionRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("State correction request is required.");
    }
    requireText(request.requestId(), "requestId");
    requireText(request.fieldPath(), "fieldPath");
    requireText(request.correctionType(), "correctionType");
    if (!labelMapper.isSupportedStatePath(request.fieldPath())) {
      throw new IllegalArgumentException("fieldPath is not supported.");
    }
    if (request.correctedValue() == null || request.correctedValue().isMissingNode()) {
      throw new IllegalArgumentException("correctedValue is required.");
    }
    if (request.comment() != null && request.comment().length() > MAX_COMMENT_LENGTH) {
      throw new IllegalArgumentException("comment is too long.");
    }
  }

  private void ensureRequestExists(String requestId) {
    if (!lookup().existsRequest(requestId.trim())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }
  }

  private StateCorrectionRepository repo() {
    StateCorrectionRepository resolved = repository.getIfAvailable();
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

  private String trimOptional(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
