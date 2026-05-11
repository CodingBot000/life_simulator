package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogQuery;
import com.lifesimulator.backend.recommendation.persistence.JsonRecommendationCatalogRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class JsonRecommendationCatalogRepositoryTests {

  private final JsonRecommendationCatalogRepository repository =
    new JsonRecommendationCatalogRepository(new ObjectMapper());

  @Test
  void findsCareerCatalogItemsFromJsonSeedData() {
    var items = repository.findCandidates(
      new RecommendationCatalogQuery("ko", "career_change", List.of("이직"), 5)
    );

    assertThat(items).isNotEmpty();
    assertThat(items).allMatch(item -> item.active());
    assertThat(items).extracting("id").contains("ko-career-book-001");
  }

  @Test
  void fallsBackToGeneralDecisionSupportWhenTopicDoesNotMatch() {
    var items = repository.findCandidates(
      new RecommendationCatalogQuery("ko", "unknown_topic", List.of("없는검색어"), 5)
    );

    assertThat(items).extracting("id").contains("ko-general-book-001");
  }
}
