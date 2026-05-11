package com.lifesimulator.backend.outcome;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record OutcomeFollowupRequest(
  String requestId,
  String actualChoice,
  Integer satisfactionScore,
  Integer regretScore,
  String outcomeNote,
  List<String> unexpectedFactors,
  Integer horizonDays,
  JsonNode metadata
) {}
