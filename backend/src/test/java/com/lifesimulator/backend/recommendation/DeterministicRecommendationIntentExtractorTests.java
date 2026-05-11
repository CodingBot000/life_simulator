package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.intent.DeterministicRecommendationIntentExtractor;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeterministicRecommendationIntentExtractorTests {

  private final DeterministicRecommendationIntentExtractor extractor = new DeterministicRecommendationIntentExtractor();

  @Test
  void extractsCareerIntentFromPortableContext() {
    RecommendationIntent intent = extractor.extract(
      new RecommendationContext(
        "request-1",
        "ko",
        new UserContext("developer", List.of("stability", "growth"), "low"),
        new DecisionContext("이직과 성장 정체를 고민 중입니다", List.of("잔류", "이직"), "B"),
        new ResultContext("커리어 성장과 안정성의 균형이 중요합니다.", List.of("growth"), List.of(), ""),
        List.of("catalog"),
        3
      )
    );

    assertThat(intent.topic()).isEqualTo("career_change");
    assertThat(intent.productTypes()).contains("book", "template");
    assertThat(intent.queries()).extracting("provider").containsOnly("catalog");
  }
}
