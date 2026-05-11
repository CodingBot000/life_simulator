package com.lifesimulator.backend.recommendation.intent;

import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class DeterministicRecommendationIntentExtractor implements RecommendationIntentExtractor {

  private static final List<TopicDefinition> TOPICS = List.of(
    new TopicDefinition(
      "career_change",
      List.of("career", "job", "회사", "연봉", "이직", "커리어", "직무", "퇴사", "면접", "포트폴리오"),
      List.of("growth", "성장", "일", "업무", "developer", "개발자")
    ),
    new TopicDefinition(
      "financial_planning",
      List.of("money", "income", "finance", "budget", "재정", "저축", "투자", "소득", "수입", "예산", "지출", "생활비", "비상금"),
      List.of("비용", "안정", "현금", "소비")
    ),
    new TopicDefinition(
      "relationship",
      List.of("relationship", "연애", "결혼", "가족", "친구", "관계", "갈등", "대화", "이별", "파트너"),
      List.of("신뢰", "감정", "소통", "외로움")
    ),
    new TopicDefinition(
      "learning",
      List.of("study", "learning", "시험", "학습", "대학원", "자격증", "공부", "강의", "수업", "입시"),
      List.of("성적", "역량", "스킬", "지식")
    ),
    new TopicDefinition(
      "wellbeing",
      List.of("burnout", "stress", "health", "스트레스", "번아웃", "마음", "건강", "수면", "휴식", "회복"),
      List.of("피곤", "부담", "불안", "생활", "에너지")
    )
  );

  private static final Map<String, Double> SOURCE_WEIGHTS = Map.of(
    "decision",
    3.0,
    "options",
    2.0,
    "advisor",
    2.0,
    "planner",
    1.4,
    "actions",
    1.4,
    "job",
    0.9,
    "priorities",
    0.6
  );

  private static final double MIN_TOPIC_SCORE = 2.5;

  @Override
  public RecommendationIntent extract(RecommendationContext context) {
    String topic = topicFor(context);
    boolean korean = "ko".equalsIgnoreCase(context.locale());
    return new RecommendationIntent(
      topic,
      audienceContext(topic, korean),
      productTypes(topic),
      queries(topic, korean, context),
      negativeFilters(topic),
      safetyLevel(topic)
    );
  }

  private String topicFor(RecommendationContext context) {
    List<SourceText> sources = List.of(
      new SourceText("decision", context.decision().topicText()),
      new SourceText("options", String.join(" ", context.decision().optionLabels())),
      new SourceText("advisor", context.result().advisorReason()),
      new SourceText("planner", String.join(" ", context.result().plannerFactors())),
      new SourceText("actions", String.join(" ", context.result().suggestedActions())),
      new SourceText("job", context.user().job()),
      new SourceText("priorities", String.join(" ", context.user().priorities()))
    );

    TopicScore best = TOPICS
      .stream()
      .map(topic -> new TopicScore(topic.name(), score(topic, sources)))
      .max(Comparator.comparingDouble(TopicScore::score))
      .orElse(new TopicScore("general_decision_support", 0));

    return best.score() >= MIN_TOPIC_SCORE ? best.topic() : "general_decision_support";
  }

  private String audienceContext(String topic, boolean korean) {
    if (!korean) {
      return switch (topic) {
        case "career_change" -> "A user considering a career move or growth tradeoff";
        case "financial_planning" -> "A user weighing financial stability and cost";
        case "relationship" -> "A user making a relationship decision";
        case "learning" -> "A user planning a learning or credential path";
        case "wellbeing" -> "A user trying to reduce load and protect wellbeing";
        default -> "A user who needs practical decision support";
      };
    }
    return switch (topic) {
      case "career_change" -> "커리어 전환과 성장 선택을 고민하는 사용자";
      case "financial_planning" -> "재정 안정성과 선택 비용을 점검해야 하는 사용자";
      case "relationship" -> "관계 선택의 기준과 후속 대화를 정리해야 하는 사용자";
      case "learning" -> "학습 선택을 실행 계획으로 바꾸려는 사용자";
      case "wellbeing" -> "부담을 줄이고 생활 리듬을 점검해야 하는 사용자";
      default -> "의사결정 기준과 다음 행동을 정리해야 하는 사용자";
    };
  }

  private List<String> productTypes(String topic) {
    return switch (topic) {
      case "career_change" -> List.of("book", "youtube_channel", "course", "template");
      case "financial_planning" -> List.of("book", "template", "course");
      case "relationship" -> List.of("book", "youtube_channel", "template");
      case "learning" -> List.of("book", "course", "template", "youtube_channel");
      case "wellbeing" -> List.of("book", "youtube_channel", "template");
      default -> List.of("book", "template", "youtube_channel");
    };
  }

  private List<RecommendationQuery> queries(
    String topic,
    boolean korean,
    RecommendationContext context
  ) {
    List<RecommendationQuery> queries = new ArrayList<>();
    if (!korean) {
      queries.addAll(
        switch (topic) {
          case "career_change" -> List.of(query("career change guide"), query("job transition checklist"));
          case "financial_planning" -> List.of(query("personal finance planning"), query("budget decision template"));
          case "relationship" -> List.of(query("relationship conversation guide"), query("conflict communication"));
          case "learning" -> List.of(query("study planning template"), query("learning strategy"));
          case "wellbeing" -> List.of(query("burnout recovery habits"), query("stress management"));
          default -> List.of(query("decision making book"), query("goal planning template"));
        }
      );
      return dedupe(queries);
    }
    queries.addAll(
      switch (topic) {
        case "career_change" -> List.of(query("커리어 전환"), query("이직 준비"), query("직무 전환"));
        case "financial_planning" -> List.of(query("재정 계획"), query("예산 관리"), query("선택 비용"));
        case "relationship" -> List.of(query("관계 대화"), query("갈등 대화"), query("관계 회복"));
        case "learning" -> List.of(query("학습 계획"), query("공부 습관"), query("자격증 준비"));
        case "wellbeing" -> List.of(query("번아웃 회복"), query("스트레스 관리"), query("생활 루틴"));
        default -> List.of(query("의사결정 책"), query("목표 설정"), query("습관 관리"));
      }
    );

    String text = contextText(context);
    if ("career_change".equals(topic)) {
      if (contains(text, "연봉", "소득", "보상")) {
        queries.add(query("연봉 리스크"));
      }
      if (contains(text, "면접", "포트폴리오", "직무")) {
        queries.add(query("면접 포트폴리오"));
      }
    }
    if ("financial_planning".equals(topic) && contains(text, "비상금", "저축", "생활비")) {
      queries.add(query("비상금 저축"));
    }
    if ("relationship".equals(topic) && contains(text, "경계", "거절", "갈등")) {
      queries.add(query("갈등 대화"));
    }
    if ("learning".equals(topic) && contains(text, "자격증", "시험", "복습")) {
      queries.add(query("자격증 시험"));
    }
    if ("wellbeing".equals(topic) && contains(text, "수면", "회복", "부담")) {
      queries.add(query("회복 루틴"));
    }

    return dedupe(queries);
  }

  private RecommendationQuery query(String query) {
    return new RecommendationQuery("catalog", query, "deterministic intent match");
  }

  private List<RecommendationQuery> dedupe(List<RecommendationQuery> queries) {
    Set<String> seen = new LinkedHashSet<>();
    List<RecommendationQuery> deduped = new ArrayList<>();
    for (RecommendationQuery query : queries) {
      if (seen.add(normalize(query.query()))) {
        deduped.add(query);
      }
    }
    return deduped;
  }

  private List<String> negativeFilters(String topic) {
    if ("financial_planning".equals(topic)) {
      return List.of("high_risk_investment", "speculative_trading");
    }
    if ("wellbeing".equals(topic)) {
      return List.of("medical_treatment", "diagnosis_claim");
    }
    return List.of();
  }

  private String safetyLevel(String topic) {
    return switch (topic) {
      case "financial_planning", "wellbeing" -> "sensitive";
      default -> "normal";
    };
  }

  private double score(TopicDefinition topic, List<SourceText> sources) {
    double score = 0;
    for (SourceText source : sources) {
      String text = normalize(source.text());
      if (text.isBlank()) {
        continue;
      }
      double weight = SOURCE_WEIGHTS.getOrDefault(source.name(), 1.0);
      score += countMatches(text, topic.strongKeywords()) * weight;
      score += countMatches(text, topic.weakKeywords()) * weight * 0.35;
    }
    return score;
  }

  private String contextText(RecommendationContext context) {
    return normalize(
      String.join(
        " ",
        context.user().job(),
        String.join(" ", context.user().priorities()),
        context.decision().topicText(),
        String.join(" ", context.decision().optionLabels()),
        context.result().advisorReason(),
        String.join(" ", context.result().plannerFactors()),
        String.join(" ", context.result().suggestedActions())
      )
    );
  }

  private boolean contains(String text, String... keywords) {
    String normalized = normalize(text);
    for (String keyword : keywords) {
      if (normalized.contains(normalize(keyword))) {
        return true;
      }
    }
    return false;
  }

  private long countMatches(String text, List<String> keywords) {
    return keywords
      .stream()
      .map(this::normalize)
      .filter(keyword -> !keyword.isBlank())
      .filter(text::contains)
      .count();
  }

  private String normalize(String text) {
    return text == null ? "" : text.toLowerCase(Locale.ROOT);
  }

  private record TopicDefinition(
    String name,
    List<String> strongKeywords,
    List<String> weakKeywords
  ) {}

  private record SourceText(String name, String text) {}

  private record TopicScore(String topic, double score) {}
}
