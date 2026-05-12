package com.lifesimulator.backend.recommendation.youtube;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Pattern;

final class YoutubeVideoUrls {

  private static final Pattern VIDEO_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{11}$");

  private YoutubeVideoUrls() {}

  static String watchUrl(String videoId) {
    return "https://www.youtube.com/watch?v=" + videoId;
  }

  static String embedUrl(String videoId) {
    return "https://www.youtube.com/embed/" + videoId;
  }

  static String thumbnailUrl(String videoId) {
    return "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg";
  }

  static String extractVideoId(String value) {
    String normalized = value == null ? "" : value.trim();
    if (VIDEO_ID_PATTERN.matcher(normalized).matches()) {
      return normalized;
    }
    try {
      URI uri = new URI(normalized);
      String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
      if (host.endsWith("youtu.be")) {
        return firstPathSegment(uri.getPath());
      }
      if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        String path = uri.getPath() == null ? "" : uri.getPath();
        if (path.startsWith("/embed/")) {
          return firstPathSegment(path.substring("/embed/".length()));
        }
        return queryParameter(uri.getRawQuery(), "v");
      }
    } catch (URISyntaxException ignored) {
      return "";
    }
    return "";
  }

  private static String firstPathSegment(String path) {
    String normalized = path == null ? "" : path.replaceFirst("^/+", "");
    String segment = normalized.split("/", 2)[0];
    return VIDEO_ID_PATTERN.matcher(segment).matches() ? segment : "";
  }

  private static String queryParameter(String rawQuery, String name) {
    if (rawQuery == null || rawQuery.isBlank()) {
      return "";
    }
    for (String part : rawQuery.split("&")) {
      String[] pair = part.split("=", 2);
      if (pair.length == 2 && pair[0].equals(name) && VIDEO_ID_PATTERN.matcher(pair[1]).matches()) {
        return pair[1];
      }
    }
    return "";
  }
}
