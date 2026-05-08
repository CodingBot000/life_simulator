package com.lifesimulator.backend.routing;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.domain.life.routing.LifeRoutingSignalExtractor;
import com.lifesimulator.backend.engine.routing.DecisionRoutingPolicy;
import com.lifesimulator.backend.engine.routing.ExecutionPath;
import com.lifesimulator.backend.engine.routing.RoutingSignal;
import org.springframework.stereotype.Component;

@Component
public class SimulationRouter {

  private final LifeRoutingSignalExtractor signalExtractor;
  private final DecisionRoutingPolicy routingPolicy;

  public SimulationRouter(
    LifeRoutingSignalExtractor signalExtractor,
    DecisionRoutingPolicy routingPolicy
  ) {
    this.signalExtractor = signalExtractor;
    this.routingPolicy = routingPolicy;
  }

  public BackendRoutingDecision route(JsonNode request, String model) {
    RoutingSignal signal = signalExtractor.extract(request);
    ExecutionPath path = routingPolicy.route(signal, model);

    return new BackendRoutingDecision(
      path.executionMode().value(),
      path.selectedPath(),
      path.stageModelPlan(),
      path.stageFallbackPlan(),
      path.reasons(),
      signal.riskBand(),
      signal.complexity(),
      signal.ambiguity(),
      signal.stateUnknownCount(),
      path.estimatedTokens()
    );
  }
}
