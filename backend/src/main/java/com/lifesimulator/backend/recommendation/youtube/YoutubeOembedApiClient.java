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

public class YoutubeOembedApiClient implements YoutubeOembedClient {

  private static final URI OEMBED_URI = URI.create("https://www.youtube.com/oembed");

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final SimulatorProperties.Recommendations.Youtube properties;

  public YoutubeOembedApiClient(
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this(HttpClient.newHttpClient(), objectMapper, properties);
  }

  YoutubeOembedApiClient(
    HttpClient httpClient,
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Override
  public YoutubeOembedMetadata fetch(String youtubeUrl) {
    HttpRequest request = HttpRequest
      .newBuilder(uri(youtubeUrl))
      .timeout(properties.getTimeout())
      .header("Accept", "application/json")
      .GET()
      .build();

    try {
      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new YoutubeOembedException("YouTube oEmbed returned HTTP " + response.statusCode());
      }
      return parse(response.body());
    } catch (IOException error) {
      throw new YoutubeOembedException("YouTube oEmbed request failed", error);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new YoutubeOembedException("YouTube oEmbed request was interrupted", error);
    }
  }

  private URI uri(String youtubeUrl) {
    String encodedUrl = URLEncoder.encode(youtubeUrl, StandardCharsets.UTF_8);
    return URI.create(OEMBED_URI + "?url=" + encodedUrl + "&format=json");
  }

  private YoutubeOembedMetadata parse(String body) {
    try {
      JsonNode root = objectMapper.readTree(body);
      return new YoutubeOembedMetadata(
        root.path("title").asText(""),
        root.path("thumbnail_url").asText(""),
        root.path("author_name").asText("")
      );
    } catch (IOException error) {
      throw new YoutubeOembedException("YouTube oEmbed response could not be parsed", error);
    }
  }
}
