package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.llm.LlmJsonRequest;
import com.lifesimulator.backend.engine.llm.LlmJsonClient;
import com.lifesimulator.backend.engine.llm.LlmJsonResult;
import org.junit.jupiter.api.Test;

class MetricsControllerTests {

  @Test
  void metricsExposeActiveProviderAndModel() {
    MetricsController controller = new MetricsController(new StaticLlmClient());

    assertThat(controller.metrics())
      .contains("provider=\"openai\"")
      .contains("model=\"gpt-5-nano\"");
  }

  private static class StaticLlmClient implements LlmJsonClient {
    @Override
    public LlmJsonResult completeJson(LlmJsonRequest request) {
      return LlmJsonResult.of(new ObjectMapper().createObjectNode(), modelName());
    }

    @Override
    public String providerName() {
      return "openai";
    }

    @Override
    public String modelName() {
      return "gpt-5-nano";
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
