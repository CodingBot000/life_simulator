package com.lifesimulator.backend.cases;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CasePresetService {

  private static final Map<String, Map<String, String>> CATEGORY_LABELS = Map.of(
    "career",
    labels("커리어", "Career"),
    "relationship",
    labels("관계", "Relationship"),
    "finance",
    labels("재무", "Finance"),
    "living",
    labels("거주", "Living"),
    "education",
    labels("교육", "Education"),
    "health",
    labels("건강", "Health"),
    "other",
    labels("기타", "Other")
  );

  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;

  public CasePresetService(ObjectMapper objectMapper, SimulatorProperties properties) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public List<Map<String, Object>> listCasePresets() throws IOException {
    Path casesDir = Path.of(properties.getFrontend().getCasesDir()).toAbsolutePath().normalize();
    if (!Files.isDirectory(casesDir)) {
      throw new IOException("Case preset directory not found: " + casesDir);
    }

    try (var files = Files.list(casesDir)) {
      return files
        .filter(path -> path.getFileName().toString().endsWith(".json"))
        .sorted(Comparator.comparing(path -> path.getFileName().toString()))
        .map(this::readPreset)
        .toList();
    }
  }

  private Map<String, Object> readPreset(Path file) {
    try {
      JsonNode request = objectMapper.readTree(file.toFile());
      JsonNode decision = request.path("decision");
      JsonNode metadata = request.path("metadata");
      String slug = file.getFileName().toString().replaceFirst("\\.json$", "");
      String category = inferCategory(slug);
      String fallbackTitle = titleFromSlug(slug);
      String fallbackSummary = decision.path("context").asText("");
      Map<String, String> titleLabels = localizedLabels(
        metadata.path("title"),
        fallbackTitle,
        fallbackTitle
      );
      Map<String, String> summaryLabels = localizedLabels(
        metadata.path("summary"),
        fallbackSummary,
        fallbackSummary
      );
      Map<String, String> categoryLabels = CATEGORY_LABELS.getOrDefault(
        category,
        CATEGORY_LABELS.get("other")
      );
      return Map.of(
        "id",
        slug,
        "slug",
        slug,
        "title",
        titleLabels.get("ko"),
        "titleLabels",
        titleLabels,
        "category",
        category,
        "categoryLabel",
        categoryLabels.get("ko"),
        "categoryLabels",
        categoryLabels,
        "summary",
        summaryLabels.get("ko"),
        "summaryLabels",
        summaryLabels,
        "request",
        request
      );
    } catch (IOException error) {
      throw new IllegalStateException("Failed to read case preset: " + file, error);
    }
  }

  private String titleFromSlug(String slug) {
    String core = slug.replaceFirst("^case-\\d+-", "");
    if (core.isBlank()) {
      return slug;
    }
    String[] parts = core.split("-");
    for (int index = 0; index < parts.length; index += 1) {
      if (!"vs".equals(parts[index]) && !parts[index].isBlank()) {
        parts[index] = parts[index].substring(0, 1).toUpperCase() + parts[index].substring(1);
      }
    }
    return String.join(" ", parts);
  }

  private static Map<String, String> labels(String ko, String en) {
    return Map.of("ko", ko, "en", en);
  }

  private Map<String, String> localizedLabels(JsonNode node, String fallbackKo, String fallbackEn) {
    return labels(
      localizedText(node.path("ko"), fallbackKo),
      localizedText(node.path("en"), fallbackEn)
    );
  }

  private String localizedText(JsonNode node, String fallback) {
    if (node.isTextual() && !node.asText().isBlank()) {
      return node.asText();
    }
    return fallback;
  }

  private String inferCategory(String slug) {
    if (containsAny(slug, "relationship", "marriage", "cohabitation")) {
      return "relationship";
    }
    if (containsAny(slug, "purchase", "fund", "debt", "saving", "money")) {
      return "finance";
    }
    if (containsAny(slug, "relocation", "independence", "move", "commute")) {
      return "living";
    }
    if (containsAny(slug, "study", "certification", "portfolio")) {
      return "education";
    }
    if (slug.contains("rest")) {
      return "health";
    }
    return "career";
  }

  private boolean containsAny(String value, String... candidates) {
    for (String candidate : candidates) {
      if (value.contains(candidate)) {
        return true;
      }
    }
    return false;
  }
}
