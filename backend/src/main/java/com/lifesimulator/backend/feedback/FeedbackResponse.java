package com.lifesimulator.backend.feedback;

public record FeedbackResponse(
  String feedbackId,
  String requestId,
  String targetType,
  String feedbackSignal,
  Integer rating,
  String createdAt,
  String updatedAt
) {}
