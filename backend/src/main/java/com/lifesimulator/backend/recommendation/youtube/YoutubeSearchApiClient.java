package com.lifesimulator.backend.recommendation.youtube;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class YoutubeSearchApiClient implements YoutubeSearchClient {

  private static final URI SEARCH_URI = URI.create("https://www.googleapis.com/youtube/v3/search");

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final SimulatorProperties.Recommendations.Youtube properties;

  public YoutubeSearchApiClient(
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this(HttpClient.newHttpClient(), objectMapper, properties);
  }

  YoutubeSearchApiClient(
    HttpClient httpClient,
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Override
  public List<YoutubeSearchVideo> search(YoutubeSearchRequest request) {
    if (!properties.hasApiKey()) {
      throw new YoutubeSearchException("YouTube Data API key is not configured");
    }
    if (request.query().isBlank()) {
      return List.of();
    }

    HttpRequest httpRequest = HttpRequest
      .newBuilder(uri(request))
      .timeout(properties.getTimeout())
      .header("Accept", "application/json")
      .GET()
      .build();

    try {
      HttpResponse<String> response = httpClient.send(
        httpRequest,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new YoutubeSearchException("YouTube Search API returned HTTP " + response.statusCode());
      }
      return parse(response.body());
    } catch (IOException error) {
      throw new YoutubeSearchException("YouTube Search API request failed", error);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new YoutubeSearchException("YouTube Search API request was interrupted", error);
    }
  }

  private URI uri(YoutubeSearchRequest request) {
    StringBuilder query = new StringBuilder()
      .append("?part=snippet")
      .append("&type=video")
      .append("&q=")
      .append(encode(request.query()))
      .append("&maxResults=")
      .append(request.maxResults())
      .append("&safeSearch=moderate")
      .append("&videoEmbeddable=true")
      .append("&order=relevance")
      .append("&relevanceLanguage=")
      .append(encode(relevanceLanguage(request.locale())))
      .append("&regionCode=")
      .append(encode(regionCode(request.locale())))
      .append("&key=")
      .append(encode(properties.getApiKey()));
    return URI.create(SEARCH_URI + query.toString());
  }

  private List<YoutubeSearchVideo> parse(String body) {
    try {
      JsonNode root = objectMapper.readTree(body);
      JsonNode items = root.path("items");
      if (!items.isArray()) {
        return List.of();
      }
      List<YoutubeSearchVideo> videos = new ArrayList<>();
      for (JsonNode item : items) {
        YoutubeSearchVideo video = toVideo(item);
        if (!video.videoId().isBlank() && !video.title().isBlank()) {
          videos.add(video);
        }
      }
      return videos;
    } catch (IOException error) {
      throw new YoutubeSearchException("YouTube Search API response could not be parsed", error);
    }
  }

  private YoutubeSearchVideo toVideo(JsonNode item) {
    JsonNode snippet = item.path("snippet");
    String videoId = text(item.path("id"), "videoId");
    return new YoutubeSearchVideo(
      videoId,
      text(snippet, "title"),
      text(snippet, "description"),
      thumbnailUrl(snippet.path("thumbnails")),
      text(snippet, "channelTitle")
    );
  }

  private String thumbnailUrl(JsonNode thumbnails) {
    for (String size : List.of("maxres", "standard", "high", "medium", "default")) {
      String url = text(thumbnails.path(size), "url");
      if (!url.isBlank()) {
        return url;
      }
    }
    return "";
  }

  private String text(JsonNode node, String field) {
    return node.path(field).asText("").trim();
  }

  private String relevanceLanguage(String locale) {
    return locale.toLowerCase().startsWith("ko") ? "ko" : "en";
  }

  private String regionCode(String locale) {
    return locale.toLowerCase().startsWith("ko") ? "KR" : "US";
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
