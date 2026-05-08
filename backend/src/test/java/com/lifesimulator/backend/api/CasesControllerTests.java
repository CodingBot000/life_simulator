package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.cases.CasePresetService;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
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
}
