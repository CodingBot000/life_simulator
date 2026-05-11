package com.lifesimulator.backend.correction;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class StateCorrectionRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public StateCorrectionRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public StateCorrectionResponse insert(StateCorrectionRow row) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_state_corrections (
          correction_id, request_id, trace_id, user_id, session_id, field_path,
          original_value, corrected_value, correction_type, comment
        )
        VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)
        """,
      row.correctionId(),
      row.requestId(),
      row.traceId(),
      row.userId(),
      row.sessionId(),
      row.fieldPath(),
      json(row.originalValue()),
      json(row.correctedValue()),
      row.correctionType(),
      row.comment()
    );
    return findResponse(row.correctionId());
  }

  private StateCorrectionResponse findResponse(String correctionId) {
    return jdbcTemplate.query(
      """
        SELECT correction_id, request_id, field_path, correction_type, created_at
        FROM life_simul_state_corrections
        WHERE correction_id = ?
        """,
      resultSet -> {
        if (!resultSet.next()) {
          return null;
        }
        return new StateCorrectionResponse(
          resultSet.getString("correction_id"),
          resultSet.getString("request_id"),
          resultSet.getString("field_path"),
          resultSet.getString("correction_type"),
          timestamp(resultSet.getTimestamp("created_at"))
        );
      },
      correctionId
    );
  }

  private String json(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value == null ? objectMapper.nullNode() : value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize state correction payload.", error);
    }
  }

  private String timestamp(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant().toString();
  }

  public record StateCorrectionRow(
    String correctionId,
    String requestId,
    String traceId,
    String userId,
    String sessionId,
    String fieldPath,
    JsonNode originalValue,
    JsonNode correctedValue,
    String correctionType,
    String comment
  ) {}
}
