package com.lifesimulator.backend.simulation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.guardrail.GuardrailEvaluationService;
import com.lifesimulator.backend.llm.LlmClientException;
import com.lifesimulator.backend.llm.LlmJsonClient;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StageExecutionServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void missingOpenAiApiKeyBypassesFallback() {
    StageExecutionService service = serviceWithClient(new MissingCredentialClient());
    ObjectNode response = fallbackResponse();

    assertThatThrownBy(() ->
      service.runStages(
        request(),
        response,
        "request-1",
        "trace-1",
        "ko",
        routingDecision(),
        List.of(SimulationStage.STATE_LOADER),
        null
      )
    )
      .isInstanceOf(LlmClientException.class)
      .hasMessageContaining("OpenAI API key is required");
  }

  @Test
  void providerErrorFallsBackWhenFallbackIsEnabled() throws IOException {
    StageExecutionService service = serviceWithClient(new FallbackEnabledFailureClient());
    ObjectNode response = fallbackResponse();

    service.runStages(
      request(),
      response,
      "request-1",
      "trace-1",
      "ko",
      routingDecision(),
      List.of(SimulationStage.STATE_LOADER),
      null
    );

    assertThat(response.path("stateContext").path("summary").asText()).isEqualTo("fallback");
  }

  private StageExecutionService serviceWithClient(LlmJsonClient client) {
    StagePromptRepository promptRepository = mock(StagePromptRepository.class);
    when(promptRepository.promptFor(SimulationStage.STATE_LOADER)).thenReturn("Stage prompt");

    return new StageExecutionService(
      mock(GuardrailEvaluationService.class),
      new JsonSchemaBuilder(objectMapper),
      client,
      objectMapper,
      new StageInputFactory(objectMapper),
      promptRepository
    );
  }

  private ObjectNode fallbackResponse() {
    ObjectNode response = objectMapper.createObjectNode();
    response.putObject("stateContext").put("summary", "fallback");
    return response;
  }

  private ObjectNode request() {
    ObjectNode request = objectMapper.createObjectNode();
    ObjectNode decision = request.putObject("decision");
    decision.put("optionA", "A");
    decision.put("optionB", "B");
    return request;
  }

  private BackendRoutingDecision routingDecision() {
    return new BackendRoutingDecision(
      "standard",
      List.of("state_loader"),
      Map.of("state_loader", "test-model"),
      Map.of(),
      List.of(),
      "low",
      "low",
      "low",
      0,
      100
    );
  }

  private static class MissingCredentialClient implements LlmJsonClient {
    @Override
    public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
      throw new LlmClientException(
        "OpenAI API key is required when SIMULATOR_LLM_PROVIDER=openai."
      );
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

  private static class FallbackEnabledFailureClient implements LlmJsonClient {
    @Override
    public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
      throw new LlmClientException("Temporary provider outage.");
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
