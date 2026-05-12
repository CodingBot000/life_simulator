package com.lifesimulator.backend.recommendation.naver;

public record NaverSearchRequest(
  NaverSearchType type,
  String query,
  int display,
  String sort
) {
  public NaverSearchRequest {
    query = query == null ? "" : query.trim();
    display = Math.max(1, Math.min(100, display));
    sort = sort == null || sort.isBlank() ? "sim" : sort.trim();
  }
}
