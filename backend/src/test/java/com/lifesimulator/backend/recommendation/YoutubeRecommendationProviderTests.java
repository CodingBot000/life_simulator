package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.youtube.YoutubeRecommendationProvider;
import com.lifesimulator.backend.recommendation.youtube.YoutubeSearchClient;
import com.lifesimulator.backend.recommendation.youtube.YoutubeSearchRequest;
import com.lifesimulator.backend.recommendation.youtube.YoutubeSearchVideo;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class YoutubeRecommendationProviderTests {

  @Test
  void returnsDisabledWhenYoutubeProviderIsNotEnabled() {
    FakeYoutubeSearchClient client = new FakeYoutubeSearchClient();
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      client,
      properties(false)
    );

    var result = provider.search(context(), intent());

    assertThat(result.items()).isEmpty();
    assertThat(result.status().status()).isEqualTo("disabled");
    assertThat(client.requests).isEmpty();
  }

  @Test
  void returnsDisabledWhenApiKeyIsMissing() {
    FakeYoutubeSearchClient client = new FakeYoutubeSearchClient();
    SimulatorProperties.Recommendations.Youtube properties = properties(true);
    properties.setApiKey("");
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      client,
      properties
    );

    var result = provider.search(context(), intent());

    assertThat(result.items()).isEmpty();
    assertThat(result.status().status()).isEqualTo("disabled");
    assertThat(result.status().message()).contains("API key");
    assertThat(client.requests).isEmpty();
  }

  @Test
  void mapsYoutubeSearchResultsIntoRecommendationItems() {
    FakeYoutubeSearchClient client = new FakeYoutubeSearchClient();
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      client,
      properties(true)
    );

    var result = provider.search(context(), intent());

    assertThat(result.status().status()).isEqualTo("ok");
    assertThat(result.items()).hasSize(1);
    assertThat(result.items().get(0).provider()).isEqualTo("youtube");
    assertThat(result.items().get(0).type()).isEqualTo("youtube_video");
    assertThat(result.items().get(0).title()).isEqualTo("커리어 전환 영상");
    assertThat(result.items().get(0).imageUrl()).isEqualTo("https://img.youtube.test/thumb.jpg");
    assertThat(result.items().get(0).creatorName()).isEqualTo("커리어 채널");
    assertThat(result.items().get(0).url()).isEqualTo("https://www.youtube.com/watch?v=8GQZuzIdeQQ");
    assertThat(result.items().get(0).affiliate()).isFalse();
    assertThat(client.requests).extracting("query").containsExactly("커리어 전환");
  }

  @Test
  void fallsBackToTopicQueryWhenIntentHasNoQueries() {
    FakeYoutubeSearchClient client = new FakeYoutubeSearchClient();
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      client,
      properties(true)
    );

    var result = provider.search(
      context(),
      new RecommendationIntent(
        "career_change",
        "developer",
        List.of("youtube_video"),
        List.of(),
        List.of(),
        "normal"
      )
    );

    assertThat(result.items()).hasSize(1);
    assertThat(client.requests).extracting("query").containsExactly("커리어 전환 조언");
  }

  private SimulatorProperties.Recommendations.Youtube properties(boolean enabled) {
    SimulatorProperties.Recommendations.Youtube properties = new SimulatorProperties.Recommendations.Youtube();
    properties.setEnabled(enabled);
    properties.setApiKey("youtube-api-key");
    properties.setMaxItems(1);
    properties.setMaxQueries(1);
    return properties;
  }

  private RecommendationIntent intent() {
    return new RecommendationIntent(
      "career_change",
      "developer",
      List.of("youtube_video"),
      List.of(new RecommendationQuery("catalog", "커리어 전환", "test")),
      List.of(),
      "normal"
    );
  }

  private RecommendationContext context() {
    return new RecommendationContext(
      "request-1",
      "ko",
      new UserContext("developer", List.of(), ""),
      new DecisionContext("커리어 전환 고민", List.of("잔류", "이직"), "B"),
      new ResultContext("커리어 전환 검토", List.of(), List.of(), ""),
      List.of("youtube"),
      4
    );
  }

  private static class FakeYoutubeSearchClient implements YoutubeSearchClient {
    private final List<YoutubeSearchRequest> requests = new ArrayList<>();

    @Override
    public List<YoutubeSearchVideo> search(YoutubeSearchRequest request) {
      requests.add(request);
      return List.of(
        new YoutubeSearchVideo(
          "8GQZuzIdeQQ",
          "커리어 전환 영상",
          "직무 전환을 다루는 영상입니다.",
          "https://img.youtube.test/thumb.jpg",
          "커리어 채널"
        )
      );
    }
  }
}
