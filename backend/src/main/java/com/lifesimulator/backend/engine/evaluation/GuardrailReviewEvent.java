package com.lifesimulator.backend.engine.evaluation;

import java.util.List;

public record GuardrailReviewEvent(
  String requestId,
  String traceId,
  String userId,
  String sessionId,
  String reviewerType,
  GuardrailReviewLabel reviewLabel,
  String correctMode,
  List<String> reasonTags,
  String comment
) {}
