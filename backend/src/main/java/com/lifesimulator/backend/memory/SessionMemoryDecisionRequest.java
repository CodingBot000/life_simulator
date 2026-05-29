package com.lifesimulator.backend.memory;

public record SessionMemoryDecisionRequest(
  String id,
  String topic,
  String selected_option,
  String outcome_note,
  String sourceRequestId,
  String sourceCaseId
) {}
