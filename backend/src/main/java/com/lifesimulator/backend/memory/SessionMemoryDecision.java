package com.lifesimulator.backend.memory;

public record SessionMemoryDecision(
  String id,
  String createdAt,
  String topic,
  String selected_option,
  String outcome_note,
  String sourceRequestId,
  String sourceCaseId
) {}
