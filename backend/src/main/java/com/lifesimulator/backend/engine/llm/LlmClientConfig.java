package com.lifesimulator.backend.engine.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration
public class LlmClientConfig {

  @Bean
  public LlmJsonClient llmJsonClient(
    CodexCliClient codexCliClient,
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    Environment environment
  ) {
    return switch (resolveProvider(properties, environment)) {
      case CODEX -> new CodexCliJsonClient(codexCliClient, properties);
      case OPENAI -> new OpenAiJsonClient(objectMapper, properties);
    };
  }

  private SimulatorProperties.LlmProvider resolveProvider(
    SimulatorProperties properties,
    Environment environment
  ) {
    if (environment.acceptsProfiles(Profiles.of("remote"))) {
      return SimulatorProperties.LlmProvider.OPENAI;
    }
    return properties.getLlmProvider();
  }
}
