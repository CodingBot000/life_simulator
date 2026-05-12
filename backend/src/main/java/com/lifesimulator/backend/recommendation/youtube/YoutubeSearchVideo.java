package com.lifesimulator.backend.recommendation.youtube;

public record YoutubeSearchVideo(
  String videoId,
  String title,
  String description,
  String thumbnailUrl,
  String channelTitle
) {
  public YoutubeSearchVideo {
    videoId = normalize(videoId);
    title = normalize(title);
    description = normalize(description);
    thumbnailUrl = normalize(thumbnailUrl);
    channelTitle = normalize(channelTitle);
  }

  public String watchUrl() {
    return YoutubeVideoUrls.watchUrl(videoId);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
