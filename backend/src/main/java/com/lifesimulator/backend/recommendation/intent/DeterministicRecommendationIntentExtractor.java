package com.lifesimulator.backend.recommendation.intent;

import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.RecommendationIntentExtractor;
import com.lifesimulator.backend.recommendation.core.RecommendationQuery;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class DeterministicRecommendationIntentExtractor implements RecommendationIntentExtractor {

  @Override
  public RecommendationIntent extract(RecommendationContext context) {
    String topic = topicFor(context);
    boolean korean = "ko".equalsIgnoreCase(context.locale());
    return new RecommendationIntent(
      topic,
      audienceContext(topic, korean),
      productTypes(topic),
      queries(topic, korean),
      negativeFilters(topic),
      safetyLevel(topic)
    );
  }

  private String topicFor(RecommendationContext context) {
    String text = normalize(
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

    if (containsAny(text, "career", "job", "회사", "연봉", "이직", "커리어", "직무", "성장")) {
      return "career_change";
    }
    if (containsAny(text, "money", "income", "finance", "재정", "저축", "투자", "소득", "수입")) {
      return "financial_planning";
    }
    if (containsAny(text, "relationship", "연애", "결혼", "가족", "친구", "관계")) {
      return "relationship";
    }
    if (containsAny(text, "study", "learning", "시험", "학습", "대학원", "자격증", "공부")) {
      return "learning";
    }
    if (containsAny(text, "burnout", "stress", "health", "스트레스", "번아웃", "마음", "건강")) {
      return "wellbeing";
    }
    return "general_decision_support";
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

  private List<RecommendationQuery> queries(String topic, boolean korean) {
    if (!korean) {
      return switch (topic) {
        case "career_change" -> List.of(query("career change guide"), query("job transition checklist"));
        case "financial_planning" -> List.of(query("personal finance planning"), query("budget decision template"));
        case "relationship" -> List.of(query("relationship conversation guide"), query("conflict communication"));
        case "learning" -> List.of(query("study planning template"), query("learning strategy"));
        case "wellbeing" -> List.of(query("burnout recovery habits"), query("stress management"));
        default -> List.of(query("decision making book"), query("goal planning template"));
      };
    }
    return switch (topic) {
      case "career_change" -> List.of(query("커리어 전환"), query("이직 준비"), query("성장 정체"));
      case "financial_planning" -> List.of(query("재정 계획"), query("예산 관리"), query("선택 비용"));
      case "relationship" -> List.of(query("관계 대화"), query("갈등 대화"), query("관계 회복"));
      case "learning" -> List.of(query("학습 계획"), query("공부 습관"), query("자격증 준비"));
      case "wellbeing" -> List.of(query("번아웃 회복"), query("스트레스 관리"), query("생활 루틴"));
      default -> List.of(query("의사결정 책"), query("목표 설정"), query("습관 관리"));
    };
  }

  private RecommendationQuery query(String query) {
    return new RecommendationQuery("catalog", query, "deterministic intent match");
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

  private boolean containsAny(String text, String... needles) {
    for (String needle : needles) {
      if (text.contains(needle.toLowerCase(Locale.ROOT))) {
        return true;
      }
    }
    return false;
  }

  private String normalize(String text) {
    return text == null ? "" : text.toLowerCase(Locale.ROOT);
  }
}
