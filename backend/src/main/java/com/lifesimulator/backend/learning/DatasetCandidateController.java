package com.lifesimulator.backend.learning;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatasetCandidateController {

  private final DatasetCandidateService datasetCandidateService;

  public DatasetCandidateController(DatasetCandidateService datasetCandidateService) {
    this.datasetCandidateService = datasetCandidateService;
  }

  @PostMapping("/api/learning/dataset-candidates/build")
  public Map<String, Object> build(@RequestBody DatasetCandidateBuildRequest request) {
    return datasetCandidateService.build(request);
  }

  @GetMapping("/api/learning/dataset-candidates")
  public Map<String, Object> list(
    @RequestParam(defaultValue = "candidate") String status,
    @RequestParam(defaultValue = "50") int limit
  ) {
    return datasetCandidateService.list(status, limit);
  }
}
