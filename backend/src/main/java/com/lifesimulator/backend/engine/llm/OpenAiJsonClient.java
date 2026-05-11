package com.lifesimulator.backend.engine.llm;

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
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public class OpenAiJsonClient implements LlmJsonClient {

  private static final URI RESPONSES_URI = URI.create("https://api.openai.com/v1/responses");
  private static final int MAX_RETRIES = 2;
  private static final int MAX_OUTPUT_TOKEN_PARSE_ATTEMPTS = 2;
  private static final int MAX_OUTPUT_TOKEN_RETRY_CEILING = 8_000;

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
  public LlmJsonResult completeJson(LlmJsonRequest llmRequest) {
    String apiKey = properties.getOpenai().getApiKey();
    if (apiKey == null || apiKey.isBlank()) {
      throw new LlmClientException(
        "OpenAI API key is required when SIMULATOR_LLM_PROVIDER=openai."
      );
    }

    long startedAt = System.nanoTime();
    try {
      int maxOutputTokens = maxOutputTokensForStage(llmRequest.stageName());
      int totalHttpRetries = 0;
      for (int attempt = 1; attempt <= MAX_OUTPUT_TOKEN_PARSE_ATTEMPTS; attempt += 1) {
        HttpRequest httpRequest = httpRequest(apiKey, llmRequest, maxOutputTokens);
        OpenAiHttpResult httpResult = sendWithRetry(httpRequest);
        totalHttpRetries += httpResult.retryCount();
        HttpResponse<String> response = httpResult.response();
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
          throw new LlmClientException("OpenAI API failed: " + errorMessage(response.body()));
        }

        JsonNode responseBody = objectMapper.readTree(response.body());
        if (isMaxOutputIncomplete(responseBody)) {
          if (attempt < MAX_OUTPUT_TOKEN_PARSE_ATTEMPTS && canIncreaseMaxOutput(maxOutputTokens)) {
            maxOutputTokens = increasedMaxOutputTokens(maxOutputTokens);
            continue;
          }
          throw new LlmClientException(
            "OpenAI API response was incomplete because max_output_tokens was reached."
          );
        }

        String outputText = outputText(responseBody);
        if (outputText.isBlank()) {
          throw new LlmClientException("OpenAI API returned an empty JSON response.");
        }
        String model = modelForStage(llmRequest.stageName());
        try {
          return new LlmJsonResult(
            objectMapper.readTree(outputText),
            model,
            usage(responseBody, model),
            elapsedMillis(startedAt),
            totalHttpRetries
          );
        } catch (IOException error) {
          if (
            attempt < MAX_OUTPUT_TOKEN_PARSE_ATTEMPTS &&
            canIncreaseMaxOutput(maxOutputTokens) &&
            looksLikeTruncatedJson(error)
          ) {
            maxOutputTokens = increasedMaxOutputTokens(maxOutputTokens);
            continue;
          }
          throw new LlmClientException(
            "OpenAI API returned invalid JSON output: " + error.getMessage(),
            error
          );
        }
      }
      throw new LlmClientException("OpenAI API JSON retry loop exited without a response.");
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

  ObjectNode payload(LlmJsonRequest request) {
    return payload(request, maxOutputTokensForStage(request.stageName()));
  }

  ObjectNode payload(LlmJsonRequest request, int maxOutputTokens) {
    SimulatorProperties.OpenAi.StageProfile profile = properties
      .getOpenai()
      .profileFor(request.stageName());
    ObjectNode payload = objectMapper.createObjectNode();
    payload.put("model", modelForStage(request.stageName()));
    payload.put("input", request.prompt());
    payload.put("store", false);
    payload.put("max_output_tokens", maxOutputTokens);

    ObjectNode reasoning = payload.putObject("reasoning");
    reasoning.put("effort", profile.getReasoningEffort());

    ObjectNode text = payload.putObject("text");
    text.put("verbosity", profile.getVerbosity());
    ObjectNode format = text.putObject("format");
    format.put("type", "json_schema");
    format.put("name", "life_simulator_" + request.stageName() + "_output");
    format.put("strict", true);
    format.set("schema", request.outputSchema());

    if (!profile.getPromptCacheKey().isBlank()) {
      payload.put("prompt_cache_key", profile.getPromptCacheKey());
    }
    String retention = properties.getOpenai().getPromptCacheRetention();
    if (retention != null && !retention.isBlank()) {
      payload.put("prompt_cache_retention", retention);
    }
    return payload;
  }

  private HttpRequest httpRequest(
    String apiKey,
    LlmJsonRequest llmRequest,
    int maxOutputTokens
  ) throws IOException {
    return HttpRequest
      .newBuilder(RESPONSES_URI)
      .timeout(timeout())
      .header("Authorization", "Bearer " + apiKey.trim())
      .header("Content-Type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload(llmRequest, maxOutputTokens))))
      .build();
  }

  private int maxOutputTokensForStage(String stageName) {
    return properties.getOpenai().profileFor(stageName).getMaxOutputTokens();
  }

  private boolean isMaxOutputIncomplete(JsonNode responseBody) {
    String status = responseBody.path("status").asText("");
    String reason = responseBody.path("incomplete_details").path("reason").asText("");
    return "incomplete".equals(status) && "max_output_tokens".equals(reason);
  }

  private boolean canIncreaseMaxOutput(int maxOutputTokens) {
    return maxOutputTokens < MAX_OUTPUT_TOKEN_RETRY_CEILING;
  }

  private int increasedMaxOutputTokens(int maxOutputTokens) {
    return Math.min(MAX_OUTPUT_TOKEN_RETRY_CEILING, Math.max(maxOutputTokens * 2, maxOutputTokens + 1_000));
  }

  private boolean looksLikeTruncatedJson(IOException error) {
    String message = error.getMessage();
    return message != null && message.contains("Unexpected end-of-input");
  }

  private String modelForStage(String stageName) {
    String stageModel = properties.getOpenai().profileFor(stageName).getModel();
    return stageModel == null || stageModel.isBlank()
      ? properties.getOpenai().getModel()
      : stageModel;
  }

  private OpenAiHttpResult sendWithRetry(HttpRequest request)
    throws IOException, InterruptedException {
    IOException lastIoError = null;
    for (int attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        HttpResponse<String> response = httpClient.send(
          request,
          HttpResponse.BodyHandlers.ofString()
        );
        if (!isRetriableStatus(response.statusCode()) || attempt == MAX_RETRIES) {
          return new OpenAiHttpResult(response, attempt);
        }
      } catch (IOException error) {
        lastIoError = error;
        if (attempt == MAX_RETRIES) {
          throw error;
        }
      }
      sleepBeforeRetry(attempt);
    }
    throw lastIoError == null
      ? new IOException("OpenAI API retry loop exited without a response.")
      : lastIoError;
  }

  private boolean isRetriableStatus(int statusCode) {
    return statusCode == 429 || statusCode >= 500;
  }

  private void sleepBeforeRetry(int attempt) throws InterruptedException {
    long baseMillis = 200L * (1L << attempt);
    long jitterMillis = ThreadLocalRandom.current().nextLong(50, 151);
    Thread.sleep(baseMillis + jitterMillis);
  }

  LlmUsage usage(JsonNode response, String model) {
    JsonNode usage = response.path("usage");
    int inputTokens = usage.path("input_tokens").asInt(usage.path("prompt_tokens").asInt(0));
    int outputTokens = usage
      .path("output_tokens")
      .asInt(usage.path("completion_tokens").asInt(0));
    int totalTokens = usage.path("total_tokens").asInt(inputTokens + outputTokens);
    int cachedTokens = cachedInputTokens(usage);
    double cost = OpenAiTokenPricing.estimate(model, inputTokens, cachedTokens, outputTokens);
    return new LlmUsage(inputTokens, cachedTokens, outputTokens, totalTokens, cost);
  }

  private int cachedInputTokens(JsonNode usage) {
    JsonNode inputDetails = usage.path("input_tokens_details");
    if (!inputDetails.isMissingNode()) {
      return inputDetails.path("cached_tokens").asInt(0);
    }
    return usage.path("prompt_tokens_details").path("cached_tokens").asInt(0);
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

  private int elapsedMillis(long startedAt) {
    return Math.max(0, (int) ((System.nanoTime() - startedAt) / 1_000_000));
  }

  private record OpenAiTokenPricing(
    String modelPrefix,
    double inputPerMillion,
    double cachedInputPerMillion,
    double outputPerMillion
  ) {
    private static final List<OpenAiTokenPricing> PRICES = List.of(
      new OpenAiTokenPricing("gpt-5.5-pro", 30, 0, 180),
      new OpenAiTokenPricing("gpt-5.5", 5, 0.5, 30),
      new OpenAiTokenPricing("gpt-5.4-pro", 30, 0, 180),
      new OpenAiTokenPricing("gpt-5.4-mini", 0.75, 0.075, 4.5),
      new OpenAiTokenPricing("gpt-5.4-nano", 0.2, 0.02, 1.25),
      new OpenAiTokenPricing("gpt-5.4", 2.5, 0.25, 15),
      new OpenAiTokenPricing("gpt-5.2-pro", 21, 0, 168),
      new OpenAiTokenPricing("gpt-5.2", 1.75, 0.175, 14),
      new OpenAiTokenPricing("gpt-5.1", 1.25, 0.125, 10),
      new OpenAiTokenPricing("gpt-5-nano", 0.05, 0.005, 0.4),
      new OpenAiTokenPricing("gpt-5-mini", 0.25, 0.025, 2),
      new OpenAiTokenPricing("gpt-5-pro", 15, 0, 120),
      new OpenAiTokenPricing("gpt-5", 1.25, 0.125, 10),
      new OpenAiTokenPricing("gpt-4.1-nano", 0.1, 0.025, 0.4),
      new OpenAiTokenPricing("gpt-4.1-mini", 0.4, 0.1, 1.6),
      new OpenAiTokenPricing("gpt-4.1", 2, 0.5, 8)
    );

    private static double estimate(
      String model,
      int inputTokens,
      int cachedInputTokens,
      int outputTokens
    ) {
      OpenAiTokenPricing price = PRICES
        .stream()
        .filter(candidate -> model.startsWith(candidate.modelPrefix()))
        .findFirst()
        .orElse(null);
      if (price == null) {
        return 0;
      }
      int billableInputTokens = Math.max(0, inputTokens - cachedInputTokens);
      return (
        billableInputTokens / 1_000_000d * price.inputPerMillion() +
        cachedInputTokens / 1_000_000d * price.cachedInputPerMillion() +
        outputTokens / 1_000_000d * price.outputPerMillion()
      );
    }
  }

  private record OpenAiHttpResult(HttpResponse<String> response, int retryCount) {}
}
