package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class OpenAiJsonClient implements LlmJsonClient {

  private static final URI RESPONSES_URI = URI.create("https://api.openai.com/v1/responses");

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;

  public OpenAiJsonClient(ObjectMapper objectMapper, SimulatorProperties properties) {
    this(HttpClient.newHttpClient(), objectMapper, properties);
  }

  OpenAiJsonClient(
    HttpClient httpClient,
    ObjectMapper objectMapper,
    SimulatorProperties properties
  ) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Override
  public JsonNode completeJson(String prompt, JsonNode outputSchema, JsonNode fallback) {
    String apiKey = properties.getOpenai().getApiKey();
    if (apiKey == null || apiKey.isBlank()) {
      throw new LlmClientException(
        "OpenAI API key is required when SIMULATOR_LLM_PROVIDER=openai."
      );
    }

    try {
      HttpRequest request = HttpRequest
        .newBuilder(RESPONSES_URI)
        .timeout(timeout())
        .header("Authorization", "Bearer " + apiKey.trim())
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload(prompt, outputSchema))))
        .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new LlmClientException("OpenAI API failed: " + errorMessage(response.body()));
      }

      String outputText = outputText(objectMapper.readTree(response.body()));
      if (outputText.isBlank()) {
        throw new LlmClientException("OpenAI API returned an empty JSON response.");
      }
      return objectMapper.readTree(outputText);
    } catch (IOException error) {
      throw new LlmClientException("OpenAI API I/O failed: " + error.getMessage(), error);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new LlmClientException("OpenAI API execution was interrupted.", error);
    }
  }

  @Override
  public String providerName() {
    return "openai";
  }

  @Override
  public String modelName() {
    return properties.getOpenai().getModel();
  }

  @Override
  public boolean enabled() {
    return true;
  }

  @Override
  public boolean fallbackOnError() {
    return properties.getOpenai().isFallbackOnError();
  }

  private Duration timeout() {
    Duration timeout = properties.getOpenai().getTimeout();
    return timeout == null ? Duration.ofSeconds(75) : timeout;
  }

  private ObjectNode payload(String prompt, JsonNode outputSchema) {
    ObjectNode payload = objectMapper.createObjectNode();
    payload.put("model", properties.getOpenai().getModel());
    payload.put("input", prompt);
    payload.put("store", false);

    ObjectNode text = payload.putObject("text");
    ObjectNode format = text.putObject("format");
    format.put("type", "json_schema");
    format.put("name", "life_simulator_stage_output");
    format.put("strict", true);
    format.set("schema", outputSchema);
    return payload;
  }

  private String outputText(JsonNode response) {
    String direct = response.path("output_text").asText("");
    if (!direct.isBlank()) {
      return direct;
    }

    ArrayNode fragments = objectMapper.createArrayNode();
    JsonNode output = response.path("output");
    if (output.isArray()) {
      for (JsonNode item : output) {
        JsonNode content = item.path("content");
        if (!content.isArray()) {
          continue;
        }
        for (JsonNode part : content) {
          String type = part.path("type").asText("");
          if ("output_text".equals(type)) {
            fragments.add(part.path("text").asText(""));
          }
        }
      }
    }

    StringBuilder joined = new StringBuilder();
    for (JsonNode fragment : fragments) {
      joined.append(fragment.asText());
    }
    return joined.toString();
  }

  private String errorMessage(String responseBody) {
    try {
      JsonNode error = objectMapper.readTree(responseBody).path("error");
      String message = error.path("message").asText("");
      return message.isBlank() ? "HTTP error from OpenAI API." : message;
    } catch (IOException ignored) {
      return responseBody == null || responseBody.isBlank()
        ? "HTTP error from OpenAI API."
        : responseBody;
    }
  }
}
