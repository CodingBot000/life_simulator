package com.lifesimulator.backend.engine.domain.life.prompt;

import com.lifesimulator.backend.engine.prompt.PromptPack;
import com.lifesimulator.backend.simulation.SimulationStage;
import org.springframework.stereotype.Component;

@Component
public class LifePromptPack implements PromptPack {

  @Override
  public String promptPathFor(SimulationStage stage) {
    return "prompts/life/" + stage.promptFile();
  }

  @Override
  public String fallbackPromptPathFor(SimulationStage stage) {
    return "prompts/" + stage.promptFile();
  }
}
