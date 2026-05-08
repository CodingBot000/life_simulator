package com.lifesimulator.backend.engine;

import com.lifesimulator.backend.engine.contract.DecisionEngineOptions;
import com.lifesimulator.backend.engine.contract.DecisionEngineRequest;
import com.lifesimulator.backend.engine.contract.DecisionEngineResult;
import com.lifesimulator.backend.simulation.SimulationProgressWriter;
import java.io.IOException;

public interface DecisionEngine {
  DecisionEngineResult run(
    DecisionEngineRequest request,
    DecisionEngineOptions options,
    SimulationProgressWriter progress
  ) throws IOException;

  String model();
}
