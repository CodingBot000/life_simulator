package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.priorities.PriorityCatalogService;
import org.junit.jupiter.api.Test;

class PriorityCatalogControllerTests {

  @Test
  void prioritiesExposeCatalogForFrontendSelection() {
    PriorityCatalogController controller = new PriorityCatalogController(new PriorityCatalogService());
    PriorityCatalogService.PriorityCatalog catalog = controller.priorities();

    assertThat(catalog.maxSelections()).isEqualTo(3);
    assertThat(catalog.groups()).extracting("id").contains("core", "career", "finance");
    assertThat(catalog.definitions()).extracting("id").contains("stability", "income", "work_life_balance");
    assertThat(catalog.categoryGroups()).containsKeys("career", "relationship", "finance", "living", "education", "health", "other");
  }
}
