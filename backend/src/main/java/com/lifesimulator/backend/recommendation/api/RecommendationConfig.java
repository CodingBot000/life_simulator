package com.lifesimulator.backend.recommendation.api;

import com.lifesimulator.backend.recommendation.core.CatalogRecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogRepository;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationRanker;
import com.lifesimulator.backend.recommendation.core.RecommendationSafetyPolicy;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
  CatalogRecommendationProvider catalogRecommendationProvider(
    RecommendationCatalogRepository catalogRepository
  ) {
    return new CatalogRecommendationProvider(catalogRepository);
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
