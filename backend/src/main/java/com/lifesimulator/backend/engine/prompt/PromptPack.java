package com.lifesimulator.backend.engine.prompt;

import com.lifesimulator.backend.simulation.SimulationStage;

public interface PromptPack {
  String promptPathFor(SimulationStage stage);

  String fallbackPromptPathFor(SimulationStage stage);
}
