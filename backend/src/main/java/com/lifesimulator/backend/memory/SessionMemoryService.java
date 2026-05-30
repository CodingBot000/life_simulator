package com.lifesimulator.backend.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessionMemoryService {

  private static final int MAX_TEXT_LENGTH = 2_000;

  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;
  private final ObjectProvider<SessionMemoryRepository> repository;

  public SessionMemoryService(
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    ObjectProvider<SessionMemoryRepository> repository
  ) {
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.repository = repository;
  }

  public SessionMemoryDecisionListResponse list(String sessionId) {
    String normalizedSessionId = requireSessionId(sessionId);
    SessionMemoryRepository resolved = optionalRepository();
    if (resolved == null) {
      return new SessionMemoryDecisionListResponse(List.of());
    }

    try {
      return new SessionMemoryDecisionListResponse(
        resolved.list(normalizedSessionId, properties.getSessionMemory().getMaxStoredDecisions())
      );
    } catch (RuntimeException error) {
      return new SessionMemoryDecisionListResponse(List.of());
    }
  }

  public SessionMemoryDecision save(String sessionId, SessionMemoryDecisionRequest request) {
    String normalizedSessionId = requireSessionId(sessionId);
    SessionMemoryRecord record = validate(request);
    String memoryId = memoryId(request);
    SessionMemoryRepository resolved = optionalRepository();
    if (resolved == null) {
      return fallbackDecision(memoryId, record, request);
    }

    try {
      return resolved
        .upsert(
          new SessionMemoryRepository.SessionMemoryRow(
            memoryId,
            normalizedSessionId,
            dedupeKey(record),
            record.topic(),
            record.selectedOption(),
            record.outcomeNote(),
            textOrNull(request.sourceRequestId()),
            textOrNull(request.sourceCaseId()),
            Instant.now().plus(properties.getSessionMemory().getTtl())
          ),
          properties.getSessionMemory().getMaxStoredDecisions()
        );
    } catch (RuntimeException error) {
      return fallbackDecision(memoryId, record, request);
    }
  }

  public void delete(String sessionId, String memoryId) {
    String normalizedSessionId = requireSessionId(sessionId);
    String normalizedMemoryId = requireText(memoryId, "memoryId");
    SessionMemoryRepository resolved = optionalRepository();
    if (resolved == null) {
      return;
    }

    try {
      resolved.delete(normalizedSessionId, normalizedMemoryId);
    } catch (RuntimeException error) {
      // Local-only fallback keeps the UI usable when the database is unavailable.
    }
  }

  public void clear(String sessionId) {
    String normalizedSessionId = requireSessionId(sessionId);
    SessionMemoryRepository resolved = optionalRepository();
    if (resolved == null) {
      return;
    }

    try {
      resolved.clear(normalizedSessionId);
    } catch (RuntimeException error) {
      // Local-only fallback keeps the UI usable when the database is unavailable.
    }
  }

  public JsonNode enrichPriorMemory(JsonNode request, String sessionId) {
    if (!request.isObject()) {
      return request;
    }

    List<SessionMemoryRecord> clientRecords = recordsFromRequest(request);
    List<SessionMemoryRecord> dbRecords = dbRecords(sessionId);
    List<SessionMemoryRecord> merged = dedupe(clientRecords, dbRecords);
    if (merged.isEmpty()) {
      return request;
    }

    ObjectNode nextRequest = request.deepCopy();
    ObjectNode priorMemory = nextRequest.path("prior_memory").isObject()
      ? (ObjectNode) nextRequest.path("prior_memory").deepCopy()
      : objectMapper.createObjectNode();
    ArrayNode recentSimilarDecisions = objectMapper.createArrayNode();
    for (SessionMemoryRecord record : merged) {
      ObjectNode item = objectMapper.createObjectNode();
      item.put("topic", record.topic());
      item.put("selected_option", record.selectedOption());
      item.put("outcome_note", record.outcomeNote());
      recentSimilarDecisions.add(item);
    }
    priorMemory.set("recent_similar_decisions", recentSimilarDecisions);
    nextRequest.set("prior_memory", priorMemory);
    return nextRequest;
  }

  private String memoryId(SessionMemoryDecisionRequest request) {
    String memoryId = textOrNull(request.id());
    return memoryId == null ? "mem_" + UUID.randomUUID() : memoryId;
  }

  private SessionMemoryDecision fallbackDecision(
    String memoryId,
    SessionMemoryRecord record,
    SessionMemoryDecisionRequest request
  ) {
    return new SessionMemoryDecision(
      memoryId,
      Instant.now().toString(),
      record.topic(),
      record.selectedOption(),
      record.outcomeNote(),
      textOrNull(request.sourceRequestId()),
      textOrNull(request.sourceCaseId())
    );
  }

  private List<SessionMemoryRecord> dbRecords(String sessionId) {
    if (!properties.getSessionMemory().isEnabled()) {
      return List.of();
    }
    String normalizedSessionId = textOrNull(sessionId);
    if (normalizedSessionId == null) {
      return List.of();
    }
    SessionMemoryRepository resolved = repository.getIfAvailable();
    if (resolved == null) {
      return List.of();
    }

    try {
      return resolved
        .list(normalizedSessionId, properties.getSessionMemory().getPriorMemoryLimit())
        .stream()
        .map(decision ->
          new SessionMemoryRecord(decision.topic(), decision.selected_option(), decision.outcome_note())
        )
        .filter(SessionMemoryRecord::complete)
        .toList();
    } catch (RuntimeException error) {
      return List.of();
    }
  }

  private List<SessionMemoryRecord> recordsFromRequest(JsonNode request) {
    JsonNode values = request.path("prior_memory").path("recent_similar_decisions");
    if (!values.isArray()) {
      return List.of();
    }
    List<SessionMemoryRecord> records = new ArrayList<>();
    values.forEach(value -> {
      SessionMemoryRecord record = new SessionMemoryRecord(
        value.path("topic").asText(""),
        value.path("selected_option").asText(""),
        value.path("outcome_note").asText("")
      );
      if (record.complete()) {
        records.add(record);
      }
    });
    return records;
  }

  private List<SessionMemoryRecord> dedupe(
    List<SessionMemoryRecord> clientRecords,
    List<SessionMemoryRecord> dbRecords
  ) {
    Map<String, SessionMemoryRecord> records = new LinkedHashMap<>();
    for (SessionMemoryRecord record : clientRecords) {
      records.putIfAbsent(dedupeKey(record), record);
    }
    for (SessionMemoryRecord record : dbRecords) {
      records.putIfAbsent(dedupeKey(record), record);
    }
    return records
      .values()
      .stream()
      .limit(properties.getSessionMemory().getPriorMemoryLimit())
      .toList();
  }

  private SessionMemoryRecord validate(SessionMemoryDecisionRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_memory_required");
    }
    return new SessionMemoryRecord(
      requireText(request.topic(), "topic"),
      requireText(request.selected_option(), "selected_option"),
      requireText(request.outcome_note(), "outcome_note")
    );
  }

  private String requireSessionId(String sessionId) {
    String normalized = textOrNull(sessionId);
    if (normalized == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "session_id_required");
    }
    return normalized;
  }

  private String requireText(String value, String field) {
    String normalized = textOrNull(value);
    if (normalized == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + "_required");
    }
    if (normalized.length() > MAX_TEXT_LENGTH) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + "_too_long");
    }
    return normalized;
  }

  private String textOrNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim();
  }

  private SessionMemoryRepository optionalRepository() {
    if (!properties.getSessionMemory().isEnabled()) {
      return null;
    }
    return repository.getIfAvailable();
  }

  private String dedupeKey(SessionMemoryRecord record) {
    return (
      record.topic().trim() +
      "\n" +
      record.selectedOption().trim() +
      "\n" +
      record.outcomeNote().trim()
    ).toLowerCase(Locale.ROOT);
  }

  private record SessionMemoryRecord(
    String topic,
    String selectedOption,
    String outcomeNote
  ) {
    boolean complete() {
      return !topic.isBlank() && !selectedOption.isBlank() && !outcomeNote.isBlank();
    }
  }
}
