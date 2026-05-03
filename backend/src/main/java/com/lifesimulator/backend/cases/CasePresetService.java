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

  private static final Map<String, String> CATEGORY_LABELS = Map.of(
    "career",
    "커리어",
    "relationship",
    "관계",
    "finance",
    "재무",
    "living",
    "거주",
    "education",
    "교육",
    "health",
    "건강",
    "other",
    "기타"
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
      String slug = file.getFileName().toString().replaceFirst("\\.json$", "");
      String category = inferCategory(slug);
      return Map.of(
        "id",
        slug,
        "slug",
        slug,
        "title",
        titleFromSlug(slug),
        "category",
        category,
        "categoryLabel",
        CATEGORY_LABELS.getOrDefault(category, "기타"),
        "summary",
        decision.path("context").asText(""),
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
