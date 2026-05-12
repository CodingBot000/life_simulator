package com.lifesimulator.backend.recommendation.persistence;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogItem;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogQuery;
import com.lifesimulator.backend.recommendation.core.RecommendationCatalogRepository;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class JsonRecommendationCatalogRepository implements RecommendationCatalogRepository {

  private static final String RESOURCE_TEMPLATE = "/recommendations/catalog.%s.json";

  private final ObjectMapper objectMapper;

  public JsonRecommendationCatalogRepository(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public List<RecommendationCatalogItem> findCandidates(RecommendationCatalogQuery query) {
    List<RecommendationCatalogItem> catalog = loadCatalog(locale(query.locale()));
    List<RecommendationCatalogItem> matched = catalog
      .stream()
      .filter(RecommendationCatalogItem::active)
      .filter(item -> matches(query, item))
      .sorted(Comparator.comparingDouble(RecommendationCatalogItem::priorityScore).reversed())
      .limit(query.limit())
      .toList();

    if (!matched.isEmpty()) {
      return matched;
    }

    return catalog
      .stream()
      .filter(RecommendationCatalogItem::active)
      .filter(item -> item.eligibleTopics().contains("general_decision_support"))
      .sorted(Comparator.comparingDouble(RecommendationCatalogItem::priorityScore).reversed())
      .limit(query.limit())
      .toList();
  }

  private boolean matches(RecommendationCatalogQuery query, RecommendationCatalogItem item) {
    String topic = normalize(query.topic());
    if (item.eligibleTopics().stream().map(this::normalize).anyMatch(topic::equals)) {
      return true;
    }

    Set<String> needles = new LinkedHashSet<>();
    query.keywords().stream().map(this::normalize).filter(value -> !value.isBlank()).forEach(needles::add);
    needles.add(topic);

    String haystack = normalize(
      item.title() + " " + item.description() + " " + String.join(" ", item.keywords()) + " " + String.join(" ", item.tags())
    );
    return needles.stream().anyMatch(haystack::contains);
  }

  private List<RecommendationCatalogItem> loadCatalog(String locale) {
    String resource = RESOURCE_TEMPLATE.formatted(locale);
    InputStream locatedInput = JsonRecommendationCatalogRepository.class.getResourceAsStream(resource);
    if (locatedInput == null && !"ko".equals(locale)) {
      locatedInput = JsonRecommendationCatalogRepository.class.getResourceAsStream(RESOURCE_TEMPLATE.formatted("ko"));
    }
    if (locatedInput == null) {
      return List.of();
    }

    try (InputStream input = locatedInput) {
      JsonNode root = objectMapper.readTree(input);
      if (!root.isArray()) {
        return List.of();
      }

      List<RecommendationCatalogItem> items = new ArrayList<>();
      for (JsonNode node : root) {
        items.add(item(node));
      }
      return items;
    } catch (IOException error) {
      throw new IllegalStateException("Failed to read recommendation catalog: " + resource, error);
    }
  }

  private RecommendationCatalogItem item(JsonNode node) {
    return new RecommendationCatalogItem(
      text(node, "id"),
      text(node, "provider", "catalog"),
      text(node, "item_type"),
      text(node, "locale", "ko"),
      text(node, "status", "active"),
      text(node, "title"),
      text(node, "description"),
      text(node, "url"),
      nullableText(node, "image_url"),
      nullableText(node, "price_label"),
      nullableText(node, "mall_name"),
      nullableText(node, "creator_name"),
      stringList(node.path("keywords")),
      stringList(node.path("tags")),
      stringList(node.path("eligible_topics")),
      node.path("is_affiliate").asBoolean(false),
      node.path("sponsored").asBoolean(false),
      node.path("priority_score").asDouble(0.5),
      nullableText(node, "starts_at"),
      nullableText(node, "ends_at")
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

  private String nullableText(JsonNode node, String field) {
    if (!node.hasNonNull(field)) {
      return null;
    }
    String value = node.path(field).asText("").trim();
    return value.isBlank() ? null : value;
  }

  private String locale(String value) {
    return value == null || value.isBlank() ? "ko" : value.toLowerCase(Locale.ROOT).split("[-_]")[0];
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }
}
