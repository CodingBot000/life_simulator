package com.lifesimulator.backend.recommendation.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.engine.llm.LlmJsonClient;
import com.lifesimulator.backend.recommendation.core.CatalogRecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogRepository;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationRanker;
import com.lifesimulator.backend.recommendation.core.RecommendationSafetyPolicy;
import com.lifesimulator.backend.recommendation.intent.DeterministicRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.intent.FallbackRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.intent.LlmRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.intent.RecommendationIntentSchemaFactory;
import com.lifesimulator.backend.recommendation.naver.NaverSearchApiClient;
import com.lifesimulator.backend.recommendation.naver.NaverSearchClient;
import com.lifesimulator.backend.recommendation.naver.NaverSearchProvider;
import com.lifesimulator.backend.recommendation.youtube.YoutubeRecommendationProvider;
import com.lifesimulator.backend.recommendation.youtube.YoutubeSearchApiClient;
import com.lifesimulator.backend.recommendation.youtube.YoutubeSearchClient;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class RecommendationConfig {

  private final List<Path> dotenvPaths;

  public RecommendationConfig() {
    this(List.of(Path.of(".env"), Path.of("backend/.env")));
  }

  RecommendationConfig(List<Path> dotenvPaths) {
    this.dotenvPaths = List.copyOf(dotenvPaths);
  }

  @Bean
  RecommendationRanker recommendationRanker() {
    return new RecommendationRanker();
  }

  @Bean
  RecommendationSafetyPolicy recommendationSafetyPolicy() {
    return new RecommendationSafetyPolicy();
  }

  @Bean
  DeterministicRecommendationIntentExtractor deterministicRecommendationIntentExtractor() {
    return new DeterministicRecommendationIntentExtractor();
  }

  @Bean
  RecommendationIntentSchemaFactory recommendationIntentSchemaFactory(ObjectMapper objectMapper) {
    return new RecommendationIntentSchemaFactory(objectMapper);
  }

  @Bean
  @Primary
  RecommendationIntentExtractor recommendationIntentExtractor(
    DeterministicRecommendationIntentExtractor deterministicIntentExtractor,
    LlmJsonClient llmJsonClient,
    ObjectMapper objectMapper,
    RecommendationIntentSchemaFactory schemaFactory,
    SimulatorProperties properties
  ) {
    return new FallbackRecommendationIntentExtractor(
      new LlmRecommendationIntentExtractor(llmJsonClient, objectMapper, schemaFactory),
      deterministicIntentExtractor,
      properties.getRecommendations().isLlmIntentEnabled()
    );
  }

  @Bean
  CatalogRecommendationProvider catalogRecommendationProvider(
    RecommendationCatalogRepository catalogRepository
  ) {
    return new CatalogRecommendationProvider(catalogRepository);
  }

  @Bean
  NaverSearchClient naverSearchClient(ObjectMapper objectMapper, SimulatorProperties properties) {
    return new NaverSearchApiClient(objectMapper, naverProperties(properties));
  }

  @Bean
  NaverSearchProvider naverSearchProvider(
    NaverSearchClient naverSearchClient,
    SimulatorProperties properties
  ) {
    return new NaverSearchProvider(naverSearchClient, naverProperties(properties));
  }

  @Bean
  YoutubeSearchClient youtubeSearchClient(ObjectMapper objectMapper, SimulatorProperties properties) {
    return new YoutubeSearchApiClient(objectMapper, youtubeProperties(properties));
  }

  @Bean
  YoutubeRecommendationProvider youtubeRecommendationProvider(
    YoutubeSearchClient youtubeSearchClient,
    SimulatorProperties properties
  ) {
    return new YoutubeRecommendationProvider(
      youtubeSearchClient,
      youtubeProperties(properties)
    );
  }

  private SimulatorProperties.Recommendations.Youtube youtubeProperties(SimulatorProperties properties) {
    SimulatorProperties.Recommendations.Youtube youtube = properties.getRecommendations().getYoutube();
    if (!youtube.hasApiKey()) {
      youtube.setApiKey(dotenvValue("YOUTUBE_API_KEY"));
    }
    return youtube;
  }

  private SimulatorProperties.Recommendations.Naver naverProperties(SimulatorProperties properties) {
    SimulatorProperties.Recommendations.Naver naver = properties.getRecommendations().getNaver();
    if (!naver.hasCredentials()) {
      if (naver.getClientId().isBlank()) {
        naver.setClientId(dotenvValue("NAVER_CLIENT_ID"));
      }
      if (naver.getClientSecret().isBlank()) {
        naver.setClientSecret(dotenvValue("NAVER_CLIENT_SECRET"));
      }
    }
    return naver;
  }

  private String dotenvValue(String key) {
    for (Path path : dotenvPaths) {
      String value = dotenvValue(path, key);
      if (!value.isBlank()) {
        return value;
      }
    }
    return "";
  }

  private String dotenvValue(Path path, String key) {
    if (!Files.isRegularFile(path)) {
      return "";
    }
    try {
      for (String line : Files.readAllLines(path)) {
        String current = line.trim();
        if (current.startsWith("export ")) {
          current = current.substring("export ".length()).trim();
        }
        if (current.startsWith(key + "=")) {
          return unquote(current.substring(key.length() + 1).trim());
        }
      }
      return "";
    } catch (IOException ignored) {
      return "";
    }
  }

  private String unquote(String value) {
    if (value.length() >= 2) {
      char first = value.charAt(0);
      char last = value.charAt(value.length() - 1);
      if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
        return value.substring(1, value.length() - 1).trim();
      }
    }
    return value;
  }

  @Bean
  RecommendationEngine recommendationEngine(
    RecommendationIntentExtractor intentExtractor,
    List<RecommendationProvider> providers,
    RecommendationRanker ranker,
    RecommendationSafetyPolicy safetyPolicy
  ) {
    return new RecommendationEngine(intentExtractor, providers, ranker, safetyPolicy);
  }
}
