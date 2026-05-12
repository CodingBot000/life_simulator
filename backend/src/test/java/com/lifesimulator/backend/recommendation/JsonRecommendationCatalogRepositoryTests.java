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
  void hasEnoughKoreanDemoItemsForEachPrimaryTopic() {
    List<String> topics = List.of(
      "career_change",
      "financial_planning",
      "relationship",
      "learning",
      "wellbeing",
      "general_decision_support"
    );

    for (String topic : topics) {
      var items = repository.findCandidates(
        new RecommendationCatalogQuery("ko", topic, List.of(), 20)
      );

      assertThat(items)
        .as("topic %s should have at least four active catalog items", topic)
        .hasSizeGreaterThanOrEqualTo(4);
      assertThat(items).allMatch(item -> item.eligibleTopics().contains(topic));
    }
  }

  @Test
  void supportsEnglishLocaleWithNonEmptyCatalog() {
    var items = repository.findCandidates(
      new RecommendationCatalogQuery("en", "career_change", List.of("career"), 5)
    );

    assertThat(items).hasSizeGreaterThanOrEqualTo(2);
    assertThat(items).extracting("id").contains("en-career-book-001");
  }

  @Test
  void fallsBackToGeneralDecisionSupportWhenTopicDoesNotMatch() {
    var items = repository.findCandidates(
      new RecommendationCatalogQuery("ko", "unknown_topic", List.of("없는검색어"), 5)
    );

    assertThat(items).extracting("id").contains("ko-general-book-001");
  }
}
