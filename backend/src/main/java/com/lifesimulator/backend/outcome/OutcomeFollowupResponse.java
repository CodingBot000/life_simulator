package com.lifesimulator.backend.outcome;

public record OutcomeFollowupResponse(
  String followupId,
  String requestId,
  String actualChoice,
  Integer satisfactionScore,
  Integer regretScore,
  String createdAt,
  String updatedAt
) {}
