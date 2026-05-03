package com.lifesimulator.backend.database;

import com.lifesimulator.backend.config.SimulatorProperties;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnBean(DataSource.class)
public class DatabaseMigrationRunner implements ApplicationRunner {

  private final DataSource dataSource;
  private final SimulatorProperties properties;

  public DatabaseMigrationRunner(DataSource dataSource, SimulatorProperties properties) {
    this.dataSource = dataSource;
    this.properties = properties;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (!properties.getDatabase().isMigrate()) {
      return;
    }

    Flyway
      .configure()
      .dataSource(dataSource)
      .locations("classpath:db/migration")
      .baselineOnMigrate(true)
      .load()
      .migrate();
  }
}
