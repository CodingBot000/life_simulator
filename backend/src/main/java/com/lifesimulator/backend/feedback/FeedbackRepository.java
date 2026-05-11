package com.lifesimulator.backend.feedback;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class FeedbackRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public FeedbackRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public FeedbackResponse insert(FeedbackRow row) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_user_feedback (
          feedback_id, request_id, trace_id, user_id, session_id, target_type,
          target_option, feedback_signal, rating, reason_tags, comment, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb)
        """,
      row.feedbackId(),
      row.requestId(),
      row.traceId(),
      row.userId(),
      row.sessionId(),
      row.targetType(),
      row.targetOption(),
      row.feedbackSignal(),
      row.rating(),
      json(row.reasonTags()),
      row.comment(),
      json(row.metadata())
    );
    return findResponse(row.feedbackId());
  }

  public FeedbackResponse update(String feedbackId, FeedbackRow row) {
    int updated = jdbcTemplate.update(
      """
        UPDATE life_simul_user_feedback
        SET target_type = ?, target_option = ?, feedback_signal = ?, rating = ?,
          reason_tags = ?::jsonb, comment = ?, metadata = ?::jsonb, updated_at = NOW()
        WHERE feedback_id = ?
        """,
      row.targetType(),
      row.targetOption(),
      row.feedbackSignal(),
      row.rating(),
      json(row.reasonTags()),
      row.comment(),
      json(row.metadata()),
      feedbackId
    );
    if (updated == 0) {
      return null;
    }
    return findResponse(feedbackId);
  }

  public List<Map<String, Object>> summary(String requestId) {
    return jdbcTemplate.queryForList(
      """
        SELECT target_type, feedback_signal, COUNT(*)::int AS count
        FROM life_simul_user_feedback
        WHERE request_id = ?
        GROUP BY target_type, feedback_signal
        ORDER BY target_type, feedback_signal
        """,
      requestId
    );
  }

  private FeedbackResponse findResponse(String feedbackId) {
    return jdbcTemplate.query(
      """
        SELECT feedback_id, request_id, target_type, feedback_signal, rating, created_at, updated_at
        FROM life_simul_user_feedback
        WHERE feedback_id = ?
        """,
      resultSet -> {
        if (!resultSet.next()) {
          return null;
        }
        return new FeedbackResponse(
          resultSet.getString("feedback_id"),
          resultSet.getString("request_id"),
          resultSet.getString("target_type"),
          resultSet.getString("feedback_signal"),
          (Integer) resultSet.getObject("rating"),
          timestamp(resultSet.getTimestamp("created_at")),
          timestamp(resultSet.getTimestamp("updated_at"))
        );
      },
      feedbackId
    );
  }

  private String json(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize feedback payload.", error);
    }
  }

  private String timestamp(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant().toString();
  }

  public record FeedbackRow(
    String feedbackId,
    String requestId,
    String traceId,
    String userId,
    String sessionId,
    String targetType,
    String targetOption,
    String feedbackSignal,
    Integer rating,
    List<String> reasonTags,
    String comment,
    JsonNode metadata
  ) {}
}
