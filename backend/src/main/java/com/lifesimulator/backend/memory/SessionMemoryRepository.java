package com.lifesimulator.backend.memory;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class SessionMemoryRepository {

  private final JdbcTemplate jdbcTemplate;

  public SessionMemoryRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public SessionMemoryDecision upsert(SessionMemoryRow row, int maxStoredDecisions) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_session_memory_decisions (
          memory_id, session_id, dedupe_key, topic, selected_option, outcome_note,
          source_request_id, source_case_id, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (session_id, dedupe_key) DO UPDATE SET
          memory_id = EXCLUDED.memory_id,
          topic = EXCLUDED.topic,
          selected_option = EXCLUDED.selected_option,
          outcome_note = EXCLUDED.outcome_note,
          source_request_id = EXCLUDED.source_request_id,
          source_case_id = EXCLUDED.source_case_id,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW(),
          created_at = NOW()
        """,
      row.memoryId(),
      row.sessionId(),
      row.dedupeKey(),
      row.topic(),
      row.selectedOption(),
      row.outcomeNote(),
      row.sourceRequestId(),
      row.sourceCaseId(),
      timestamp(row.expiresAt())
    );
    prune(row.sessionId(), maxStoredDecisions);
    return find(row.sessionId(), row.memoryId());
  }

  public List<SessionMemoryDecision> list(String sessionId, int limit) {
    return jdbcTemplate.query(
      """
        SELECT memory_id, created_at, topic, selected_option, outcome_note,
          source_request_id, source_case_id
        FROM life_simul_session_memory_decisions
        WHERE session_id = ?
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT ?
        """,
      (resultSet, rowNumber) ->
        new SessionMemoryDecision(
          resultSet.getString("memory_id"),
          resultSet.getTimestamp("created_at").toInstant().toString(),
          resultSet.getString("topic"),
          resultSet.getString("selected_option"),
          resultSet.getString("outcome_note"),
          resultSet.getString("source_request_id"),
          resultSet.getString("source_case_id")
        ),
      sessionId,
      limit
    );
  }

  public void delete(String sessionId, String memoryId) {
    jdbcTemplate.update(
      """
        DELETE FROM life_simul_session_memory_decisions
        WHERE session_id = ? AND memory_id = ?
        """,
      sessionId,
      memoryId
    );
  }

  public void clear(String sessionId) {
    jdbcTemplate.update(
      "DELETE FROM life_simul_session_memory_decisions WHERE session_id = ?",
      sessionId
    );
  }

  private SessionMemoryDecision find(String sessionId, String memoryId) {
    List<SessionMemoryDecision> matches = jdbcTemplate.query(
      """
        SELECT memory_id, created_at, topic, selected_option, outcome_note,
          source_request_id, source_case_id
        FROM life_simul_session_memory_decisions
        WHERE session_id = ? AND memory_id = ?
        LIMIT 1
        """,
      (resultSet, rowNumber) ->
        new SessionMemoryDecision(
          resultSet.getString("memory_id"),
          resultSet.getTimestamp("created_at").toInstant().toString(),
          resultSet.getString("topic"),
          resultSet.getString("selected_option"),
          resultSet.getString("outcome_note"),
          resultSet.getString("source_request_id"),
          resultSet.getString("source_case_id")
        ),
      sessionId,
      memoryId
    );
    return matches.isEmpty() ? null : matches.get(0);
  }

  private void prune(String sessionId, int maxStoredDecisions) {
    jdbcTemplate.update(
      """
        DELETE FROM life_simul_session_memory_decisions
        WHERE session_id = ?
          AND id NOT IN (
            SELECT id
            FROM life_simul_session_memory_decisions
            WHERE session_id = ?
            ORDER BY created_at DESC
            LIMIT ?
          )
        """,
      sessionId,
      sessionId,
      maxStoredDecisions
    );
  }

  private Timestamp timestamp(Instant value) {
    return value == null ? null : Timestamp.from(value);
  }

  public record SessionMemoryRow(
    String memoryId,
    String sessionId,
    String dedupeKey,
    String topic,
    String selectedOption,
    String outcomeNote,
    String sourceRequestId,
    String sourceCaseId,
    Instant expiresAt
  ) {}
}
