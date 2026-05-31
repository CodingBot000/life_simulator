package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.cases.CasePresetService;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CasesControllerTests {

  @TempDir
  Path tempDir;

  @Test
  void casesExposeFrontendPresetShape() throws Exception {
    Files.writeString(
      tempDir.resolve("case-01-career-stability.json"),
      """
      {
        "metadata": {
          "title": {
            "ko": "안정적인 회사 유지",
            "en": "Stay at stable company"
          },
          "summary": {
            "ko": "현재 회사에 남을지 비교한다.",
            "en": "Compare staying at the current company."
          }
        },
        "userProfile": {
          "age": 32,
          "job": "developer",
          "risk_tolerance": "medium",
          "priority": ["stability", "income"]
        },
        "decision": {
          "optionA": "현재 회사에 남는다",
          "optionB": "스타트업으로 이직한다",
          "context": "안정성과 성장 사이에서 고민한다."
        }
      }
      """
    );
    SimulatorProperties properties = new SimulatorProperties();
    properties.getFrontend().setCasesDir(tempDir.toString());
    CasesController controller = new CasesController(
      new CasePresetService(new ObjectMapper(), properties)
    );

    Map<String, Object> response = controller.listCases();

    assertThat(response).containsKey("cases");
    assertThat(response).containsKey("categories");
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> cases = (List<Map<String, Object>>) response.get("cases");
    assertThat(cases).hasSize(1);
    assertThat(cases.get(0))
      .containsEntry("id", "case-01-career-stability")
      .containsEntry("category", "career");
    assertThat(cases.get(0)).containsKeys(
      "slug",
      "title",
      "titleLabels",
      "categoryLabel",
      "categoryLabels",
      "summary",
      "summaryLabels",
      "request"
    );
  }

  @Test
  void casesUseRegistryAndNestedMetadataCategory() throws Exception {
    Files.writeString(
      tempDir.resolve("categories.json"),
      """
      {
        "schemaVersion": 1,
        "categories": [
          {
            "id": "career",
            "domain": "life",
            "order": 10,
            "labels": { "ko": "커리어", "en": "Career" },
            "status": "active"
          },
          {
            "id": "finance",
            "domain": "life",
            "order": 30,
            "labels": { "ko": "재무", "en": "Finance" },
            "status": "active"
          },
          {
            "id": "work-sales",
            "domain": "work",
            "order": 110,
            "labels": { "ko": "영업", "en": "Sales" },
            "status": "active"
          }
        ]
      }
      """
    );
    Files.createDirectories(tempDir.resolve("finance"));
    Files.createDirectories(tempDir.resolve("misc"));
    writeCase(
      tempDir.resolve("finance/custom-budget-choice.json"),
      """
      {
        "title": { "ko": "예산 선택", "en": "Budget Choice" },
        "summary": { "ko": "예산 배분을 비교한다.", "en": "Compare budget allocation." }
      }
      """
    );
    writeCase(
      tempDir.resolve("misc/customer-value-vs-margin.json"),
      """
      {
        "category": "work-sales",
        "title": { "ko": "고객 가치와 마진", "en": "Customer Value vs Margin" },
        "summary": { "ko": "고객 신뢰와 마진을 비교한다.", "en": "Compare trust and margin." }
      }
      """
    );
    writeCase(
      tempDir.resolve("case-99-marriage-choice.json"),
      """
      {
        "title": { "ko": "결혼 선택", "en": "Marriage Choice" },
        "summary": { "ko": "결혼 시점을 비교한다.", "en": "Compare marriage timing." }
      }
      """
    );

    Map<String, Object> response = controller().listCases();

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> categories = (List<Map<String, Object>>) response.get("categories");
    assertThat(categories)
      .extracting(category -> category.get("id"))
      .containsExactly("career", "finance", "work-sales");
    assertThat(categories.get(2))
      .containsEntry("domain", "work")
      .containsEntry("order", 110);

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> cases = (List<Map<String, Object>>) response.get("cases");
    assertThat(cases)
      .extracting(preset -> preset.get("id"))
      .containsExactly(
        "case-99-marriage-choice",
        "custom-budget-choice",
        "customer-value-vs-margin"
      );
    assertThat(cases)
      .extracting(preset -> preset.get("category"))
      .containsExactly("relationship", "finance", "work-sales");
    assertThat(cases.get(2)).containsEntry("categoryLabel", "영업");
  }

  @Test
  void duplicateSlugsFailFast() throws Exception {
    Files.createDirectories(tempDir.resolve("career"));
    writeCase(tempDir.resolve("case-01-career-stability.json"), "{}");
    writeCase(tempDir.resolve("career/case-01-career-stability.json"), "{}");

    assertThatThrownBy(() -> controller().listCases())
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("Duplicate case preset slug");
  }

  private CasesController controller() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getFrontend().setCasesDir(tempDir.toString());
    return new CasesController(new CasePresetService(new ObjectMapper(), properties));
  }

  private void writeCase(Path path, String metadata) throws Exception {
    Files.writeString(
      path,
      """
      {
        "metadata": %s,
        "userProfile": {
          "age": 32,
          "job": "developer",
          "risk_tolerance": "medium",
          "priority": ["stability", "income"]
        },
        "decision": {
          "optionA": "현재 회사에 남는다",
          "optionB": "스타트업으로 이직한다",
          "context": "안정성과 성장 사이에서 고민한다."
        }
      }
      """.formatted(metadata)
    );
  }
}
