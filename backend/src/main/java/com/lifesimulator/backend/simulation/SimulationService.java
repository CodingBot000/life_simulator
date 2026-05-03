package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.routing.SimulationRouter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SimulationService {

  private static final List<SimulationStage> STAGES = List.of(
    SimulationStage.STATE_LOADER,
    SimulationStage.PLANNER,
    SimulationStage.SCENARIO_A,
    SimulationStage.SCENARIO_B,
    SimulationStage.RISK_A,
    SimulationStage.RISK_B,
    SimulationStage.AB_REASONING,
    SimulationStage.GUARDRAIL,
    SimulationStage.ADVISOR,
    SimulationStage.REFLECTION
  );

  private final SimulatorProperties properties;
  private final SimulationResponseFactory responseFactory;
  private final SimulationEnvelopeFactory envelopeFactory;
  private final SimulationRouter router;
  private final StageExecutionService stageExecutionService;

  public SimulationService(
    SimulatorProperties properties,
    SimulationResponseFactory responseFactory,
    SimulationEnvelopeFactory envelopeFactory,
    SimulationRouter router,
    StageExecutionService stageExecutionService
  ) {
    this.properties = properties;
    this.responseFactory = responseFactory;
    this.envelopeFactory = envelopeFactory;
    this.router = router;
    this.stageExecutionService = stageExecutionService;
  }

  public String model() {
    return properties.getCodex().getModel();
  }

  public SimulationRunResult run(
    JsonNode request,
    String traceId,
    String locale,
    SimulationProgressWriter progress
  ) throws IOException {
    String requestId = UUID.randomUUID().toString();
    long startedAtMillis = System.currentTimeMillis();
    responseFactory.validateRequest(request);
    BackendRoutingDecision routingDecision = router.route(request, model());
    List<SimulationStage> stages = stageNames(routingDecision);

    write(progress, Map.of("type", "request_started", "request_id", requestId, "trace_id", traceId));
    write(
      progress,
      Map.of(
        "type",
        "routing_resolved",
        "request_id",
        requestId,
        "execution_mode",
        routingDecision.executionMode(),
        "selected_path",
        routingDecision.selectedPath(),
        "skipped_stages",
        skippedStages(routingDecision)
      )
    );

    ObjectNode response = (ObjectNode) responseFactory.deterministicResponse(
      requestId,
      request,
      locale,
      routingDecision
    );
    stageExecutionService.runStages(
      request,
      response,
      requestId,
      traceId,
      locale,
      routingDecision,
      stages,
      progress
    );
    response.put("request_id", requestId);
    return new SimulationRunResult(
      response,
      envelopeFactory.create(request, response, traceId, startedAtMillis, stageNames(stages))
    );
  }

  private List<SimulationStage> stageNames(BackendRoutingDecision routingDecision) {
    List<SimulationStage> stages = new ArrayList<>();
    stages.add(SimulationStage.STATE_LOADER);
    stages.add(SimulationStage.PLANNER);
    if (routingDecision.selectedPath().contains("scenario")) {
      stages.add(SimulationStage.SCENARIO_A);
      stages.add(SimulationStage.SCENARIO_B);
    }
    if (routingDecision.selectedPath().contains("risk")) {
      stages.add(SimulationStage.RISK_A);
      stages.add(SimulationStage.RISK_B);
    }
    if (routingDecision.selectedPath().contains("ab_reasoning")) {
      stages.add(SimulationStage.AB_REASONING);
    }
    if (routingDecision.selectedPath().contains("guardrail")) {
      stages.add(SimulationStage.GUARDRAIL);
      stages.add(SimulationStage.ADVISOR);
    } else {
      stages.add(SimulationStage.ADVISOR);
      stages.add(SimulationStage.GUARDRAIL);
    }
    if (routingDecision.selectedPath().contains("reflection")) {
      stages.add(SimulationStage.REFLECTION);
    }
    return stages;
  }

  private List<String> skippedStages(BackendRoutingDecision routingDecision) {
    List<String> selectedStageNames = stageNames(stageNames(routingDecision));
    return STAGES.stream()
      .map(SimulationStage::stageName)
      .filter(stage -> !selectedStageNames.contains(stage))
      .toList();
  }

  private void write(SimulationProgressWriter progress, Object event) throws IOException {
    if (progress != null) {
      progress.write(event);
    }
  }

  private List<String> stageNames(List<SimulationStage> stages) {
    return stages.stream().map(SimulationStage::stageName).toList();
  }
}
