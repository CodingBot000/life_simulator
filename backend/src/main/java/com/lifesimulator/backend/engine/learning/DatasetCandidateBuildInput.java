package com.lifesimulator.backend.engine.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.evaluation.EvaluationLabelSet;

public record DatasetCandidateBuildInput(
  String requestId,
  JsonNode requestPayload,
  JsonNode responsePayload,
  EvaluationLabelSet labels
) {}
