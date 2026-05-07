package com.lifesimulator.backend.api;

import com.lifesimulator.backend.priorities.PriorityCatalogService;
import com.lifesimulator.backend.priorities.PriorityCatalogService.PriorityCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PriorityCatalogController {

  private final PriorityCatalogService priorityCatalogService;

  public PriorityCatalogController(PriorityCatalogService priorityCatalogService) {
    this.priorityCatalogService = priorityCatalogService;
  }

  @GetMapping("/api/priorities")
  public PriorityCatalog priorities() {
    return priorityCatalogService.catalog();
  }
}
