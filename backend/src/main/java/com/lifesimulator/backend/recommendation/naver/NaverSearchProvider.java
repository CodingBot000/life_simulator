package com.lifesimulator.backend.recommendation.naver;

import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.recommendation.core.ProviderStatus;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationItem;
import com.lifesimulator.backend.recommendation.core.RecommendationProvider;
import com.lifesimulator.backend.recommendation.core.RecommendationProviderResult;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class NaverSearchProvider implements RecommendationProvider {

  public static final String PROVIDER_NAME = "naver";

  private final NaverSearchClient client;
  private final SimulatorProperties.Recommendations.Naver properties;

  public NaverSearchProvider(
    NaverSearchClient client,
    SimulatorProperties.Recommendations.Naver properties
  ) {
    this.client = client;
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
      return disabled("Naver Search provider is disabled");
    }
    if (!properties.hasCredentials()) {
      return disabled("Naver Search credentials are not configured");
    }
    if (!context.locale().toLowerCase(Locale.ROOT).startsWith("ko")) {
      return disabled("Naver Search provider is configured for Korean recommendations");
    }

    List<NaverSearchRequest> requests = requests(intent);
    if (requests.isEmpty()) {
      return new RecommendationProviderResult(name(), List.of(), ProviderStatus.ok(name(), 0));
    }

    List<RecommendationItem> items = new ArrayList<>();
    for (NaverSearchRequest request : requests) {
      List<NaverSearchDocument> documents = client.search(request);
      for (NaverSearchDocument document : documents) {
        if (!document.title().isBlank() && !document.link().isBlank()) {
          items.add(toRecommendationItem(context, intent, request, document));
        }
      }
    }
    return new RecommendationProviderResult(name(), items, ProviderStatus.ok(name(), items.size()));
  }

  private RecommendationProviderResult disabled(String message) {
    return new RecommendationProviderResult(name(), List.of(), ProviderStatus.disabled(name(), message));
  }

  private List<NaverSearchRequest> requests(RecommendationIntent intent) {
    int display = properties.getDisplay();
    Set<String> seenBookQueries = new LinkedHashSet<>();
    List<NaverSearchRequest> requests = new ArrayList<>();

    for (RecommendationQuery query : intent.queries()) {
      if (seenBookQueries.size() >= properties.getMaxQueries()) {
        break;
      }
      String value = query.query();
      if (!value.isBlank() && seenBookQueries.add(normalize(value))) {
        requests.add(new NaverSearchRequest(NaverSearchType.BOOK, value, display, "sim"));
      }
    }

    if (properties.isShoppingEnabled()) {
      String shoppingQuery = shoppingQuery(intent.topic());
      requests.add(new NaverSearchRequest(NaverSearchType.SHOPPING, shoppingQuery, display, "sim"));
    }

    return requests;
  }

  private String shoppingQuery(String topic) {
    return switch (topic) {
      case "career_change" -> "커리어 플래너";
      case "financial_planning" -> "가계부 플래너";
      case "relationship" -> "대화 카드";
      case "learning" -> "스터디 플래너";
      case "wellbeing" -> "수면 기록 다이어리";
      default -> "목표 관리 플래너";
    };
  }

  private RecommendationItem toRecommendationItem(
    RecommendationContext context,
    RecommendationIntent intent,
    NaverSearchRequest request,
    NaverSearchDocument document
  ) {
    return new RecommendationItem(
      id(document),
      name(),
      itemType(document.type()),
      document.title(),
      description(document),
      document.link(),
      document.image(),
      priceLabel(document),
      mallName(document),
      creatorName(document),
      false,
      false,
      why(context, intent, request, document),
      0.55,
      tags(intent, document)
    );
  }

  private String id(NaverSearchDocument document) {
    String key = switch (document.type()) {
      case BOOK -> !document.link().isBlank() ? document.link() : document.title();
      case SHOPPING -> !document.productId().isBlank()
        ? document.productId()
        : document.link() + document.title();
    };
    return "naver:" + document.type().itemType() + ":" + Integer.toHexString(hash(key));
  }

  private int hash(String value) {
    int result = 1;
    for (byte current : value.getBytes(StandardCharsets.UTF_8)) {
      result = 31 * result + current;
    }
    return result;
  }

  private String itemType(NaverSearchType type) {
    return switch (type) {
      case BOOK -> "book";
      case SHOPPING -> "product";
    };
  }

  private String description(NaverSearchDocument document) {
    if (document.type() == NaverSearchType.BOOK) {
      String source = document.description().isBlank()
        ? joinNonBlank(document.author(), document.publisher())
        : document.description();
      return truncate(source, 140);
    }
    return joinNonBlank(document.category1(), document.category2(), document.category3(), document.brand());
  }

  private String priceLabel(NaverSearchDocument document) {
    String value = document.type() == NaverSearchType.BOOK ? document.discount() : document.lprice();
    if (value.isBlank() || "0".equals(value)) {
      return null;
    }
    try {
      int price = Integer.parseInt(value);
      return NumberFormat.getIntegerInstance(Locale.KOREA).format(price) + "원";
    } catch (NumberFormatException ignored) {
      return value;
    }
  }

  private String mallName(NaverSearchDocument document) {
    return document.type() == NaverSearchType.SHOPPING ? document.mallName() : document.publisher();
  }

  private String creatorName(NaverSearchDocument document) {
    if (document.type() == NaverSearchType.BOOK) {
      return document.author();
    }
    return joinNonBlank(document.brand(), document.maker());
  }

  private String why(
    RecommendationContext context,
    RecommendationIntent intent,
    NaverSearchRequest request,
    NaverSearchDocument document
  ) {
    String topic = readableTopic(intent.topic());
    if (document.type() == NaverSearchType.BOOK) {
      return topic + " 판단 이후 더 깊게 검토할 수 있는 네이버 도서 검색 결과입니다.";
    }
    return topic + " 실행을 보조할 수 있는 네이버 쇼핑 검색 결과입니다.";
  }

  private String readableTopic(String topic) {
    return switch (topic) {
      case "career_change" -> "커리어";
      case "financial_planning" -> "재정";
      case "relationship" -> "관계";
      case "learning" -> "학습";
      case "wellbeing" -> "생활 관리";
      default -> "의사결정";
    };
  }

  private List<String> tags(RecommendationIntent intent, NaverSearchDocument document) {
    List<String> tags = new ArrayList<>();
    tags.add(intent.topic());
    tags.add("naver");
    tags.add(itemType(document.type()));
    if (!document.category1().isBlank()) {
      tags.add(document.category1());
    }
    if (!document.category2().isBlank()) {
      tags.add(document.category2());
    }
    return tags;
  }

  private String joinNonBlank(String... values) {
    return String.join(
      " / ",
      List
        .of(values)
        .stream()
        .filter(value -> value != null && !value.isBlank())
        .toList()
    );
  }

  private String truncate(String value, int maxLength) {
    if (value.length() <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength - 1).trim() + "...";
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }
}
