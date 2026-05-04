package com.lifesimulator.backend.api;

import com.lifesimulator.backend.llm.LlmJsonClient;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MetricsController {

  private final LlmJsonClient llmJsonClient;

  public MetricsController(LlmJsonClient llmJsonClient) {
    this.llmJsonClient = llmJsonClient;
  }

  @GetMapping(value = "/api/metrics", produces = MediaType.TEXT_PLAIN_VALUE)
  public String metrics() {
    String provider = escapeLabel(llmJsonClient.providerName());
    String model = escapeLabel(llmJsonClient.modelName());
    return String.join(
      "\n",
      "# HELP life_simulator_backend_info Backend build/runtime info.",
      "# TYPE life_simulator_backend_info gauge",
      "life_simulator_backend_info{provider=\"" + provider + "\",model=\"" + model + "\"} 1",
      "# HELP life_simulator_backend_timestamp_seconds Last scrape timestamp.",
      "# TYPE life_simulator_backend_timestamp_seconds gauge",
      "life_simulator_backend_timestamp_seconds " + Instant.now().getEpochSecond(),
      ""
    );
  }

  private String escapeLabel(String value) {
    return value.replace("\\", "\\\\").replace("\"", "\\\"");
  }
}
