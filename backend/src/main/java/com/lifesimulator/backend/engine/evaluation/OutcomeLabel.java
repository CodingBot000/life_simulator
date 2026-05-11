package com.lifesimulator.backend.engine.evaluation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record OutcomeLabel(
  String requestId,
  String traceId,
  String userId,
  String sessionId,
  String actualChoice,
  Integer satisfactionScore,
  Integer regretScore,
  String outcomeNote,
  List<String> unexpectedFactors,
  int horizonDays,
  JsonNode metadata
) {}
