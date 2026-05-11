package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.recommendation.core.CatalogRecommendationProvider;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.core.RecommendationRanker;
import com.lifesimulator.backend.recommendation.core.RecommendationSafetyPolicy;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.intent.DeterministicRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.persistence.JsonRecommendationCatalogRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecommendationEngineTests {

  @Test
  void returnsRankedCatalogRecommendationsFromContextOnly() {
    RecommendationEngine engine = new RecommendationEngine(
      new DeterministicRecommendationIntentExtractor(),
      List.of(new CatalogRecommendationProvider(new JsonRecommendationCatalogRepository(new ObjectMapper()))),
      new RecommendationRanker(),
      new RecommendationSafetyPolicy()
    );

    var result = engine.recommend(
      new RecommendationContext(
        "request-1",
        "ko",
        new UserContext("developer", List.of("stability", "growth"), "low"),
        new DecisionContext("이직과 성장 정체를 고민 중입니다", List.of("잔류", "이직"), "B"),
        new ResultContext("성장 정체와 안정성 사이의 균형이 중요합니다.", List.of("growth"), List.of(), ""),
        List.of("catalog"),
        3
      )
    );

    assertThat(result.requestId()).isEqualTo("request-1");
    assertThat(result.intent().topic()).isEqualTo("career_change");
    assertThat(result.items()).isNotEmpty().hasSizeLessThanOrEqualTo(3);
    assertThat(result.items().get(0).provider()).isEqualTo("catalog");
    assertThat(result.disclosure().text()).isNotBlank();
    assertThat(result.providerStatus()).extracting("status").contains("ok");
  }
}
