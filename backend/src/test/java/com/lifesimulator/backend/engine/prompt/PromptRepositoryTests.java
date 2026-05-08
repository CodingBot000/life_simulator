package com.lifesimulator.backend.engine.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.engine.domain.life.prompt.LifePromptPack;
import com.lifesimulator.backend.simulation.SimulationStage;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

class PromptRepositoryTests {

  @Test
  void loadsLifePromptPackBeforeRootFallback() {
    PromptRepository repository = new PromptRepository(
      new DefaultResourceLoader(),
      new LifePromptPack()
    );

    assertThat(repository.promptFor(SimulationStage.PLANNER))
      .contains("Planner Agent")
      .contains("출력 JSON 형식");
  }
}
