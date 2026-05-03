package com.lifesimulator.backend.config;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "simulator")
public class SimulatorProperties {

  private final Frontend frontend = new Frontend();
  private final Codex codex = new Codex();

  public Frontend getFrontend() {
    return frontend;
  }

  public Codex getCodex() {
    return codex;
  }

  public static class Frontend {
    private String casesDir = "../frontend/playground/inputs/cases";

    public String getCasesDir() {
      return casesDir;
    }

    public void setCasesDir(String casesDir) {
      this.casesDir = casesDir;
    }
  }

  public static class Codex {
    private boolean enabled = true;
    private boolean fallbackOnError = true;
    private String command = "codex";
    private String model = "gpt-5.3-codex-spark";
    private Duration timeout = Duration.ofSeconds(75);
    private Map<String, String> config = new LinkedHashMap<>(
      Map.of(
        "model_reasoning_effort",
        "low",
        "model_verbosity",
        "low",
        "service_tier",
        "fast"
      )
    );

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public boolean isFallbackOnError() {
      return fallbackOnError;
    }

    public void setFallbackOnError(boolean fallbackOnError) {
      this.fallbackOnError = fallbackOnError;
    }

    public String getCommand() {
      return command;
    }

    public void setCommand(String command) {
      this.command = command;
    }

    public String getModel() {
      return model;
    }

    public void setModel(String model) {
      this.model = model;
    }

    public Duration getTimeout() {
      return timeout;
    }

    public void setTimeout(Duration timeout) {
      this.timeout = timeout;
    }

    public Map<String, String> getConfig() {
      return config;
    }

    public void setConfig(Map<String, String> config) {
      this.config = new LinkedHashMap<>(config);
    }
  }
}
