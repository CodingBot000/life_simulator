package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.recommendation.api.RecommendationRequest;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.life.LifeRecommendationContextMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class LifeRecommendationContextMapperTests {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final LifeRecommendationContextMapper mapper = new LifeRecommendationContextMapper();

  @Test
  void mapsLifePayloadToPortableRecommendationContext() throws Exception {
    RecommendationRequest request = new RecommendationRequest(
      "request-1",
      "ko",
      objectMapper.readTree(
        """
        {
          "userProfile": {
            "job": "developer",
            "risk_tolerance": "low",
            "priority": ["stability", "growth"]
          },
          "decision": {
            "optionA": "잔류",
            "optionB": "이직",
            "context": "이직과 성장 정체를 고민 중입니다"
          }
        }
        """
      ),
      objectMapper.readTree(
        """
        {
          "planner": { "factors": ["stability", "growth", "income"] },
          "advisor": {
            "decision": "B",
            "reason": "성장 정체와 안정성 사이의 균형이 중요합니다."
          },
          "riskA": { "risk_level": "low" },
          "riskB": { "risk_level": "medium" },
          "reflection": {
            "user_summary": {
              "suggested_actions": ["6개월 검증 기준을 정하세요"]
            }
          }
        }
        """
      ),
      3,
      List.of("catalog")
    );

    RecommendationContext context = mapper.map(request, 12);

    assertThat(context.requestId()).isEqualTo("request-1");
    assertThat(context.user().job()).isEqualTo("developer");
    assertThat(context.user().priorities()).containsExactly("stability", "growth");
    assertThat(context.decision().topicText()).contains("이직");
    assertThat(context.decision().optionLabels()).containsExactly("잔류", "이직");
    assertThat(context.decision().selectedOption()).isEqualTo("B");
    assertThat(context.result().plannerFactors()).containsExactly("stability", "growth", "income");
    assertThat(context.result().suggestedActions()).containsExactly("6개월 검증 기준을 정하세요");
    assertThat(context.result().riskLevel()).isEqualTo("medium");
    assertThat(context.maxItems()).isEqualTo(3);
  }
}
