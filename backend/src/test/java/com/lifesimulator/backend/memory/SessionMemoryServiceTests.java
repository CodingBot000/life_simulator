package com.lifesimulator.backend.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.server.ResponseStatusException;

class SessionMemoryServiceTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void enrichPriorMemoryMergesClientRecordsBeforeDatabaseRecords() {
    SessionMemoryRepository repository = mock(SessionMemoryRepository.class);
    when(repository.list("session-a", 5))
      .thenReturn(
        List.of(
          new SessionMemoryDecision(
            "mem-db",
            "2026-05-13T00:00:00Z",
            "커리어",
            "B",
            "서버 저장",
            null,
            null
          )
        )
      );
    SessionMemoryService service = service(repository);
    ObjectNode request = validRequest();
    ObjectNode clientRecord = request.putObject("prior_memory")
      .putArray("recent_similar_decisions")
      .addObject();
    clientRecord.put("topic", "관계");
    clientRecord.put("selected_option", "A");
    clientRecord.put("outcome_note", "로컬 저장");

    JsonNode enriched = service.enrichPriorMemory(request, "session-a");

    JsonNode records = enriched.path("prior_memory").path("recent_similar_decisions");
    assertThat(records).hasSize(2);
    assertThat(records.get(0).path("topic").asText()).isEqualTo("관계");
    assertThat(records.get(1).path("topic").asText()).isEqualTo("커리어");
  }

  @Test
  void enrichPriorMemoryKeepsClientRecordsWhenRepositoryFails() {
    SessionMemoryRepository repository = mock(SessionMemoryRepository.class);
    when(repository.list("session-a", 5)).thenThrow(new IllegalStateException("db down"));
    SessionMemoryService service = service(repository);
    ObjectNode request = validRequest();
    ObjectNode clientRecord = request.putObject("prior_memory")
      .putArray("recent_similar_decisions")
      .addObject();
    clientRecord.put("topic", "관계");
    clientRecord.put("selected_option", "A");
    clientRecord.put("outcome_note", "로컬 저장");

    JsonNode enriched = service.enrichPriorMemory(request, "session-a");

    assertThat(enriched.path("prior_memory").path("recent_similar_decisions")).hasSize(1);
  }

  @Test
  void saveRejectsBlankFields() {
    SessionMemoryService service = service(mock(SessionMemoryRepository.class));

    assertThatThrownBy(() ->
      service.save(
        "session-a",
        new SessionMemoryDecisionRequest(null, "", "A", "note", null, null)
      )
    )
      .isInstanceOf(ResponseStatusException.class)
      .hasMessageContaining("topic_required");
  }

  @SuppressWarnings("unchecked")
  private SessionMemoryService service(SessionMemoryRepository repository) {
    ObjectProvider<SessionMemoryRepository> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(repository);
    return new SessionMemoryService(objectMapper, new SimulatorProperties(), provider);
  }

  private ObjectNode validRequest() {
    ObjectNode request = objectMapper.createObjectNode();
    ObjectNode profile = request.putObject("userProfile");
    profile.put("age", 32);
    profile.put("job", "developer");
    profile.put("risk_tolerance", "medium");
    profile.putArray("priority").add("stability").add("income");
    ObjectNode decision = request.putObject("decision");
    decision.put("optionA", "현재 회사에 남는다");
    decision.put("optionB", "스타트업으로 이직한다");
    decision.put("context", "현재 연봉은 안정적이지만 성장 정체를 느끼고 있다.");
    return request;
  }
}
