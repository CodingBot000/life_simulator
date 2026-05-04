package com.lifesimulator.backend.config;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "simulator")
public class SimulatorProperties {

  private final Frontend frontend = new Frontend();
  private LlmProvider llmProvider = LlmProvider.CODEX;
  private final Codex codex = new Codex();
  private final OpenAi openai = new OpenAi();
  private final Mock mock = new Mock();
  private final Database database = new Database();
  private final Security security = new Security();

  public enum LlmProvider {
    CODEX,
    OPENAI,
    MOCK
  }

  public Frontend getFrontend() {
    return frontend;
  }

  public LlmProvider getLlmProvider() {
    return llmProvider;
  }

  public void setLlmProvider(LlmProvider llmProvider) {
    this.llmProvider = llmProvider;
  }

  public Codex getCodex() {
    return codex;
  }

  public OpenAi getOpenai() {
    return openai;
  }

  public Mock getMock() {
    return mock;
  }

  public Database getDatabase() {
    return database;
  }

  public Security getSecurity() {
    return security;
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
    private List<String> environmentAllowlist = new ArrayList<>(
      List.of(
        "PATH",
        "HOME",
        "USER",
        "LOGNAME",
        "SHELL",
        "TMPDIR",
        "LANG",
        "LC_ALL",
        "CODEX_HOME",
        "XDG_CONFIG_HOME",
        "XDG_DATA_HOME",
        "XDG_CACHE_HOME"
      )
    );
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

    public List<String> getEnvironmentAllowlist() {
      return environmentAllowlist;
    }

    public void setEnvironmentAllowlist(List<String> environmentAllowlist) {
      this.environmentAllowlist = new ArrayList<>(environmentAllowlist);
    }

    public Map<String, String> getConfig() {
      return config;
    }

    public void setConfig(Map<String, String> config) {
      this.config = new LinkedHashMap<>(config);
    }
  }

  public static class OpenAi {
    private String apiKey = "";
    private String model = "gpt-5.3";
    private Duration timeout = Duration.ofSeconds(75);
    private boolean fallbackOnError = true;

    public String getApiKey() {
      return apiKey;
    }

    public void setApiKey(String apiKey) {
      this.apiKey = apiKey;
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

    public boolean isFallbackOnError() {
      return fallbackOnError;
    }

    public void setFallbackOnError(boolean fallbackOnError) {
      this.fallbackOnError = fallbackOnError;
    }
  }

  public static class Mock {
    private String model = "spring-mock";

    public String getModel() {
      return model;
    }

    public void setModel(String model) {
      this.model = model;
    }
  }

  public static class Security {
    private final RateLimit rateLimit = new RateLimit();

    public RateLimit getRateLimit() {
      return rateLimit;
    }
  }

  public static class RateLimit {
    private boolean enabled = true;
    private boolean useForwardedHeaders = false;
    private int ipMinuteLimit = 5;
    private int ipHourLimit = 30;
    private int sessionHourLimit = 10;
    private Duration minuteWindow = Duration.ofMinutes(1);
    private Duration hourWindow = Duration.ofHours(1);

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public boolean isUseForwardedHeaders() {
      return useForwardedHeaders;
    }

    public void setUseForwardedHeaders(boolean useForwardedHeaders) {
      this.useForwardedHeaders = useForwardedHeaders;
    }

    public int getIpMinuteLimit() {
      return ipMinuteLimit;
    }

    public void setIpMinuteLimit(int ipMinuteLimit) {
      this.ipMinuteLimit = ipMinuteLimit;
    }

    public int getIpHourLimit() {
      return ipHourLimit;
    }

    public void setIpHourLimit(int ipHourLimit) {
      this.ipHourLimit = ipHourLimit;
    }

    public int getSessionHourLimit() {
      return sessionHourLimit;
    }

    public void setSessionHourLimit(int sessionHourLimit) {
      this.sessionHourLimit = sessionHourLimit;
    }

    public Duration getMinuteWindow() {
      return minuteWindow;
    }

    public void setMinuteWindow(Duration minuteWindow) {
      this.minuteWindow = minuteWindow;
    }

    public Duration getHourWindow() {
      return hourWindow;
    }

    public void setHourWindow(Duration hourWindow) {
      this.hourWindow = hourWindow;
    }
  }

  public static class Database {
    private boolean enabled = false;
    private String url = "jdbc:postgresql://localhost:5432/life_simulator_dev";
    private String username = "life_sim_user";
    private String password = "life_sim_password";
    private boolean migrate = true;

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getUrl() {
      return url;
    }

    public void setUrl(String url) {
      this.url = url;
    }

    public String getUsername() {
      return username;
    }

    public void setUsername(String username) {
      this.username = username;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }

    public boolean isMigrate() {
      return migrate;
    }

    public void setMigrate(boolean migrate) {
      this.migrate = migrate;
    }
  }
}
