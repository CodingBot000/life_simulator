package com.lifesimulator.backend.feedback;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record FeedbackRequest(
  String requestId,
  String targetType,
  String targetOption,
  String feedbackSignal,
  Integer rating,
  List<String> reasonTags,
  String comment,
  JsonNode metadata
) {}
