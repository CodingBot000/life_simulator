package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.intent.FallbackRecommendationIntentExtractor;
import java.util.List;
import org.junit.jupiter.api.Test;

class FallbackRecommendationIntentExtractorTests {

  @Test
  void usesFallbackWhenPrimaryIsDisabled() {
    var extractor = new FallbackRecommendationIntentExtractor(
      ignored -> intent("learning"),
      ignored -> intent("general_decision_support"),
      false
    );

    assertThat(extractor.extract(context()).topic()).isEqualTo("general_decision_support");
  }

  @Test
  void usesFallbackWhenPrimaryThrows() {
    RecommendationIntentExtractor failing = ignored -> {
      throw new IllegalStateException("boom");
    };
    var extractor = new FallbackRecommendationIntentExtractor(
      failing,
      ignored -> intent("relationship"),
      true
    );

    assertThat(extractor.extract(context()).topic()).isEqualTo("relationship");
  }

  private RecommendationIntent intent(String topic) {
    return new RecommendationIntent(
      topic,
      "",
      List.of("book"),
      List.of(new RecommendationQuery("catalog", "query", "reason")),
      List.of(),
      "normal"
    );
  }

  private RecommendationContext context() {
    return new RecommendationContext(
      "request-1",
      "ko",
      new UserContext("", List.of(), "low"),
      new DecisionContext("선택을 고민합니다.", List.of("A", "B"), "A"),
      new ResultContext("기준 정리가 필요합니다.", List.of(), List.of(), ""),
      List.of("catalog"),
      3
    );
  }
}
