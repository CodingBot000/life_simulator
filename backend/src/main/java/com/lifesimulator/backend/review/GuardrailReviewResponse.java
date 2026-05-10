package com.lifesimulator.backend.review;

public record GuardrailReviewResponse(
  String reviewId,
  String requestId,
  String reviewLabel,
  String correctMode,
  String createdAt
) {}
