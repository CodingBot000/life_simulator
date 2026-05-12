package com.lifesimulator.backend.recommendation.youtube;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class JsonYoutubeVideoSeedRepository implements YoutubeVideoSeedRepository {

  private final ObjectMapper objectMapper;
  private final SimulatorProperties.Recommendations.Youtube properties;

  public JsonYoutubeVideoSeedRepository(
    ObjectMapper objectMapper,
    SimulatorProperties.Recommendations.Youtube properties
  ) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  @Override
  public List<YoutubeVideoSeed> findByTopic(String locale, String topic, int limit) {
    List<YoutubeVideoSeed> seeds = loadSeeds();
    String normalizedLocale = locale(locale);
    String normalizedTopic = normalize(topic);
    List<YoutubeVideoSeed> matched = seeds
      .stream()
      .filter(seed -> seed.locale().equalsIgnoreCase(normalizedLocale))
      .filter(seed -> seed.topic().equalsIgnoreCase(normalizedTopic))
      .filter(seed -> !seed.resolvedVideoId().isBlank())
      .sorted(Comparator.comparingDouble(YoutubeVideoSeed::priorityScore).reversed())
      .limit(limit)
      .toList();

    if (!matched.isEmpty()) {
      return matched;
    }

    return seeds
      .stream()
      .filter(seed -> seed.locale().equalsIgnoreCase(normalizedLocale))
      .filter(seed -> seed.topic().equalsIgnoreCase("general_decision_support"))
      .filter(seed -> !seed.resolvedVideoId().isBlank())
      .sorted(Comparator.comparingDouble(YoutubeVideoSeed::priorityScore).reversed())
      .limit(limit)
      .toList();
  }

  private List<YoutubeVideoSeed> loadSeeds() {
    String resource = properties.getSeedResource();
    InputStream locatedInput = JsonYoutubeVideoSeedRepository.class.getResourceAsStream(resource);
    if (locatedInput == null) {
      return List.of();
    }
    try (InputStream input = locatedInput) {
      JsonNode root = objectMapper.readTree(input);
      if (!root.isArray()) {
        return List.of();
      }
      List<YoutubeVideoSeed> seeds = new ArrayList<>();
      for (JsonNode node : root) {
        seeds.add(seed(node));
      }
      return seeds;
    } catch (IOException error) {
      throw new IllegalStateException("Failed to read YouTube recommendation seeds: " + resource, error);
    }
  }

  private YoutubeVideoSeed seed(JsonNode node) {
    return new YoutubeVideoSeed(
      text(node, "id"),
      text(node, "locale", "ko"),
      text(node, "topic", "general_decision_support"),
      text(node, "video_id"),
      text(node, "url"),
      text(node, "title"),
      text(node, "description"),
      stringList(node.path("tags")),
      node.path("priority_score").asDouble(0.5)
    );
  }

  private List<String> stringList(JsonNode node) {
    if (!node.isArray()) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    for (JsonNode item : node) {
      String value = item.asText("").trim();
      if (!value.isBlank()) {
        values.add(value);
      }
    }
    return values;
  }

  private String text(JsonNode node, String field) {
    return text(node, field, "");
  }

  private String text(JsonNode node, String field, String fallback) {
    String value = node.path(field).asText(fallback);
    return value == null ? fallback : value.trim();
  }

  private String locale(String value) {
    return value == null || value.isBlank() ? "ko" : value.toLowerCase(Locale.ROOT).split("[-_]")[0];
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }
}
