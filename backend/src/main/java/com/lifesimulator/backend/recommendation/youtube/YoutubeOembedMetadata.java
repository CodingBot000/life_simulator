package com.lifesimulator.backend.recommendation.youtube;

public record YoutubeOembedMetadata(
  String title,
  String thumbnailUrl,
  String authorName
) {
  public YoutubeOembedMetadata {
    title = normalize(title);
    thumbnailUrl = normalize(thumbnailUrl);
    authorName = normalize(authorName);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
