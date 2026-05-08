package com.lifesimulator.backend.engine.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.logging.SimulationExecutionEnvelope;

public record DecisionEngineResult(
  JsonNode response,
  SimulationExecutionEnvelope envelope
) {}
