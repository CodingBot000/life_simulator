package com.lifesimulator.backend.simulation;

import com.lifesimulator.backend.engine.prompt.PromptRepository;
import org.springframework.stereotype.Component;

@Component
public class StagePromptRepository {

  private final PromptRepository promptRepository;

  public StagePromptRepository(PromptRepository promptRepository) {
    this.promptRepository = promptRepository;
  }

  public String promptFor(SimulationStage stage) {
    return promptRepository.promptFor(stage);
  }
}
