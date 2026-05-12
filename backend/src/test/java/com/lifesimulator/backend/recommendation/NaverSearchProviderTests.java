package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.naver.NaverSearchClient;
import com.lifesimulator.backend.recommendation.naver.NaverSearchDocument;
import com.lifesimulator.backend.recommendation.naver.NaverSearchProvider;
import com.lifesimulator.backend.recommendation.naver.NaverSearchRequest;
import com.lifesimulator.backend.recommendation.naver.NaverSearchType;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class NaverSearchProviderTests {

  @Test
  void returnsDisabledWhenNaverProviderIsNotEnabled() {
    FakeNaverSearchClient client = new FakeNaverSearchClient();
    NaverSearchProvider provider = new NaverSearchProvider(client, newProperties(false));

    var result = provider.search(context("ko"), intent());

    assertThat(result.items()).isEmpty();
    assertThat(result.status().status()).isEqualTo("disabled");
    assertThat(client.requests).isEmpty();
  }

  @Test
  void returnsDisabledWhenCredentialsAreMissing() {
    FakeNaverSearchClient client = new FakeNaverSearchClient();
    SimulatorProperties.Recommendations.Naver properties = newProperties(true);
    properties.setClientSecret("");
    NaverSearchProvider provider = new NaverSearchProvider(client, properties);

    var result = provider.search(context("ko"), intent());

    assertThat(result.items()).isEmpty();
    assertThat(result.status().status()).isEqualTo("disabled");
    assertThat(result.status().message()).contains("credentials");
    assertThat(client.requests).isEmpty();
  }

  @Test
  void mapsBookAndShoppingSearchResultsIntoRecommendationItems() {
    FakeNaverSearchClient client = new FakeNaverSearchClient();
    NaverSearchProvider provider = new NaverSearchProvider(client, newProperties(true));

    var result = provider.search(context("ko"), intent());

    assertThat(result.status().status()).isEqualTo("ok");
    assertThat(result.items()).hasSize(2);
    assertThat(result.items()).extracting("provider").containsOnly("naver");
    assertThat(result.items()).extracting("type").contains("book", "product");
    assertThat(result.items()).extracting("title").contains("커리어 전환 책", "커리어 플래너");
    assertThat(result.items()).extracting("priceLabel").contains("15,000원", "8,900원");
    assertThat(result.items()).allSatisfy(item -> {
      assertThat(item.affiliate()).isFalse();
      assertThat(item.sponsored()).isFalse();
      assertThat(item.why()).contains("네이버");
    });
    assertThat(client.requests).extracting("type").contains(NaverSearchType.BOOK, NaverSearchType.SHOPPING);
  }

  private SimulatorProperties.Recommendations.Naver newProperties(boolean enabled) {
    SimulatorProperties.Recommendations.Naver properties = new SimulatorProperties.Recommendations.Naver();
    properties.setEnabled(enabled);
    properties.setClientId("client-id");
    properties.setClientSecret("client-secret");
    properties.setDisplay(1);
    properties.setMaxQueries(1);
    properties.setShoppingEnabled(true);
    return properties;
  }

  private RecommendationIntent intent() {
    return new RecommendationIntent(
      "career_change",
      "developer",
      List.of("book", "product"),
      List.of(new RecommendationQuery("catalog", "커리어 전환", "test")),
      List.of(),
      "normal"
    );
  }

  private RecommendationContext context(String locale) {
    return new RecommendationContext(
      "request-1",
      locale,
      new UserContext("developer", List.of(), ""),
      new DecisionContext("이직 고민", List.of("잔류", "이직"), "B"),
      new ResultContext("커리어 전환 검토", List.of(), List.of(), ""),
      List.of("naver"),
      4
    );
  }

  private static class FakeNaverSearchClient implements NaverSearchClient {
    private final List<NaverSearchRequest> requests = new ArrayList<>();

    @Override
    public List<NaverSearchDocument> search(NaverSearchRequest request) {
      requests.add(request);
      if (request.type() == NaverSearchType.BOOK) {
        return List.of(
          new NaverSearchDocument(
            NaverSearchType.BOOK,
            "커리어 전환 책",
            "https://book.example/item",
            "https://book.example/image.png",
            "직무 전환을 다루는 책",
            "홍길동",
            "출판사",
            "15000",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
          )
        );
      }
      return List.of(
        new NaverSearchDocument(
          NaverSearchType.SHOPPING,
          "커리어 플래너",
          "https://shop.example/item",
          "https://shop.example/image.png",
          "",
          "",
          "",
          "",
          "12345",
          "8900",
          "네이버",
          "브랜드",
          "메이커",
          "문구",
          "다이어리",
          "플래너"
        )
      );
    }
  }
}
