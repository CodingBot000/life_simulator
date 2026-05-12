package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.recommendation.core.CatalogRecommendationProvider;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.ProviderStatus;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationEngine;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationItem;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationProviderResult;
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
  void hidesHardcodedCatalogRecommendationsByDefault() {
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
    assertThat(result.items()).isEmpty();
    assertThat(result.disclosure().text()).isNotBlank();
    assertThat(result.providerStatus()).extracting("provider").contains("catalog");
    assertThat(result.providerStatus()).extracting("itemCount").contains(0);
  }

  @Test
  void returnsCatalogItemTypesWhenTemporaryGateIsEnabled() {
    RecommendationEngine engine = new RecommendationEngine(
      new DeterministicRecommendationIntentExtractor(),
      List.of(new CatalogRecommendationProvider(new JsonRecommendationCatalogRepository(new ObjectMapper()), true)),
      new RecommendationRanker(),
      new RecommendationSafetyPolicy()
    );

    var result = engine.recommend(
      new RecommendationContext(
        "request-2",
        "ko",
        new UserContext("developer", List.of("stability"), "low"),
        new DecisionContext("직무 전환과 면접 포트폴리오를 준비해야 합니다", List.of("준비", "이직"), "B"),
        new ResultContext("면접과 포트폴리오 준비가 다음 실행의 핵심입니다.", List.of("interview"), List.of("포트폴리오 설명을 정리하세요"), ""),
        List.of("catalog"),
        4
      )
    );

    assertThat(result.intent().topic()).isEqualTo("career_change");
    assertThat(result.items()).hasSizeGreaterThanOrEqualTo(4);
    assertThat(result.items()).extracting("type").contains("book", "template", "youtube_channel", "course");
  }

  @Test
  void sortsByScoreThenProviderTieBreakWithoutFinalLimit() {
    RecommendationIntent intent = new RecommendationIntent(
      "career_change",
      "developer",
      List.of(),
      List.of(),
      List.of(),
      "normal"
    );
    RecommendationEngine engine = new RecommendationEngine(
      context -> intent,
      List.of(
        provider("catalog", List.of(
          item("catalog:1", "catalog", "book", 0.55),
          item("catalog:2", "catalog", "template", 0.55)
        )),
        provider("naver", List.of(
          item("naver:1", "naver", "book", 0.55),
          item("naver:2", "naver", "product", 0.55)
        )),
        provider("youtube", List.of(
          item("youtube:1", "youtube", "youtube_video", 0.7),
          item("youtube:2", "youtube", "youtube_video", 0.55)
        ))
      ),
      new RecommendationRanker(),
      new RecommendationSafetyPolicy()
    );

    var result = engine.recommend(
      new RecommendationContext(
        "request-3",
        "ko",
        new UserContext("developer", List.of("growth"), "low"),
        new DecisionContext("이직과 성장 정체를 고민 중입니다", List.of("잔류", "이직"), "B"),
        new ResultContext("커리어 전환 검토", List.of(), List.of(), ""),
        List.of("catalog", "naver", "youtube"),
        1
      )
    );

    assertThat(result.items()).hasSize(6);
    assertThat(result.items()).extracting("id").containsExactly(
      "youtube:1",
      "naver:2",
      "naver:1",
      "youtube:2",
      "catalog:1",
      "catalog:2"
    );
  }

  private RecommendationProvider provider(String name, List<RecommendationItem> items) {
    return new RecommendationProvider() {
      @Override
      public String name() {
        return name;
      }

      @Override
      public RecommendationProviderResult search(RecommendationContext context, RecommendationIntent intent) {
        return new RecommendationProviderResult(name, items, ProviderStatus.ok(name, items.size()));
      }
    };
  }

  private RecommendationItem item(String id, String provider, String type, double rankScore) {
    return new RecommendationItem(
      id,
      provider,
      type,
      "추천 항목 " + id,
      "커리어 전환 추천 설명",
      "https://example.com/" + id,
      null,
      null,
      null,
      provider,
      false,
      false,
      "",
      rankScore,
      List.of("career_change", type)
    );
  }
}
