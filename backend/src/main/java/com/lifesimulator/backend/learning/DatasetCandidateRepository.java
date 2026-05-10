package com.lifesimulator.backend.learning;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.engine.evaluation.DecisionEvaluationTarget;
import com.lifesimulator.backend.engine.evaluation.EvaluationEvent;
import com.lifesimulator.backend.engine.evaluation.FeedbackSignal;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewEvent;
import com.lifesimulator.backend.engine.evaluation.GuardrailReviewLabel;
import com.lifesimulator.backend.engine.evaluation.OutcomeLabel;
import com.lifesimulator.backend.engine.evaluation.StateCorrectionLabel;
import com.lifesimulator.backend.engine.learning.DatasetCandidate;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(prefix = "simulator.database", name = "enabled", havingValue = "true")
public class DatasetCandidateRepository {

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public DatasetCandidateRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
    this.jdbcTemplate = jdbcTemplate;
    this.objectMapper = objectMapper;
  }

  public RequestPayloads requestPayloads(String requestId) {
    return jdbcTemplate.query(
      """
        SELECT request_payload, response_payload
        FROM life_simul_request_logs
        WHERE request_id = ?
        """,
      resultSet -> {
        if (!resultSet.next()) {
          return null;
        }
        return new RequestPayloads(
          jsonNode(resultSet.getObject("request_payload")),
          jsonNode(resultSet.getObject("response_payload"))
        );
      },
      requestId
    );
  }

  public List<EvaluationEvent> feedbackEvents(String requestId) {
    return jdbcTemplate.query(
      """
        SELECT request_id, trace_id, user_id, session_id, target_type, target_option,
          feedback_signal, rating, reason_tags, comment, metadata
        FROM life_simul_user_feedback
        WHERE request_id = ?
        ORDER BY created_at
        """,
      (resultSet, rowNumber) -> new EvaluationEvent(
        resultSet.getString("request_id"),
        resultSet.getString("trace_id"),
        resultSet.getString("user_id"),
        resultSet.getString("session_id"),
        DecisionEvaluationTarget.from(resultSet.getString("target_type")),
        resultSet.getString("target_option"),
        FeedbackSignal.from(resultSet.getString("feedback_signal")),
        (Integer) resultSet.getObject("rating"),
        stringList(resultSet.getObject("reason_tags")),
        resultSet.getString("comment"),
        jsonNode(resultSet.getObject("metadata"))
      ),
      requestId
    );
  }

  public List<OutcomeLabel> outcomeLabels(String requestId) {
    return jdbcTemplate.query(
      """
        SELECT request_id, trace_id, user_id, session_id, actual_choice,
          satisfaction_score, regret_score, outcome_note, unexpected_factors,
          horizon_days, metadata
        FROM life_simul_outcome_followups
        WHERE request_id = ?
        ORDER BY created_at
        """,
      (resultSet, rowNumber) -> new OutcomeLabel(
        resultSet.getString("request_id"),
        resultSet.getString("trace_id"),
        resultSet.getString("user_id"),
        resultSet.getString("session_id"),
        resultSet.getString("actual_choice"),
        (Integer) resultSet.getObject("satisfaction_score"),
        (Integer) resultSet.getObject("regret_score"),
        resultSet.getString("outcome_note"),
        stringList(resultSet.getObject("unexpected_factors")),
        resultSet.getInt("horizon_days"),
        jsonNode(resultSet.getObject("metadata"))
      ),
      requestId
    );
  }

  public List<StateCorrectionLabel> stateCorrections(String requestId) {
    return jdbcTemplate.query(
      """
        SELECT request_id, trace_id, user_id, session_id, field_path,
          original_value, corrected_value, correction_type, comment
        FROM life_simul_state_corrections
        WHERE request_id = ?
        ORDER BY created_at
        """,
      (resultSet, rowNumber) -> new StateCorrectionLabel(
        resultSet.getString("request_id"),
        resultSet.getString("trace_id"),
        resultSet.getString("user_id"),
        resultSet.getString("session_id"),
        resultSet.getString("field_path"),
        jsonNode(resultSet.getObject("original_value")),
        jsonNode(resultSet.getObject("corrected_value")),
        resultSet.getString("correction_type"),
        resultSet.getString("comment")
      ),
      requestId
    );
  }

  public List<GuardrailReviewEvent> guardrailReviews(String requestId) {
    return jdbcTemplate.query(
      """
        SELECT request_id, trace_id, user_id, session_id, reviewer_type,
          review_label, correct_mode, reason_tags, comment
        FROM life_simul_guardrail_reviews
        WHERE request_id = ?
        ORDER BY created_at
        """,
      (resultSet, rowNumber) -> new GuardrailReviewEvent(
        resultSet.getString("request_id"),
        resultSet.getString("trace_id"),
        resultSet.getString("user_id"),
        resultSet.getString("session_id"),
        resultSet.getString("reviewer_type"),
        GuardrailReviewLabel.from(resultSet.getString("review_label")),
        resultSet.getString("correct_mode"),
        stringList(resultSet.getObject("reason_tags")),
        resultSet.getString("comment")
      ),
      requestId
    );
  }

  public void upsert(DatasetCandidate candidate) {
    jdbcTemplate.update(
      """
        INSERT INTO life_simul_dataset_candidates (
          candidate_id, request_id, candidate_type, source, input_payload,
          expected_payload, actual_payload, label_payload, quality_score, status
        )
        VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb, ?, ?)
        ON CONFLICT (candidate_id) DO UPDATE SET
          input_payload = EXCLUDED.input_payload,
          expected_payload = EXCLUDED.expected_payload,
          actual_payload = EXCLUDED.actual_payload,
          label_payload = EXCLUDED.label_payload,
          quality_score = EXCLUDED.quality_score,
          status = EXCLUDED.status,
          updated_at = NOW()
        """,
      candidate.candidateId(),
      candidate.requestId(),
      candidate.type().value(),
      candidate.source(),
      json(candidate.inputPayload()),
      json(candidate.expectedPayload()),
      json(candidate.actualPayload()),
      json(candidate.labelPayload()),
      candidate.qualityScore(),
      candidate.status().value()
    );
  }

  public List<Map<String, Object>> list(String status, int limit) {
    return jdbcTemplate.queryForList(
      """
        SELECT candidate_id, request_id, candidate_type, source, quality_score,
          status, created_at, updated_at
        FROM life_simul_dataset_candidates
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
      status,
      limit
    ).stream().map(this::responseRow).toList();
  }

  private Map<String, Object> responseRow(Map<String, Object> row) {
    return Map.of(
      "candidateId", row.get("candidate_id"),
      "requestId", row.get("request_id"),
      "candidateType", row.get("candidate_type"),
      "source", row.get("source"),
      "qualityScore", row.get("quality_score") == null ? 0 : row.get("quality_score"),
      "status", row.get("status"),
      "createdAt", timestamp(row.get("created_at")),
      "updatedAt", timestamp(row.get("updated_at"))
    );
  }

  @SuppressWarnings("unchecked")
  private List<String> stringList(Object value) {
    JsonNode node = jsonNode(value);
    if (!node.isArray()) {
      return List.of();
    }
    return objectMapper.convertValue(node, List.class);
  }

  private JsonNode jsonNode(Object value) {
    if (value == null) {
      return objectMapper.nullNode();
    }
    if (value instanceof JsonNode node) {
      return node;
    }
    try {
      return objectMapper.readTree(String.valueOf(value));
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to parse json payload.", error);
    }
  }

  private String json(JsonNode value) {
    try {
      return objectMapper.writeValueAsString(value == null ? objectMapper.nullNode() : value);
    } catch (JsonProcessingException error) {
      throw new IllegalStateException("Failed to serialize candidate payload.", error);
    }
  }

  private String timestamp(Object value) {
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant().toString();
    }
    return value == null ? null : String.valueOf(value);
  }

  public record RequestPayloads(JsonNode requestPayload, JsonNode responsePayload) {}
}
