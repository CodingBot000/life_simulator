package com.lifesimulator.backend.llm;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CodexCliClientTests {

  @Test
  void copyAllowedEnvironmentClearsAndCopiesOnlyAllowlistedValues() {
    Map<String, String> target = new HashMap<>(Map.of("SECRET", "old"));
    Map<String, String> source = Map.of(
      "PATH",
      "/usr/bin",
      "HOME",
      "/Users/example",
      "SECRET",
      "should-not-copy"
    );

    CodexCliClient.copyAllowedEnvironment(
      target,
      source,
      Arrays.asList("PATH", " HOME ", "MISSING", "", null)
    );

    assertThat(target)
      .containsEntry("PATH", "/usr/bin")
      .containsEntry("HOME", "/Users/example")
      .doesNotContainKey("SECRET")
      .doesNotContainKey("MISSING");
  }
}
