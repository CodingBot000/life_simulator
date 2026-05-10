package com.lifesimulator.backend.engine.evaluation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record EvaluationEvent(
  String requestId,
  String traceId,
  String userId,
  String sessionId,
  DecisionEvaluationTarget target,
  String targetOption,
  FeedbackSignal signal,
  Integer rating,
  List<String> reasonTags,
  String comment,
  JsonNode metadata
) {}
