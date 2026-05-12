package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.api.RecommendationController;
import com.lifesimulator.backend.recommendation.api.RecommendationRequest;
import com.lifesimulator.backend.recommendation.core.CatalogRecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.core.RecommendationRanker;
import com.lifesimulator.backend.recommendation.core.RecommendationSafetyPolicy;
import com.lifesimulator.backend.recommendation.intent.DeterministicRecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.life.LifeRecommendationContextMapper;
import com.lifesimulator.backend.recommendation.persistence.JsonRecommendationCatalogRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class RecommendationControllerTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void recommendationsHideCatalogItemsWithoutExternalKeys() throws Exception {
    RecommendationController controller = controller(new SimulatorProperties());
    var response = controller.recommendations(request());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().requestId()).isEqualTo("request-1");
    assertThat(response.getBody().items()).isEmpty();
    assertThat(response.getBody().providerStatus()).extracting("provider").contains("catalog");
    assertThat(response.getBody().providerStatus()).extracting("itemCount").contains(0);
  }

  @Test
  void recommendationsCanBeDisabledWithoutFailingRequest() throws Exception {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getRecommendations().setEnabled(false);
    RecommendationController controller = controller(properties);

    var response = controller.recommendations(request());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().items()).isEmpty();
    assertThat(response.getBody().providerStatus()).extracting("status").contains("disabled");
  }

  private RecommendationController controller(SimulatorProperties properties) {
    return new RecommendationController(
      properties,
      new LifeRecommendationContextMapper(),
      new RecommendationEngine(
        new DeterministicRecommendationIntentExtractor(),
        List.of(new CatalogRecommendationProvider(new JsonRecommendationCatalogRepository(objectMapper))),
        new RecommendationRanker(),
        new RecommendationSafetyPolicy()
      )
    );
  }

  private RecommendationRequest request() throws Exception {
    return new RecommendationRequest(
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
          "planner": { "factors": ["stability", "growth"] },
          "advisor": {
            "decision": "B",
            "reason": "성장 정체와 안정성 사이의 균형이 중요합니다."
          },
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
  }
}
