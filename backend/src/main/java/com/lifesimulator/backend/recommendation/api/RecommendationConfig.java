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
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class RecommendationConfig {

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
    return new NaverSearchApiClient(objectMapper, properties.getRecommendations().getNaver());
  }

  @Bean
  NaverSearchProvider naverSearchProvider(
    NaverSearchClient naverSearchClient,
    SimulatorProperties properties
  ) {
    return new NaverSearchProvider(naverSearchClient, properties.getRecommendations().getNaver());
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
