package com.lifesimulator.backend.recommendation.naver;

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

public class NaverSearchApiClient implements NaverSearchClient {

  private static final URI BASE_URI = URI.create("https://openapi.naver.com");

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final SimulatorProperties.Recommendations.Naver properties;

  public NaverSearchApiClient(
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Naver properties
  ) {
    this(HttpClient.newHttpClient(), objectMapper, properties);
  }

  NaverSearchApiClient(
    HttpClient httpClient,
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Naver properties
  ) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Override
  public List<NaverSearchDocument> search(NaverSearchRequest request) {
    if (!properties.hasCredentials()) {
      throw new NaverSearchException("Naver Search credentials are not configured");
    }

    HttpRequest httpRequest = HttpRequest
      .newBuilder(uri(request))
      .timeout(properties.getTimeout())
      .header("Accept", "application/json")
      .header("X-Naver-Client-Id", properties.getClientId())
      .header("X-Naver-Client-Secret", properties.getClientSecret())
      .GET()
      .build();

    try {
      HttpResponse<String> response = httpClient.send(
        httpRequest,
        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
      );
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new NaverSearchException("Naver Search API returned HTTP " + response.statusCode());
      }
      return parse(request.type(), response.body());
    } catch (IOException error) {
      throw new NaverSearchException("Naver Search API request failed", error);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new NaverSearchException("Naver Search API request was interrupted", error);
    }
  }

  private URI uri(NaverSearchRequest request) {
    String query = encode(request.query());
    String sort = encode(request.sort());
    StringBuilder path = new StringBuilder(request.type().path())
      .append("?query=")
      .append(query)
      .append("&display=")
      .append(request.display())
      .append("&start=1")
      .append("&sort=")
      .append(sort);

    if (request.type() == NaverSearchType.SHOPPING) {
      path.append("&exclude=used:rental:cbshop");
    }
    return BASE_URI.resolve(path.toString());
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private List<NaverSearchDocument> parse(NaverSearchType type, String body) {
    try {
      JsonNode root = objectMapper.readTree(body);
      JsonNode items = root.path("items");
      if (!items.isArray()) {
        return List.of();
      }
      List<NaverSearchDocument> documents = new ArrayList<>();
      for (JsonNode item : items) {
        documents.add(toDocument(type, item));
      }
      return documents;
    } catch (IOException error) {
      throw new NaverSearchException("Naver Search API response could not be parsed", error);
    }
  }

  private NaverSearchDocument toDocument(NaverSearchType type, JsonNode item) {
    return new NaverSearchDocument(
      type,
      text(item, "title"),
      text(item, "link"),
      text(item, "image"),
      text(item, "description"),
      text(item, "author"),
      text(item, "publisher"),
      text(item, "discount"),
      text(item, "productId"),
      text(item, "lprice"),
      text(item, "mallName"),
      text(item, "brand"),
      text(item, "maker"),
      text(item, "category1"),
      text(item, "category2"),
      text(item, "category3")
    );
  }

  private String text(JsonNode item, String field) {
    return cleanHtml(item.path(field).asText(""));
  }

  private String cleanHtml(String value) {
    return value
      .replaceAll("<[^>]+>", "")
      .replace("&quot;", "\"")
      .replace("&#39;", "'")
      .replace("&apos;", "'")
      .replace("&lt;", "<")
      .replace("&gt;", ">")
      .replace("&amp;", "&")
      .trim();
  }
}
