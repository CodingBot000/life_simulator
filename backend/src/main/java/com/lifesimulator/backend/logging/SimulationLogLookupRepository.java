package com.lifesimulator.backend.logging;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class SimulationLogLookupRepository {

  private final JdbcTemplate jdbcTemplate;

  public SimulationLogLookupRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public boolean existsRequest(String requestId) {
    Integer count = jdbcTemplate.queryForObject(
      "SELECT COUNT(*)::int FROM life_simul_request_logs WHERE request_id = ?",
      Integer.class,
      requestId
    );
    return count != null && count > 0;
  }

  public String traceIdFor(String requestId) {
    return jdbcTemplate.query(
      "SELECT trace_id FROM life_simul_request_logs WHERE request_id = ? LIMIT 1",
      resultSet -> resultSet.next() ? resultSet.getString("trace_id") : null,
      requestId
    );
  }
}
