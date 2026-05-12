package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.recommendation.core.DecisionContext;
import com.lifesimulator.backend.recommendation.core.RecommendationContext;
import com.lifesimulator.backend.recommendation.core.RecommendationIntent;
import com.lifesimulator.backend.recommendation.core.ResultContext;
import com.lifesimulator.backend.recommendation.core.UserContext;
import com.lifesimulator.backend.recommendation.intent.DeterministicRecommendationIntentExtractor;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeterministicRecommendationIntentExtractorTests {

  private final DeterministicRecommendationIntentExtractor extractor = new DeterministicRecommendationIntentExtractor();

  @Test
  void extractsCareerIntentFromPortableContext() {
    RecommendationIntent intent = extractor.extract(context(
      "developer",
      List.of("stability", "growth"),
      "이직과 성장 정체를 고민 중입니다",
      List.of("잔류", "이직"),
      "커리어 성장과 안정성의 균형이 중요합니다.",
      List.of("growth"),
      List.of()
    )
    );

    assertThat(intent.topic()).isEqualTo("career_change");
    assertThat(intent.productTypes()).contains("book", "template");
    assertThat(intent.queries()).extracting("provider").containsOnly("catalog");
  }

  @Test
  void doesNotClassifyGenericGrowthAsCareerWithoutCareerContext() {
    RecommendationIntent intent = extractor.extract(context(
      "",
      List.of("growth"),
      "올해 개인적인 성장과 생활 균형을 위한 선택을 고민합니다.",
      List.of("선택 A", "선택 B"),
      "목표와 실행 가능성을 나눠서 볼 필요가 있습니다.",
      List.of("growth"),
      List.of("다음 행동을 작게 나누세요")
    )
    );

    assertThat(intent.topic()).isEqualTo("general_decision_support");
  }

  @Test
  void extractsFinanceIntentFromBudgetAndSavingsContext() {
    RecommendationIntent intent = extractor.extract(context(
      "",
      List.of("stability"),
      "생활비와 저축 때문에 선택 비용을 계산해야 합니다.",
      List.of("바로 실행", "3개월 대기"),
      "예산과 비상금을 먼저 확인해야 합니다.",
      List.of("budget"),
      List.of("월 지출을 점검하세요")
    )
    );

    assertThat(intent.topic()).isEqualTo("financial_planning");
  }

  @Test
  void extractsRelationshipIntentFromConflictConversationContext() {
    RecommendationIntent intent = extractor.extract(context(
      "",
      List.of("connection"),
      "가족과의 관계 갈등을 어떻게 대화할지 고민입니다.",
      List.of("대화한다", "거리를 둔다"),
      "요청과 경계선을 분리해서 말하는 것이 중요합니다.",
      List.of("relationship"),
      List.of("대화 질문을 준비하세요")
    )
    );

    assertThat(intent.topic()).isEqualTo("relationship");
  }

  @Test
  void extractsLearningIntentFromExamContext() {
    RecommendationIntent intent = extractor.extract(context(
      "",
      List.of("growth"),
      "자격증 시험 준비와 대학원 지원 중 고민입니다.",
      List.of("자격증", "대학원"),
      "학습 계획과 복습 주기를 정해야 합니다.",
      List.of("study"),
      List.of("주차별 공부 계획을 세우세요")
    )
    );

    assertThat(intent.topic()).isEqualTo("learning");
  }

  @Test
  void extractsWellbeingIntentFromBurnoutContext() {
    RecommendationIntent intent = extractor.extract(context(
      "",
      List.of("wellbeing"),
      "번아웃과 스트레스 때문에 휴식이 필요한지 고민입니다.",
      List.of("쉬기", "계속 진행"),
      "수면과 회복 시간을 먼저 확보해야 합니다.",
      List.of("health"),
      List.of("부담 신호를 기록하세요")
    )
    );

    assertThat(intent.topic()).isEqualTo("wellbeing");
  }

  private RecommendationContext context(
    String job,
    List<String> priorities,
    String topicText,
    List<String> optionLabels,
    String advisorReason,
    List<String> plannerFactors,
    List<String> suggestedActions
  ) {
    return new RecommendationContext(
      "request-1",
      "ko",
      new UserContext(job, priorities, "low"),
      new DecisionContext(topicText, optionLabels, "B"),
      new ResultContext(advisorReason, plannerFactors, suggestedActions, ""),
      List.of("catalog"),
      3
    );
  }
}
