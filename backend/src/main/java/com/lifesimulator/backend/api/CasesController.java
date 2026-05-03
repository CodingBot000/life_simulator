package com.lifesimulator.backend.api;

import com.lifesimulator.backend.cases.CasePresetService;
import java.io.IOException;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CasesController {

  private final CasePresetService casePresetService;

  public CasesController(CasePresetService casePresetService) {
    this.casePresetService = casePresetService;
  }

  @GetMapping("/api/cases")
  public Map<String, Object> listCases() throws IOException {
    return Map.of("cases", casePresetService.listCasePresets());
  }
}
