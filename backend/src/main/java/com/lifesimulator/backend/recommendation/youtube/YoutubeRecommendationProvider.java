package com.lifesimulator.backend.recommendation.youtube;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.ProviderStatus;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationItem;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationProviderResult;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class YoutubeRecommendationProvider implements RecommendationProvider {

  public static final String PROVIDER_NAME = "youtube";

  private final YoutubeVideoSeedRepository seedRepository;
  private final YoutubeOembedClient oembedClient;
  private final SimulatorProperties.Recommendations.Youtube properties;

  public YoutubeRecommendationProvider(
    YoutubeVideoSeedRepository seedRepository,
    YoutubeOembedClient oembedClient,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this.seedRepository = seedRepository;
    this.oembedClient = oembedClient;
    this.properties = properties;
  }

  @Override
  public String name() {
    return PROVIDER_NAME;
  }

  @Override
  public RecommendationProviderResult search(
    RecommendationContext context,
    RecommendationIntent intent
  ) {
    if (!properties.isEnabled()) {
      return new RecommendationProviderResult(
        name(),
        List.of(),
        ProviderStatus.disabled(name(), "YouTube known-video provider is disabled")
      );
    }

    List<YoutubeVideoSeed> seeds = seedRepository.findByTopic(
      context.locale(),
      intent.topic(),
      properties.getMaxItems()
    );
    List<RecommendationItem> items = seeds
      .stream()
      .map(seed -> toRecommendationItem(context, intent, seed))
      .toList();
    return new RecommendationProviderResult(name(), items, ProviderStatus.ok(name(), items.size()));
  }

  private RecommendationItem toRecommendationItem(
    RecommendationContext context,
    RecommendationIntent intent,
    YoutubeVideoSeed seed
  ) {
    String videoId = seed.resolvedVideoId();
    String watchUrl = YoutubeVideoUrls.watchUrl(videoId);
    YoutubeOembedMetadata metadata = metadata(watchUrl);
    return new RecommendationItem(
      seed.id().isBlank() ? "youtube:" + videoId : seed.id(),
      name(),
      "youtube_video",
      firstNonBlank(metadata.title(), seed.title(), "YouTube video"),
      seed.description(),
      watchUrl,
      firstNonBlank(metadata.thumbnailUrl(), YoutubeVideoUrls.thumbnailUrl(videoId)),
      null,
      "YouTube",
      firstNonBlank(metadata.authorName(), "YouTube"),
      false,
      false,
      why(context, intent),
      seed.priorityScore(),
      tags(intent, seed)
    );
  }

  private YoutubeOembedMetadata metadata(String watchUrl) {
    try {
      return oembedClient.fetch(watchUrl);
    } catch (RuntimeException ignored) {
      return new YoutubeOembedMetadata("", "", "");
    }
  }

  private String why(RecommendationContext context, RecommendationIntent intent) {
    if ("ko".equalsIgnoreCase(context.locale())) {
      return switch (intent.topic()) {
        case "career_change" -> "커리어 선택 이후 관점을 넓히는 데 도움이 되는 YouTube 영상입니다.";
        case "financial_planning" -> "재정 선택의 기준과 우선순위를 점검하는 데 도움이 되는 YouTube 영상입니다.";
        case "relationship" -> "관계 선택 이후 대화와 감정 기준을 점검하는 데 도움이 되는 YouTube 영상입니다.";
        case "learning" -> "학습 계획을 꾸준한 실행으로 연결하는 데 도움이 되는 YouTube 영상입니다.";
        case "wellbeing" -> "스트레스와 회복 루틴을 점검하는 데 도움이 되는 YouTube 영상입니다.";
        default -> "현재 의사결정 결과를 실행으로 옮기기 전에 참고할 수 있는 YouTube 영상입니다.";
      };
    }
    return "This YouTube video can help frame the next step after the decision result.";
  }

  private List<String> tags(RecommendationIntent intent, YoutubeVideoSeed seed) {
    Set<String> tags = new LinkedHashSet<>();
    tags.add(intent.topic());
    tags.add("youtube");
    tags.add("youtube_video");
    tags.addAll(seed.tags());
    return new ArrayList<>(tags);
  }

  private String firstNonBlank(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return "";
  }
}
