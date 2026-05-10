package com.lifesimulator.backend.outcome;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class OutcomeFollowupRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public OutcomeFollowupRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public OutcomeFollowupResponse insert(OutcomeFollowupRow row) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_outcome_followups (
          followup_id, request_id, trace_id, user_id, session_id, actual_choice,
          satisfaction_score, regret_score, outcome_note, unexpected_factors,
          horizon_days, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb)
        """,
      row.followupId(),
      row.requestId(),
      row.traceId(),
      row.userId(),
      row.sessionId(),
      row.actualChoice(),
      row.satisfactionScore(),
      row.regretScore(),
      row.outcomeNote(),
      json(row.unexpectedFactors()),
      row.horizonDays(),
      json(row.metadata())
    );
    return findResponse(row.followupId());
  }

  public OutcomeFollowupResponse update(String followupId, OutcomeFollowupRow row) {
    int updated = jdbcTemplate.update(
      """
        UPDATE life_simul_outcome_followups
        SET actual_choice = ?, satisfaction_score = ?, regret_score = ?,
          outcome_note = ?, unexpected_factors = ?::jsonb, horizon_days = ?,
          metadata = ?::jsonb, updated_at = NOW()
        WHERE followup_id = ?
        """,
      row.actualChoice(),
      row.satisfactionScore(),
      row.regretScore(),
      row.outcomeNote(),
      json(row.unexpectedFactors()),
      row.horizonDays(),
      json(row.metadata()),
      followupId
    );
    return updated == 0 ? null : findResponse(followupId);
  }

  private OutcomeFollowupResponse findResponse(String followupId) {
    return jdbcTemplate.query(
      """
        SELECT followup_id, request_id, actual_choice, satisfaction_score,
          regret_score, created_at, updated_at
        FROM life_simul_outcome_followups
        WHERE followup_id = ?
        """,
      resultSet -> {
        if (!resultSet.next()) {
          return null;
        }
        return new OutcomeFollowupResponse(
          resultSet.getString("followup_id"),
          resultSet.getString("request_id"),
          resultSet.getString("actual_choice"),
          (Integer) resultSet.getObject("satisfaction_score"),
          (Integer) resultSet.getObject("regret_score"),
          timestamp(resultSet.getTimestamp("created_at")),
          timestamp(resultSet.getTimestamp("updated_at"))
        );
      },
      followupId
    );
  }

  private String json(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize outcome payload.", error);
    }
  }

  private String timestamp(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant().toString();
  }

  public record OutcomeFollowupRow(
    String followupId,
    String requestId,
    String traceId,
    String userId,
    String sessionId,
    String actualChoice,
    Integer satisfactionScore,
    Integer regretScore,
    String outcomeNote,
    List<String> unexpectedFactors,
    int horizonDays,
    JsonNode metadata
  ) {}
}
