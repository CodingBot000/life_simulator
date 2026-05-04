package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LlmClientConfig {

  @Bean
  public LlmJsonClient llmJsonClient(
    CodexCliClient codexCliClient,
    ObjectMapper objectMapper,
    SimulatorProperties properties
  ) {
    return switch (properties.getLlmProvider()) {
      case CODEX -> new CodexCliJsonClient(codexCliClient, properties);
      case OPENAI -> new OpenAiJsonClient(objectMapper, properties);
      case MOCK -> new MockJsonClient(properties);
    };
  }
}
