package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.domain.life.contract.LifeDecisionRequestValidator;
import com.lifesimulator.backend.engine.domain.life.response.LifeResponseMerger;
import com.lifesimulator.backend.engine.domain.life.response.LifeResponseSchemaFactory;
import com.lifesimulator.backend.engine.domain.life.response.LifeSimulationSeedFactory;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import org.springframework.stereotype.Component;

@Component
public class SimulationResponseFactory {

  private final LifeDecisionRequestValidator requestValidator;
  private final LifeResponseMerger responseMerger;
  private final LifeResponseSchemaFactory schemaFactory;
  private final LifeSimulationSeedFactory seedFactory;

  public SimulationResponseFactory(
    LifeDecisionRequestValidator requestValidator,
    LifeResponseMerger responseMerger,
    LifeResponseSchemaFactory schemaFactory,
    LifeSimulationSeedFactory seedFactory
  ) {
    this.requestValidator = requestValidator;
    this.responseMerger = responseMerger;
    this.schemaFactory = schemaFactory;
    this.seedFactory = seedFactory;
  }

  public void validateRequest(JsonNode request) {
    requestValidator.validate(request);
  }

  public JsonNode deterministicResponse(
    String requestId,
    JsonNode request,
    String locale,
    BackendRoutingDecision routingDecision
  ) {
    return seedFactory.deterministicResponse(requestId, request, locale, routingDecision);
  }

  public JsonNode mergeGenerated(JsonNode deterministic, JsonNode generated, String requestId) {
    return responseMerger.mergeGenerated(deterministic, generated, requestId);
  }

  public JsonNode outputSchema() {
    return schemaFactory.outputSchema();
  }
}
