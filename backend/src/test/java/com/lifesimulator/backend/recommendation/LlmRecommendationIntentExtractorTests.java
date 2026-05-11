package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.llm.LlmJsonClient;
import com.lifesimulator.backend.engine.llm.LlmJsonRequest;
import com.lifesimulator.backend.engine.llm.LlmJsonResult;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.intent.LlmRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.intent.RecommendationIntentSchemaFactory;
import java.util.List;
import org.junit.jupiter.api.Test;

class LlmRecommendationIntentExtractorTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void mapsLlmJsonOutputToRecommendationIntent() throws Exception {
    var extractor = new LlmRecommendationIntentExtractor(
      new StaticLlmClient(objectMapper.readTree(
        """
        {
          "topic": "learning",
          "audience_context": "학습 계획이 필요한 사용자",
          "product_types": ["course", "template"],
          "queries": [
            {"provider": "catalog", "query": "자격증 시험", "reason": "시험 준비가 핵심"}
          ],
          "negative_filters": [],
          "safety_level": "normal"
        }
        """
      )),
      objectMapper,
      new RecommendationIntentSchemaFactory(objectMapper)
    );

    var intent = extractor.extract(context());

    assertThat(intent.topic()).isEqualTo("learning");
    assertThat(intent.productTypes()).containsExactly("course", "template");
    assertThat(intent.queries()).extracting("query").containsExactly("자격증 시험");
  }

  @Test
  void normalizesUnknownTopicToGeneralDecisionSupport() throws Exception {
    var extractor = new LlmRecommendationIntentExtractor(
      new StaticLlmClient(objectMapper.readTree(
        """
        {
          "topic": "unsafe_unknown",
          "audience_context": "",
          "product_types": ["book"],
          "queries": [],
          "negative_filters": [],
          "safety_level": "normal"
        }
        """
      )),
      objectMapper,
      new RecommendationIntentSchemaFactory(objectMapper)
    );

    assertThat(extractor.extract(context()).topic()).isEqualTo("general_decision_support");
  }

  private RecommendationContext context() {
    return new RecommendationContext(
      "request-1",
      "ko",
      new UserContext("", List.of("growth"), "low"),
      new DecisionContext("자격증 시험 준비를 고민합니다.", List.of("응시", "연기"), "A"),
      new ResultContext("학습 계획이 중요합니다.", List.of("study"), List.of("복습 계획을 세우세요"), ""),
      List.of("catalog"),
      3
    );
  }

  private static class StaticLlmClient implements LlmJsonClient {
    private final JsonNode output;

    StaticLlmClient(JsonNode output) {
      this.output = output;
    }

    @Override
    public LlmJsonResult completeJson(LlmJsonRequest request) {
      return LlmJsonResult.of(output, modelName());
    }

    @Override
    public String providerName() {
      return "test";
    }

    @Override
    public String modelName() {
      return "test-model";
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
