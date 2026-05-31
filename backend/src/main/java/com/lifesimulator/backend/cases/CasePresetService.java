package com.lifesimulator.backend.cases;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * App adapter for loading sample Life UI case presets from the frontend playground.
 * The decision engine receives request payloads and does not depend on this catalog source.
 */
@Service
public class CasePresetService {

  private static final String CATEGORIES_FILE = "categories.json";
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
    Path casesDir = casesDir();
    CaseCategoryRegistry registry = loadCategories(casesDir);
    List<Map<String, Object>> presets = new ArrayList<>();
    Set<String> seenSlugs = new LinkedHashSet<>();

    for (Path file : caseFiles(casesDir)) {
      Map<String, Object> preset = readPreset(file, casesDir, registry);
      String slug = String.valueOf(preset.get("slug"));
      if (!seenSlugs.add(slug)) {
        throw new IllegalStateException("Duplicate case preset slug: " + slug);
      }
      presets.add(preset);
    }

    return presets;
  }

  public List<Map<String, Object>> listCategories() throws IOException {
    return loadCategories(casesDir())
      .categories()
      .stream()
      .map(this::categoryResponse)
      .toList();
  }

  private Path casesDir() throws IOException {
    Path casesDir = Path.of(properties.getFrontend().getCasesDir()).toAbsolutePath().normalize();
    if (!Files.isDirectory(casesDir)) {
      throw new IOException("Case preset directory not found: " + casesDir);
    }
    return casesDir;
  }

  private List<Path> caseFiles(Path casesDir) throws IOException {
    try (var files = Files.walk(casesDir)) {
      return files
        .filter(Files::isRegularFile)
        .filter(this::isCaseFile)
        .sorted(Comparator.comparing(path -> casesDir.relativize(path).toString()))
        .toList();
    }
  }

  private boolean isCaseFile(Path path) {
    String fileName = path.getFileName().toString();
    return fileName.endsWith(".json") && !CATEGORIES_FILE.equals(fileName);
  }

  private Map<String, Object> readPreset(
    Path file,
    Path casesDir,
    CaseCategoryRegistry registry
  ) {
    try {
      JsonNode request = objectMapper.readTree(file.toFile());
      JsonNode decision = request.path("decision");
      JsonNode metadata = request.path("metadata");
      String slug = file.getFileName().toString().replaceFirst("\\.json$", "");
      String category = categoryFor(file, casesDir, metadata, slug);
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
      Map<String, String> categoryLabels = registry.labelsFor(category);
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

  private String categoryFor(Path file, Path casesDir, JsonNode metadata, String slug) {
    String metadataCategory = text(metadata.path("category"));
    if (!metadataCategory.isBlank()) {
      return metadataCategory;
    }

    Path relativeParent = casesDir.relativize(file).getParent();
    if (relativeParent != null && relativeParent.getNameCount() > 0) {
      String parentCategory = relativeParent.getName(0).toString();
      if (!parentCategory.isBlank()) {
        return parentCategory;
      }
    }

    String inferred = inferCategory(slug);
    return inferred.isBlank() ? "other" : inferred;
  }

  private CaseCategoryRegistry loadCategories(Path casesDir) throws IOException {
    Path categoriesFile = casesDir.resolve(CATEGORIES_FILE);
    if (!Files.isRegularFile(categoriesFile)) {
      return defaultCategoryRegistry();
    }

    JsonNode root = objectMapper.readTree(categoriesFile.toFile());
    JsonNode categories = root.path("categories");
    if (!categories.isArray()) {
      return defaultCategoryRegistry();
    }

    List<CaseCategory> parsed = new ArrayList<>();
    int fallbackOrder = 10;
    for (JsonNode category : categories) {
      String id = text(category.path("id"));
      if (id.isBlank()) {
        continue;
      }
      String fallbackLabel = humanizeCategoryId(id);
      Map<String, String> labels = localizedLabels(
        category.path("labels"),
        fallbackLabel,
        fallbackLabel
      );
      String domain = textOrDefault(category.path("domain"), "life");
      String status = textOrDefault(category.path("status"), "active");
      int order = category.path("order").isInt() ? category.path("order").asInt() : fallbackOrder;
      parsed.add(new CaseCategory(id, labels, domain, order, status));
      fallbackOrder += 10;
    }

    return parsed.isEmpty()
      ? defaultCategoryRegistry()
      : new CaseCategoryRegistry(parsed);
  }

  private CaseCategoryRegistry defaultCategoryRegistry() {
    List<CaseCategory> categories = new ArrayList<>();
    int order = 10;
    for (String id : List.of("career", "relationship", "finance", "living", "education", "health", "other")) {
      categories.add(
        new CaseCategory(
          id,
          CATEGORY_LABELS.get(id),
          "life",
          order,
          "active"
        )
      );
      order += 10;
    }
    return new CaseCategoryRegistry(categories);
  }

  private Map<String, Object> categoryResponse(CaseCategory category) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("id", category.id());
    response.put("domain", category.domain());
    response.put("order", category.order());
    response.put("labels", category.labels());
    response.put("status", category.status());
    return response;
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

  private String text(JsonNode node) {
    return node.isTextual() ? node.asText().trim() : "";
  }

  private String textOrDefault(JsonNode node, String fallback) {
    String value = text(node);
    return value.isBlank() ? fallback : value;
  }

  private String humanizeCategoryId(String id) {
    String[] parts = id.split("-");
    for (int index = 0; index < parts.length; index += 1) {
      if (!parts[index].isBlank()) {
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

  private record CaseCategory(
    String id,
    Map<String, String> labels,
    String domain,
    int order,
    String status
  ) {}

  private record CaseCategoryRegistry(List<CaseCategory> categories) {
    private Map<String, String> labelsFor(String categoryId) {
      return categories
        .stream()
        .filter(category -> category.id().equals(categoryId))
        .findFirst()
        .map(CaseCategory::labels)
        .orElseGet(() -> labels(humanize(categoryId), humanize(categoryId)));
    }

    private static String humanize(String categoryId) {
      String[] parts = categoryId.split("-");
      for (int index = 0; index < parts.length; index += 1) {
        if (!parts[index].isBlank()) {
          parts[index] = parts[index].substring(0, 1).toUpperCase() + parts[index].substring(1);
        }
      }
      return String.join(" ", parts);
    }
  }
}
