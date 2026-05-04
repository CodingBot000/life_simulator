package com.lifesimulator.backend.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import org.junit.jupiter.api.Test;

class LlmClientConfigTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void selectsCodexProviderByDefault() {
    SimulatorProperties properties = new SimulatorProperties();
    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(new CodexCliClient(objectMapper, properties), objectMapper, properties);

    assertThat(client.providerName()).isEqualTo("codex");
    assertThat(client.modelName()).isEqualTo("gpt-5.3-codex-spark");
  }

  @Test
  void selectsMockProvider() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.setLlmProvider(SimulatorProperties.LlmProvider.MOCK);
    properties.getMock().setModel("test-mock");

    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(new CodexCliClient(objectMapper, properties), objectMapper, properties);

    assertThat(client.providerName()).isEqualTo("mock");
    assertThat(client.modelName()).isEqualTo("test-mock");
  }

  @Test
  void selectsOpenAiProviderAndFailsClearlyWithoutApiKey() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.setLlmProvider(SimulatorProperties.LlmProvider.OPENAI);
    properties.getOpenai().setApiKey("");

    LlmJsonClient client = new LlmClientConfig()
      .llmJsonClient(new CodexCliClient(objectMapper, properties), objectMapper, properties);

    assertThat(client.providerName()).isEqualTo("openai");
    assertThatThrownBy(() ->
      client.completeJson("Return JSON.", objectMapper.createObjectNode(), objectMapper.createObjectNode())
    )
      .isInstanceOf(LlmClientException.class)
      .hasMessageContaining("OpenAI API key is required");
  }
}
