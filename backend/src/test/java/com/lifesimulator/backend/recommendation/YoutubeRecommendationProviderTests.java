package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.youtube.YoutubeOembedClient;
import com.lifesimulator.backend.recommendation.youtube.YoutubeOembedMetadata;
import com.lifesimulator.backend.recommendation.youtube.YoutubeRecommendationProvider;
import com.lifesimulator.backend.recommendation.youtube.YoutubeVideoSeed;
import com.lifesimulator.backend.recommendation.youtube.YoutubeVideoSeedRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class YoutubeRecommendationProviderTests {

  @Test
  void returnsDisabledWhenYoutubeProviderIsNotEnabled() {
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      new FakeYoutubeVideoSeedRepository(),
      new FakeYoutubeOembedClient(),
      properties(false)
    );

    var result = provider.search(context(), intent());

    assertThat(result.items()).isEmpty();
    assertThat(result.status().status()).isEqualTo("disabled");
  }

  @Test
  void mapsKnownVideoSeedsThroughOembedMetadata() {
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      new FakeYoutubeVideoSeedRepository(),
      new FakeYoutubeOembedClient(),
      properties(true)
    );

    var result = provider.search(context(), intent());

    assertThat(result.status().status()).isEqualTo("ok");
    assertThat(result.items()).hasSize(1);
    assertThat(result.items().get(0).provider()).isEqualTo("youtube");
    assertThat(result.items().get(0).type()).isEqualTo("youtube_video");
    assertThat(result.items().get(0).title()).isEqualTo("oEmbed title");
    assertThat(result.items().get(0).imageUrl()).isEqualTo("https://img.youtube.test/thumb.jpg");
    assertThat(result.items().get(0).creatorName()).isEqualTo("oEmbed author");
    assertThat(result.items().get(0).url()).isEqualTo("https://www.youtube.com/watch?v=8GQZuzIdeQQ");
    assertThat(result.items().get(0).affiliate()).isFalse();
  }

  @Test
  void keepsFallbackVideoCardWhenOembedLookupFails() {
    YoutubeRecommendationProvider provider = new YoutubeRecommendationProvider(
      new FakeYoutubeVideoSeedRepository(),
      url -> {
        throw new RuntimeException("not available");
      },
      properties(true)
    );

    var result = provider.search(context(), intent());

    assertThat(result.items()).hasSize(1);
    assertThat(result.items().get(0).title()).isEqualTo("fallback title");
    assertThat(result.items().get(0).imageUrl()).isEqualTo("https://i.ytimg.com/vi/8GQZuzIdeQQ/hqdefault.jpg");
    assertThat(result.items().get(0).creatorName()).isEqualTo("YouTube");
  }

  private SimulatorProperties.Recommendations.Youtube properties(boolean enabled) {
    SimulatorProperties.Recommendations.Youtube properties = new SimulatorProperties.Recommendations.Youtube();
    properties.setEnabled(enabled);
    properties.setMaxItems(1);
    return properties;
  }

  private RecommendationIntent intent() {
    return new RecommendationIntent(
      "career_change",
      "developer",
      List.of("youtube_video"),
      List.of(),
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

  private static class FakeYoutubeVideoSeedRepository implements YoutubeVideoSeedRepository {
    @Override
    public List<YoutubeVideoSeed> findByTopic(String locale, String topic, int limit) {
      return List.of(
        new YoutubeVideoSeed(
          "seed-1",
          "ko",
          "career_change",
          "8GQZuzIdeQQ",
          "",
          "fallback title",
          "fallback description",
          List.of("career_change"),
          0.8
        )
      );
    }
  }

  private static class FakeYoutubeOembedClient implements YoutubeOembedClient {
    @Override
    public YoutubeOembedMetadata fetch(String youtubeUrl) {
      return new YoutubeOembedMetadata(
        "oEmbed title",
        "https://img.youtube.test/thumb.jpg",
        "oEmbed author"
      );
    }
  }
}
