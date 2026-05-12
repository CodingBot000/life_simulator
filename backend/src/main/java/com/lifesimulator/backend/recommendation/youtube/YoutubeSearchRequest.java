package com.lifesimulator.backend.recommendation.youtube;

public record YoutubeSearchRequest(
  String query,
  String locale,
  int maxResults
) {
  public YoutubeSearchRequest {
    query = normalize(query);
    locale = normalize(locale).isBlank() ? "ko" : normalize(locale);
    maxResults = Math.max(1, Math.min(maxResults, 10));
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
