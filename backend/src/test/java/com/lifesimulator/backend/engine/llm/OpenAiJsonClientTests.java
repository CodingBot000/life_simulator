package com.lifesimulator.backend.engine.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import org.junit.jupiter.api.Test;

class OpenAiJsonClientTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void payloadUsesStageProfileForGpt5NanoCostOptimizedCalls() {
    OpenAiJsonClient client = new OpenAiJsonClient(objectMapper, new SimulatorProperties());
    ObjectNode schema = objectMapper.createObjectNode();
    schema.put("type", "object");

    ObjectNode payload = client.payload(
      new LlmJsonRequest("advisor", "Prompt", schema, objectMapper.createObjectNode())
    );

    assertThat(payload.path("model").asText()).isEqualTo("gpt-5-nano");
    assertThat(payload.at("/reasoning/effort").asText()).isEqualTo("low");
    assertThat(payload.at("/text/verbosity").asText()).isEqualTo("medium");
    assertThat(payload.path("max_output_tokens").asInt()).isEqualTo(1800);
    assertThat(payload.path("prompt_cache_key").asText()).isEqualTo("life-sim:v1:advisor");
    assertThat(payload.path("prompt_cache_retention").asText()).isEqualTo("in_memory");
    assertThat(payload.at("/text/format/type").asText()).isEqualTo("json_schema");
    assertThat(payload.at("/text/format/strict").asBoolean()).isTrue();
  }

  @Test
  void usageEstimatesGpt5NanoCostWithCachedInputTokens() throws Exception {
    OpenAiJsonClient client = new OpenAiJsonClient(objectMapper, new SimulatorProperties());
    var response = objectMapper.readTree(
      """
        {
          "usage": {
            "input_tokens": 2000,
            "output_tokens": 500,
            "total_tokens": 2500,
            "input_tokens_details": {
              "cached_tokens": 1500
            }
          }
        }
        """
    );

    LlmUsage usage = client.usage(response, "gpt-5-nano");

    assertThat(usage.inputTokens()).isEqualTo(2000);
    assertThat(usage.cachedInputTokens()).isEqualTo(1500);
    assertThat(usage.outputTokens()).isEqualTo(500);
    assertThat(usage.cacheHit()).isTrue();
    assertThat(usage.estimatedCostUsd()).isCloseTo(0.0002325, within(0.000000001));
  }
}
