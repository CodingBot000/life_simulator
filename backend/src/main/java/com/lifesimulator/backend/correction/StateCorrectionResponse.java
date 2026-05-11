package com.lifesimulator.backend.correction;

public record StateCorrectionResponse(
  String correctionId,
  String requestId,
  String fieldPath,
  String correctionType,
  String createdAt
) {}
