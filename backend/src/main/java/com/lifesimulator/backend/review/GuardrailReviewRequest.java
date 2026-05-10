package com.lifesimulator.backend.review;

import java.util.List;

public record GuardrailReviewRequest(
  String requestId,
  String reviewerType,
  String reviewLabel,
  String correctMode,
  List<String> reasonTags,
  String comment
) {}
