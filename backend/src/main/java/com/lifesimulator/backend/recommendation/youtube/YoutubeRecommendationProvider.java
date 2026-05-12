package com.lifesimulator.backend.recommendation.youtube;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.ProviderStatus;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationItem;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationProviderResult;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class YoutubeRecommendationProvider implements RecommendationProvider {

  public static final String PROVIDER_NAME = "youtube";

  private final YoutubeSearchClient searchClient;
  private final SimulatorProperties.Recommendations.Youtube properties;

  public YoutubeRecommendationProvider(
    YoutubeSearchClient searchClient,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this.searchClient = searchClient;
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
        ProviderStatus.disabled(name(), "YouTube Search provider is disabled")
      );
    }
    if (!properties.hasApiKey()) {
      return disabled("YouTube Data API key is not configured");
    }

    List<YoutubeSearchRequest> requests = requests(context, intent);
    if (requests.isEmpty()) {
      return new RecommendationProviderResult(name(), List.of(), ProviderStatus.ok(name(), 0));
    }

    List<RecommendationItem> items = new ArrayList<>();
    Set<String> seenVideoIds = new LinkedHashSet<>();
    for (YoutubeSearchRequest request : requests) {
      List<YoutubeSearchVideo> videos = searchClient.search(request);
      for (YoutubeSearchVideo video : videos) {
        if (seenVideoIds.add(video.videoId())) {
          items.add(toRecommendationItem(context, intent, video));
        }
        if (items.size() >= properties.getMaxItems()) {
          break;
        }
      }
      if (items.size() >= properties.getMaxItems()) {
        break;
      }
    }
    return new RecommendationProviderResult(name(), items, ProviderStatus.ok(name(), items.size()));
  }

  private RecommendationProviderResult disabled(String message) {
    return new RecommendationProviderResult(name(), List.of(), ProviderStatus.disabled(name(), message));
  }

  private List<YoutubeSearchRequest> requests(
    RecommendationContext context,
    RecommendationIntent intent
  ) {
    Set<String> seenQueries = new LinkedHashSet<>();
    List<YoutubeSearchRequest> requests = new ArrayList<>();

    for (RecommendationQuery query : intent.queries()) {
      if (requests.size() >= properties.getMaxQueries()) {
        break;
      }
      String value = query.query();
      if (!value.isBlank() && seenQueries.add(normalize(value))) {
        requests.add(new YoutubeSearchRequest(value, context.locale(), properties.getMaxItems()));
      }
    }

    if (requests.isEmpty()) {
      requests.add(new YoutubeSearchRequest(
        topicQuery(context, intent.topic()),
        context.locale(),
        properties.getMaxItems()
      ));
    }

    return requests;
  }

  private String topicQuery(RecommendationContext context, String topic) {
    boolean korean = context.locale().toLowerCase(Locale.ROOT).startsWith("ko");
    if (!korean) {
      return switch (topic) {
        case "career_change" -> "career change advice";
        case "financial_planning" -> "personal finance planning";
        case "relationship" -> "relationship communication advice";
        case "learning" -> "study planning strategy";
        case "wellbeing" -> "burnout recovery habits";
        default -> "decision making framework";
      };
    }
    return switch (topic) {
      case "career_change" -> "커리어 전환 조언";
      case "financial_planning" -> "재정 계획";
      case "relationship" -> "관계 대화";
      case "learning" -> "학습 계획";
      case "wellbeing" -> "번아웃 회복";
      default -> "의사결정 방법";
    };
  }

  private RecommendationItem toRecommendationItem(
    RecommendationContext context,
    RecommendationIntent intent,
    YoutubeSearchVideo video
  ) {
    return new RecommendationItem(
      "youtube:video:" + video.videoId(),
      name(),
      "youtube_video",
      firstNonBlank(video.title(), "YouTube video"),
      truncate(video.description(), 180),
      video.watchUrl(),
      firstNonBlank(video.thumbnailUrl(), YoutubeVideoUrls.thumbnailUrl(video.videoId())),
      null,
      "YouTube",
      firstNonBlank(video.channelTitle(), "YouTube"),
      false,
      false,
      why(context, intent),
      0.62,
      tags(intent, video)
    );
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

  private List<String> tags(RecommendationIntent intent, YoutubeSearchVideo video) {
    Set<String> tags = new LinkedHashSet<>();
    tags.add(intent.topic());
    tags.add("youtube");
    tags.add("youtube_video");
    tags.add(video.channelTitle());
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

  private String truncate(String value, int maxLength) {
    if (value == null || value.length() <= maxLength) {
      return value == null ? "" : value;
    }
    return value.substring(0, maxLength - 1).trim() + "...";
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }
}
