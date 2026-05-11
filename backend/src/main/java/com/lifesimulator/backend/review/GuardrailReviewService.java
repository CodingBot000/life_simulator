package com.lifesimulator.backend.review;

import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewLabel;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuardrailReviewService {

  private static final int MAX_COMMENT_LENGTH = 2_000;

  private final ObjectProvider<GuardrailReviewRepository> repository;
  private final ObjectProvider<SimulationLogLookupRepository> logLookup;
  private final LifeFeedbackLabelMapper labelMapper;

  public GuardrailReviewService(
    ObjectProvider<GuardrailReviewRepository> repository,
    ObjectProvider<SimulationLogLookupRepository> logLookup,
    LifeFeedbackLabelMapper labelMapper
  ) {
    this.repository = repository;
    this.logLookup = logLookup;
    this.labelMapper = labelMapper;
  }

  public GuardrailReviewResponse create(GuardrailReviewRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    GuardrailReviewLabel label = labelMapper.guardrailReviewLabelFor(request.reviewLabel());
    String requestId = request.requestId().trim();
    return repo().insert(
      new GuardrailReviewRepository.GuardrailReviewRow(
        "grv_" + UUID.randomUUID(),
        requestId,
        lookup().traceIdFor(requestId),
        null,
        sessionId,
        request.reviewerType().trim(),
        label.value(),
        trimOptional(request.correctMode()),
        listOrEmpty(request.reasonTags()),
        trimOptional(request.comment())
      )
    );
  }

  private void validate(GuardrailReviewRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Guardrail review request is required.");
    }
    requireText(request.requestId(), "requestId");
    requireText(request.reviewerType(), "reviewerType");
    requireText(request.reviewLabel(), "reviewLabel");
    if (request.comment() != null && request.comment().length() > MAX_COMMENT_LENGTH) {
      throw new IllegalArgumentException("comment is too long.");
    }
  }

  private void ensureRequestExists(String requestId) {
    if (!lookup().existsRequest(requestId.trim())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }
  }

  private GuardrailReviewRepository repo() {
    GuardrailReviewRepository resolved = repository.getIfAvailable();
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

  private List<String> listOrEmpty(List<String> values) {
    return values == null ? List.of() : values.stream().filter(value -> value != null && !value.isBlank()).toList();
  }

  private String trimOptional(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
