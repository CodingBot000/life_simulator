package com.lifesimulator.backend.engine.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class LlmClientConfigTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void selectsCodexProviderByDefault() {
    SimulatorProperties properties = new SimulatorProperties();
    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(
        new CodexCliClient(objectMapper, properties),
        objectMapper,
        properties,
        environment()
      );

    assertThat(client.providerName()).isEqualTo("codex");
    assertThat(client.modelName()).isEqualTo("gpt-5.3-codex-spark");
  }

  @Test
  void selectsOpenAiProviderAndFailsClearlyWithoutApiKey() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.setLlmProvider(SimulatorProperties.LlmProvider.OPENAI);
    properties.getOpenai().setApiKey("");

    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(
        new CodexCliClient(objectMapper, properties),
        objectMapper,
        properties,
        environment()
      );

    assertThat(client.providerName()).isEqualTo("openai");
    assertThatThrownBy(() ->
      client.completeJson(
        new LlmJsonRequest(
          "planner",
          "Return JSON.",
          objectMapper.createObjectNode(),
          objectMapper.createObjectNode()
        )
      )
    )
      .isInstanceOf(LlmClientException.class)
      .hasMessageContaining("OpenAI API key is required");
  }

  @Test
  void remoteProfileForcesOpenAiProvider() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.setLlmProvider(SimulatorProperties.LlmProvider.CODEX);

    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(
        new CodexCliClient(objectMapper, properties),
        objectMapper,
        properties,
        environment("remote")
      );

    assertThat(client.providerName()).isEqualTo("openai");
    assertThat(client.modelName()).isEqualTo(properties.getOpenai().getModel());
  }

  private MockEnvironment environment(String... activeProfiles) {
    MockEnvironment environment = new MockEnvironment();
    environment.setActiveProfiles(activeProfiles);
    return environment;
  }
}
