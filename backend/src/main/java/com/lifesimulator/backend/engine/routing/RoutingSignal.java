package com.lifesimulator.backend.engine.routing;

public record RoutingSignal(
  String riskBand,
  String complexity,
  String ambiguity,
  int stateUnknownCount,
  int contextLength
) {}
