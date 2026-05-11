package com.lifesimulator.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class RecommendationArchitectureTests {

  @Test
  void corePackageDoesNotDependOnLifeSimulatorAdaptersOrInfrastructure() throws IOException {
    Path core = Path.of("src/main/java/com/lifesimulator/backend/recommendation/core");
    String source = Files
      .walk(core)
      .filter(path -> path.toString().endsWith(".java"))
      .map(this::read)
      .reduce("", (left, right) -> left + "\n" + right);

    assertThat(source).doesNotContain("com.lifesimulator.backend.simulation");
    assertThat(source).doesNotContain("com.lifesimulator.backend.engine");
    assertThat(source).doesNotContain("com.lifesimulator.backend.api");
    assertThat(source).doesNotContain("org.springframework");
    assertThat(source).doesNotContain("JdbcTemplate");
    assertThat(source).doesNotContain("RestTemplate");
    assertThat(source).doesNotContain("WebClient");
    assertThat(source).doesNotContain("JsonNode");
  }

  private String read(Path path) {
    try {
      return Files.readString(path);
    } catch (IOException error) {
      throw new IllegalStateException(error);
    }
  }
}
