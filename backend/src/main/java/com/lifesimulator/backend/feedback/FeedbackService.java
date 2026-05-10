package com.lifesimulator.backend.feedback;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeEvaluationTargetMapper;
import com.lifesimulator.backend.engine.domain.life.evaluation.LifeFeedbackLabelMapper;
import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import com.lifesimulator.backend.engine.evaluation.FeedbackSignal;
import com.lifesimulator.backend.logging.SimulationLogLookupRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FeedbackService {

  private static final int MAX_COMMENT_LENGTH = 2_000;

  private final ObjectMapper objectMapper;
  private final ObjectProvider<FeedbackRepository> repository;
  private final ObjectProvider<SimulationLogLookupRepository> logLookup;
  private final LifeEvaluationTargetMapper targetMapper;
  private final LifeFeedbackLabelMapper labelMapper;

  public FeedbackService(
    ObjectMapper objectMapper,
    ObjectProvider<FeedbackRepository> repository,
    ObjectProvider<SimulationLogLookupRepository> logLookup,
    LifeEvaluationTargetMapper targetMapper,
    LifeFeedbackLabelMapper labelMapper
  ) {
    this.objectMapper = objectMapper;
    this.repository = repository;
    this.logLookup = logLookup;
    this.targetMapper = targetMapper;
    this.labelMapper = labelMapper;
  }

  public FeedbackResponse create(FeedbackRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    DecisionEvaluationTarget target = targetMapper.targetFor(request.targetType());
    FeedbackSignal signal = labelMapper.feedbackSignalFor(request.feedbackSignal());
    return repo().insert(row("fb_" + UUID.randomUUID(), request, sessionId, target, signal));
  }

  public FeedbackResponse update(String feedbackId, FeedbackRequest request, String sessionId) {
    validate(request);
    ensureRequestExists(request.requestId());
    DecisionEvaluationTarget target = targetMapper.targetFor(request.targetType());
    FeedbackSignal signal = labelMapper.feedbackSignalFor(request.feedbackSignal());
    FeedbackResponse response = repo().update(feedbackId, row(feedbackId, request, sessionId, target, signal));
    if (response == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "feedback_not_found");
    }
    return response;
  }

  public Map<String, Object> summary(String requestId) {
    requireText(requestId, "requestId");
    ensureRequestExists(requestId);
    return Map.of("requestId", requestId, "items", repo().summary(requestId));
  }

  private FeedbackRepository.FeedbackRow row(
    String feedbackId,
    FeedbackRequest request,
    String sessionId,
    DecisionEvaluationTarget target,
    FeedbackSignal signal
  ) {
    return new FeedbackRepository.FeedbackRow(
      feedbackId,
      request.requestId().trim(),
      lookup().traceIdFor(request.requestId().trim()),
      null,
      sessionId,
      target.value(),
      targetMapper.optionIdFor(request.targetOption()),
      signal.value(),
      request.rating(),
      listOrEmpty(request.reasonTags()),
      trimOptional(request.comment()),
      request.metadata() == null ? objectMapper.createObjectNode() : request.metadata()
    );
  }

  private void validate(FeedbackRequest request) {
    if (request == null) {
      throw new IllegalArgumentException("Feedback request is required.");
    }
    requireText(request.requestId(), "requestId");
    requireText(request.targetType(), "targetType");
    requireText(request.feedbackSignal(), "feedbackSignal");
    validateScore(request.rating(), "rating");
    validateComment(request.comment());
  }

  private void ensureRequestExists(String requestId) {
    if (!lookup().existsRequest(requestId.trim())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "request_not_found");
    }
  }

  private FeedbackRepository repo() {
    FeedbackRepository resolved = repository.getIfAvailable();
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

  private void validateComment(String value) {
    if (value != null && value.length() > MAX_COMMENT_LENGTH) {
      throw new IllegalArgumentException("comment is too long.");
    }
  }

  private List<String> listOrEmpty(List<String> values) {
    return values == null ? List.of() : values.stream().filter(value -> value != null && !value.isBlank()).toList();
  }

  private String trimOptional(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
