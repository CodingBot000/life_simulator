package com.lifesimulator.backend.recommendation.core;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class RecommendationRanker {

  public List<RecommendationItem> rank(
    RecommendationContext context,
    RecommendationIntent intent,
    List<RecommendationItem> items
  ) {
    return items
      .stream()
      .map(item -> item.withRank(score(context, intent, item), why(context, intent, item)))
      .sorted(
        Comparator
          .comparingInt(this::recommendationScore)
          .reversed()
          .thenComparingInt(this::sameScoreProviderRank)
      )
      .toList();
  }

  private double score(
    RecommendationContext context,
    RecommendationIntent intent,
    RecommendationItem item
  ) {
    double score = item.rankScore() * 0.35;
    if (matchesTopic(intent, item)) {
      score += 0.2;
    }
    if (matchesProductType(intent, item)) {
      score += 0.1;
    }
    if (matchesQueries(intent, item)) {
      score += 0.2;
    }
    if (matchesContext(context, item)) {
      score += 0.15;
    }
    return Math.min(1, score);
  }

  private boolean matchesTopic(RecommendationIntent intent, RecommendationItem item) {
    String topic = normalize(intent.topic());
    return item.tags().stream().map(this::normalize).anyMatch(tag -> tag.equals(topic));
  }

  private boolean matchesProductType(RecommendationIntent intent, RecommendationItem item) {
    String type = normalize(item.type());
    return intent.productTypes().stream().map(this::normalize).anyMatch(type::equals);
  }

  private boolean matchesContext(RecommendationContext context, RecommendationItem item) {
    String combined = normalize(
      context.decision().topicText() +
      " " +
      String.join(" ", context.decision().optionLabels()) +
      " " +
      context.result().advisorReason() +
      " " +
      String.join(" ", context.result().plannerFactors()) +
      " " +
      String.join(" ", context.result().suggestedActions()) +
      " " +
      context.user().job()
    );
    String itemText = itemText(item);
    return item
      .tags()
      .stream()
      .map(this::normalize)
      .anyMatch(combined::contains) ||
    meaningfulTokens(combined).stream().anyMatch(itemText::contains);
  }

  private boolean matchesQueries(RecommendationIntent intent, RecommendationItem item) {
    String itemText = itemText(item);
    return intent
      .queries()
      .stream()
      .flatMap(query -> meaningfulTokens(query.query()).stream())
      .anyMatch(itemText::contains);
  }

  private int sameScoreProviderRank(RecommendationItem item) {
    String provider = normalize(item.provider());
    String type = normalize(item.type());
    if ("naver".equals(provider) && "product".equals(type)) {
      return 0;
    }
    if ("naver".equals(provider) && "book".equals(type)) {
      return 1;
    }
    if ("youtube".equals(provider)) {
      return 2;
    }
    if ("catalog".equals(provider)) {
      return 4;
    }
    return 3;
  }

  private int recommendationScore(RecommendationItem item) {
    return (int) Math.round(item.rankScore() * 100);
  }

  private List<String> meaningfulTokens(String value) {
    return List
      .of(normalize(value).split("[\\s,./|]+"))
      .stream()
      .map(String::trim)
      .filter(token -> token.length() >= 2)
      .filter(token -> !List.of("and", "the", "for", "with", "하는", "위한").contains(token))
      .toList();
  }

  private String itemText(RecommendationItem item) {
    return normalize(
      item.title() + " " + item.description() + " " + item.type() + " " + String.join(" ", item.tags())
    );
  }

  private String why(
    RecommendationContext context,
    RecommendationIntent intent,
    RecommendationItem item
  ) {
    if (!item.why().isBlank()) {
      return item.why();
    }
    if ("ko".equalsIgnoreCase(context.locale())) {
      return "현재 결과가 " + readableTopic(intent.topic()) + " 주제와 연결되어 있어 후속 실행 기준을 보강합니다.";
    }
    return "This item supports the follow-up work implied by the " + intent.topic() + " result.";
  }

  private String readableTopic(String topic) {
    return switch (topic) {
      case "career_change" -> "커리어";
      case "financial_planning" -> "재정";
      case "relationship" -> "관계";
      case "learning" -> "학습";
      case "wellbeing" -> "마음/생활 관리";
      default -> "의사결정";
    };
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }
}
