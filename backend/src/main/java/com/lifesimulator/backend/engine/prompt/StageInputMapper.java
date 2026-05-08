package com.lifesimulator.backend.engine.prompt;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.simulation.SimulationStage;

public interface StageInputMapper {
  JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  );
}
