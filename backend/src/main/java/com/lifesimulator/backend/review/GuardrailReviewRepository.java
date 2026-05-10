package com.lifesimulator.backend.review;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class GuardrailReviewRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public GuardrailReviewRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public GuardrailReviewResponse insert(GuardrailReviewRow row) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_guardrail_reviews (
          review_id, request_id, trace_id, user_id, session_id, reviewer_type,
          review_label, correct_mode, reason_tags, comment
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)
        """,
      row.reviewId(),
      row.requestId(),
      row.traceId(),
      row.userId(),
      row.sessionId(),
      row.reviewerType(),
      row.reviewLabel(),
      row.correctMode(),
      json(row.reasonTags()),
      row.comment()
    );
    return findResponse(row.reviewId());
  }

  private GuardrailReviewResponse findResponse(String reviewId) {
    return jdbcTemplate.query(
      """
        SELECT review_id, request_id, review_label, correct_mode, created_at
        FROM life_simul_guardrail_reviews
        WHERE review_id = ?
        """,
      resultSet -> {
        if (!resultSet.next()) {
          return null;
        }
        return new GuardrailReviewResponse(
          resultSet.getString("review_id"),
          resultSet.getString("request_id"),
          resultSet.getString("review_label"),
          resultSet.getString("correct_mode"),
          timestamp(resultSet.getTimestamp("created_at"))
        );
      },
      reviewId
    );
  }

  private String json(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize guardrail review payload.", error);
    }
  }

  private String timestamp(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant().toString();
  }

  public record GuardrailReviewRow(
    String reviewId,
    String requestId,
    String traceId,
    String userId,
    String sessionId,
    String reviewerType,
    String reviewLabel,
    String correctMode,
    List<String> reasonTags,
    String comment
  ) {}
}
