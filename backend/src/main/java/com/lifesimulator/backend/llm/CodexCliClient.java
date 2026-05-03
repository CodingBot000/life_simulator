package com.lifesimulator.backend.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

@Component
public class CodexCliClient {

  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;

  public CodexCliClient(ObjectMapper objectMapper, SimulatorProperties properties) {
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public JsonNode completeJson(String prompt, JsonNode outputSchema) {
    SimulatorProperties.Codex codex = properties.getCodex();
    Path tempDir = null;
    Process process = null;
    try {
      tempDir = Files.createTempDirectory("life-simulator-codex-");
      var schemaPath = tempDir.resolve("schema.json");
      var outputPath = tempDir.resolve("last-message.json");
      var stdoutPath = tempDir.resolve("stdout.log");
      var stderrPath = tempDir.resolve("stderr.log");
      Files.writeString(schemaPath, objectMapper.writeValueAsString(outputSchema), StandardCharsets.UTF_8);

      List<String> command = new ArrayList<>();
      command.add(codex.getCommand());
      command.add("exec");
      command.add("-m");
      command.add(codex.getModel());
      for (Map.Entry<String, String> entry : codex.getConfig().entrySet()) {
        command.add("-c");
        command.add(entry.getKey() + "=\"" + entry.getValue() + "\"");
      }
      command.add("--skip-git-repo-check");
      command.add("--ephemeral");
      command.add("--sandbox");
      command.add("read-only");
      command.add("--color");
      command.add("never");
      command.add("--output-schema");
      command.add(schemaPath.toString());
      command.add("--output-last-message");
      command.add(outputPath.toString());
      command.add("-");

      ProcessBuilder builder = new ProcessBuilder(command);
      builder.redirectOutput(stdoutPath.toFile());
      builder.redirectError(stderrPath.toFile());
      process = builder.start();
      try (var stdin = process.getOutputStream()) {
        stdin.write(prompt.getBytes(StandardCharsets.UTF_8));
      }

      Duration timeout = codex.getTimeout();
      boolean completed = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
      if (!completed) {
        process.destroyForcibly();
        throw new CodexCliException("Codex CLI timed out after " + timeout.toSeconds() + "s.");
      }

      String stderr = readIfExists(stderrPath);
      if (process.exitValue() != 0) {
        String stdout = readIfExists(stdoutPath);
        throw new CodexCliException("Codex CLI failed: " + firstNonBlank(stderr, stdout));
      }

      String raw = Files.exists(outputPath)
        ? Files.readString(outputPath, StandardCharsets.UTF_8)
        : readIfExists(stdoutPath);
      if (raw.isBlank()) {
        throw new CodexCliException("Codex CLI returned an empty JSON response.");
      }
      return objectMapper.readTree(raw);
    } catch (IOException error) {
      throw new CodexCliException("Codex CLI I/O failed: " + error.getMessage(), error);
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new CodexCliException("Codex CLI execution was interrupted.", error);
    } finally {
      if (process != null && process.isAlive()) {
        process.destroyForcibly();
      }
      deleteRecursively(tempDir);
    }
  }

  private String readIfExists(Path path) throws IOException {
    if (!Files.exists(path)) {
      return "";
    }
    return Files.readString(path, StandardCharsets.UTF_8);
  }

  private String firstNonBlank(String first, String second) {
    if (first != null && !first.isBlank()) {
      return first.trim();
    }
    if (second != null && !second.isBlank()) {
      return second.trim();
    }
    return "unknown error";
  }

  private void deleteRecursively(Path root) {
    if (root == null || !Files.exists(root)) {
      return;
    }

    try (Stream<Path> paths = Files.walk(root)) {
      paths
        .sorted(Comparator.reverseOrder())
        .forEach(path -> {
          try {
            Files.deleteIfExists(path);
          } catch (IOException ignored) {
            // Best-effort cleanup only.
          }
        });
    } catch (IOException ignored) {
      // Best-effort cleanup only.
    }
  }
}
