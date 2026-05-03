package com.lifesimulator.backend.simulation;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

@Component
public class StagePromptRepository {

  private final Map<String, String> cache = new ConcurrentHashMap<>();
  private final ResourceLoader resourceLoader;

  public StagePromptRepository(ResourceLoader resourceLoader) {
    this.resourceLoader = resourceLoader;
  }

  public String promptFor(SimulationStage stage) {
    return cache.computeIfAbsent(stage.promptFile(), this::loadPrompt);
  }

  private String loadPrompt(String fileName) {
    try {
      var resource = resourceLoader.getResource("classpath:prompts/" + fileName);
      try (var input = resource.getInputStream()) {
        return new String(input.readAllBytes(), StandardCharsets.UTF_8).trim();
      }
    } catch (IOException error) {
      throw new IllegalStateException("Failed to load stage prompt: " + fileName, error);
    }
  }
}
