package com.lifesimulator.backend.recommendation.core;

import java.util.List;

public interface RecommendationCatalogRepository {
  List<RecommendationCatalogItem> findCandidates(RecommendationCatalogQuery query);
}
