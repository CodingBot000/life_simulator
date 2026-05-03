package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.logging.SimulationExecutionEnvelope;

public record SimulationRunResult(JsonNode response, SimulationExecutionEnvelope envelope) {}
