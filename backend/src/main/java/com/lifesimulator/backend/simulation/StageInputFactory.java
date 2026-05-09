package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.domain.life.mapping.LifeRequestToGenericDecisionMapper;
import com.lifesimulator.backend.engine.domain.life.prompt.LifeOptionSelector;
import com.lifesimulator.backend.engine.domain.life.prompt.LifeStageInputMapper;
import com.lifesimulator.backend.engine.prompt.StageInputMapper;
import com.lifesimulator.backend.routing.BackendRoutingDecision;

public class StageInputFactory implements StageInputMapper {

  private final StageInputMapper delegate;

  public StageInputFactory(ObjectMapper objectMapper) {
    this(
      new LifeStageInputMapper(
        objectMapper,
        new LifeOptionSelector(),
        new LifeRequestToGenericDecisionMapper(objectMapper)
      )
    );
  }

  public StageInputFactory(StageInputMapper delegate) {
    this.delegate = delegate;
  }

  @Override
  public JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  ) {
    return delegate.inputFor(stage, requestId, locale, request, response, routingDecision);
  }
}
