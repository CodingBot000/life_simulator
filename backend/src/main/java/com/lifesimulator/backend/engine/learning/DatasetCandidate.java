package com.lifesimulator.backend.engine.learning;

import com.fasterxml.jackson.databind.JsonNode;

public record DatasetCandidate(
  String candidateId,
  String requestId,
  DatasetCandidateType type,
  String source,
  JsonNode inputPayload,
  JsonNode expectedPayload,
  JsonNode actualPayload,
  JsonNode labelPayload,
  Double qualityScore,
  DatasetCandidateStatus status
) {}
