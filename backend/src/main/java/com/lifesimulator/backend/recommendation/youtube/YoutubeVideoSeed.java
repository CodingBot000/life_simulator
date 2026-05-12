package com.lifesimulator.backend.recommendation.youtube;

import java.util.List;

public record YoutubeVideoSeed(
  String id,
  String locale,
  String topic,
  String videoId,
  String url,
  String title,
  String description,
  List<String> tags,
  double priorityScore
) {
  public YoutubeVideoSeed {
    id = normalize(id);
    locale = normalize(locale).isBlank() ? "ko" : normalize(locale);
    topic = normalize(topic).isBlank() ? "general_decision_support" : normalize(topic);
    videoId = normalize(videoId);
    url = normalize(url);
    title = normalize(title);
    description = normalize(description);
    tags = tags == null ? List.of() : List.copyOf(tags);
    priorityScore = clamp(priorityScore);
  }

  public String resolvedVideoId() {
    if (!videoId.isBlank()) {
      return videoId;
    }
    return YoutubeVideoUrls.extractVideoId(url);
  }

  public String watchUrl() {
    String resolved = resolvedVideoId();
    return resolved.isBlank() ? url : YoutubeVideoUrls.watchUrl(resolved);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }

  private static double clamp(double value) {
    if (Double.isNaN(value) || value < 0) {
      return 0.5;
    }
    return Math.min(1, value);
  }
}
