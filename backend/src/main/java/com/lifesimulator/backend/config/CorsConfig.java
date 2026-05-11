package com.lifesimulator.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

  private final SimulatorProperties properties;

  public CorsConfig(SimulatorProperties properties) {
    this.properties = properties;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] allowedOrigins = properties.getCors().getAllowedOrigins().toArray(String[]::new);

    registry
      .addMapping("/api/**")
      .allowedOrigins(allowedOrigins)
      .allowedMethods("GET", "POST", "PUT", "OPTIONS")
      .allowedHeaders("*")
      .exposedHeaders(
        "x-request-id",
        "x-trace-id",
        "x-llm-model",
        "x-llm-execution-mode",
        "x-llm-selected-path",
        "x-llm-stage-model-plan"
      );
  }
}
