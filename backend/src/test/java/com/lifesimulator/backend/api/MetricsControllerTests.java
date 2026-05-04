package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.llm.LlmJsonClient;
import org.junit.jupiter.api.Test;

class MetricsControllerTests {

  @Test
  void metricsExposeActiveProviderAndModel() {
    MetricsController controller = new MetricsController(new StaticLlmClient());

    assertThat(controller.metrics())
      .contains("provider=\"openai\"")
      .contains("model=\"gpt-5.3\"");
  }

  private static class StaticLlmClient implements LlmJsonClient {
    @Override
    public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
      return new ObjectMapper().createObjectNode();
    }

    @Override
    public String providerName() {
      return "openai";
    }

    @Override
    public String modelName() {
      return "gpt-5.3";
    }

    @Override
    public boolean enabled() {
      return true;
    }

    @Override
    public boolean fallbackOnError() {
      return true;
    }
  }
}
