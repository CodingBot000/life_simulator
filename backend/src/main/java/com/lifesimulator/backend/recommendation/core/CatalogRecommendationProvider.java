package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public class CatalogRecommendationProvider implements RecommendationProvider {

  public static final String PROVIDER_NAME = "catalog";

  private final RecommendationCatalogRepository catalogRepository;

  public CatalogRecommendationProvider(RecommendationCatalogRepository catalogRepository) {
    this.catalogRepository = catalogRepository;
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
    List<String> keywords = intent
      .queries()
      .stream()
      .map(RecommendationQuery::query)
      .filter(query -> !query.isBlank())
      .toList();
    List<RecommendationCatalogItem> candidates = catalogRepository.findCandidates(
      new RecommendationCatalogQuery(context.locale(), intent.topic(), keywords, context.maxItems() * 2)
    );
    List<RecommendationItem> items = candidates
      .stream()
      .map(item -> toRecommendationItem(context, intent, item))
      .toList();
    return new RecommendationProviderResult(name(), items, ProviderStatus.ok(name(), items.size()));
  }

  private RecommendationItem toRecommendationItem(
    RecommendationContext context,
    RecommendationIntent intent,
    RecommendationCatalogItem item
  ) {
    return new RecommendationItem(
      item.id(),
      item.provider(),
      item.itemType(),
      item.title(),
      item.description(),
      item.url(),
      item.imageUrl(),
      item.priceLabel(),
      item.mallName(),
      item.creatorName(),
      item.affiliate(),
      item.sponsored(),
      why(context, intent),
      item.priorityScore(),
      item.tags()
    );
  }

  private String why(RecommendationContext context, RecommendationIntent intent) {
    if ("ko".equalsIgnoreCase(context.locale())) {
      return switch (intent.topic()) {
        case "career_change" -> "커리어 선택 이후 바로 점검할 기준과 실행 준비를 보강합니다.";
        case "financial_planning" -> "재정 안정성과 선택 비용을 더 구체적으로 점검하는 데 도움이 됩니다.";
        case "relationship" -> "관계 선택에서 대화 기준과 후속 행동을 정리하는 데 도움이 됩니다.";
        case "learning" -> "학습 선택을 실행 가능한 계획으로 바꾸는 데 도움이 됩니다.";
        case "wellbeing" -> "부담을 낮추고 생활 리듬을 점검하는 데 도움이 됩니다.";
        default -> "현재 의사결정 결과를 실행 가능한 다음 행동으로 연결합니다.";
      };
    }
    return "This item helps turn the decision result into a concrete next step.";
  }
}
