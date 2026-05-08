package com.lifesimulator.backend.engine.prompt;

import com.lifesimulator.backend.simulation.SimulationStage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

@Component
public class PromptRepository {

  private final Map<String, String> cache = new ConcurrentHashMap<>();
  private final PromptPack promptPack;
  private final ResourceLoader resourceLoader;

  public PromptRepository(ResourceLoader resourceLoader, PromptPack promptPack) {
    this.resourceLoader = resourceLoader;
    this.promptPack = promptPack;
  }

  public String promptFor(SimulationStage stage) {
    String primaryPath = promptPack.promptPathFor(stage);
    return cache.computeIfAbsent(primaryPath, ignored -> loadPrompt(stage));
  }

  private String loadPrompt(SimulationStage stage) {
    Resource primary = resourceLoader.getResource("classpath:" + promptPack.promptPathFor(stage));
    if (primary.exists()) {
      return read(primary, promptPack.promptPathFor(stage));
    }
    String fallbackPath = promptPack.fallbackPromptPathFor(stage);
    return read(resourceLoader.getResource("classpath:" + fallbackPath), fallbackPath);
  }

  private String read(Resource resource, String path) {
    try (var input = resource.getInputStream()) {
      return new String(input.readAllBytes(), StandardCharsets.UTF_8).trim();
    } catch (IOException error) {
      throw new IllegalStateException("Failed to load stage prompt: " + path, error);
    }
  }
}
