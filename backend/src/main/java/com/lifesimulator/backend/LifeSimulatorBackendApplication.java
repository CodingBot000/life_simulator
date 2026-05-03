package com.lifesimulator.backend;

import com.lifesimulator.backend.config.SimulatorProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, FlywayAutoConfiguration.class})
@EnableConfigurationProperties(SimulatorProperties.class)
public class LifeSimulatorBackendApplication {

  public static void main(String[] args) {
    SpringApplication.run(LifeSimulatorBackendApplication.class, args);
  }
}
