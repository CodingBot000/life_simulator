package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.isNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.logging.SimulationExecutionEnvelope;
import com.lifesimulator.backend.logging.SimulationLogService;
import com.lifesimulator.backend.security.SimulationRateLimitService;
import com.lifesimulator.backend.simulation.SimulationProgressWriter;
import com.lifesimulator.backend.simulation.SimulationRunResult;
import com.lifesimulator.backend.simulation.SimulationService;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class SimulationControllerTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void simulateReturnsContractHeadersAndPersistsLog() throws Exception {
    SimulatorProperties properties = new SimulatorProperties();
    SimulationExecutionEnvelope envelope = mock(SimulationExecutionEnvelope.class);
    SimulationLogService logService = mock(SimulationLogService.class);
    SimulationService simulationService = mock(SimulationService.class);
    when(simulationService.model()).thenReturn("test-model");
    when(
      simulationService.run(
        any(JsonNode.class),
        anyString(),
        anyString(),
        isNull(SimulationProgressWriter.class)
      )
    ).thenReturn(new SimulationRunResult(response(), envelope));

    SimulationController controller = new SimulationController(
      objectMapper,
      properties,
      new SimulationRateLimitService(properties),
      logService,
      simulationService
    );

    var response = controller.simulate(validRequest(), new HttpHeaders(), request("203.0.113.11"));

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getHeaders().getFirst("x-request-id")).isEqualTo("request-1");
    assertThat(response.getHeaders().getFirst("x-llm-model")).isEqualTo("test-model");
    assertThat(response.getHeaders().getFirst("x-llm-execution-mode")).isEqualTo("light");
    assertThat(response.getHeaders().getFirst("x-llm-selected-path")).isEqualTo("planner,advisor");
    assertSimulationResponseContract(response.getBody());
    verify(logService).persistBestEffort(envelope);
  }

  @Test
  void simulateStreamReturnsProgressResultEvent() throws Exception {
    SimulatorProperties properties = new SimulatorProperties();
    SimulationExecutionEnvelope envelope = mock(SimulationExecutionEnvelope.class);
    SimulationLogService logService = mock(SimulationLogService.class);
    SimulationService simulationService = mock(SimulationService.class);
    when(simulationService.model()).thenReturn("test-model");
    when(
      simulationService.run(
        any(JsonNode.class),
        anyString(),
        anyString(),
        isNotNull(SimulationProgressWriter.class)
      )
    ).thenAnswer(invocation -> {
      SimulationProgressWriter progress = invocation.getArgument(3);
      progress.write(
        java.util.Map.of(
          "type",
          "request_started",
          "request_id",
          "request-1",
          "trace_id",
          "trace-1"
        )
      );
      return new SimulationRunResult(response(), envelope);
    });

    SimulationController controller = new SimulationController(
      objectMapper,
      properties,
      new SimulationRateLimitService(properties),
      logService,
      simulationService
    );

    var response = controller.simulateStream(validRequest(), new HttpHeaders(), request("203.0.113.12"));
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    StreamingResponseBody body = response.getBody();
    assertThat(body).isNotNull();
    body.writeTo(output);

    List<JsonNode> events = output
      .toString(StandardCharsets.UTF_8)
      .lines()
      .filter(line -> !line.isBlank())
      .map(line -> {
        try {
          return objectMapper.readTree(line);
        } catch (Exception error) {
          throw new IllegalStateException(error);
        }
      })
      .toList();

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(events).extracting(event -> event.path("type").asText()).containsExactly("request_started", "result");
    assertSimulationResponseContract(events.get(1).path("response"));
    verify(logService).persistBestEffort(envelope);
  }

  @Test
  void simulateRejectsBeforeRunningSimulationWhenRateLimitIsExceeded() throws Exception {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getSecurity().getRateLimit().setIpMinuteLimit(1);
    properties.getSecurity().getRateLimit().setIpHourLimit(100);
    properties.getSecurity().getRateLimit().setSessionHourLimit(100);

    SimulationLogService logService = mock(SimulationLogService.class);
    SimulationService simulationService = mock(SimulationService.class);
    when(simulationService.model()).thenReturn("test-model");
    when(
      simulationService.run(
        any(JsonNode.class),
        anyString(),
        anyString(),
        isNull(SimulationProgressWriter.class)
      )
    ).thenReturn(new SimulationRunResult(response(), mock(SimulationExecutionEnvelope.class)));

    SimulationController controller = new SimulationController(
      objectMapper,
      properties,
      new SimulationRateLimitService(properties),
      logService,
      simulationService
    );
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr("203.0.113.10");
    HttpHeaders headers = new HttpHeaders();
    headers.set("x-session-id", "session-a");

    assertThat(controller.simulate(objectMapper.createObjectNode(), headers, request).getStatusCode())
      .isEqualTo(HttpStatus.OK);
    assertThat(controller.simulate(objectMapper.createObjectNode(), headers, request).getStatusCode())
      .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);

    verify(simulationService, times(1)).run(
      any(JsonNode.class),
      anyString(),
      anyString(),
      isNull(SimulationProgressWriter.class)
    );
  }

  private void assertSimulationResponseContract(JsonNode response) {
    assertThat(response).isNotNull();
    assertThat(response.path("request_id").asText()).isNotBlank();
    assertThat(response.path("routing").isObject()).isTrue();
    assertThat(response.path("stateContext").isObject()).isTrue();
    assertThat(response.path("planner").isObject()).isTrue();
    assertThat(response.path("guardrail").isObject()).isTrue();
    assertThat(response.path("advisor").isObject()).isTrue();
    assertThat(response.path("reflection").isObject()).isTrue();
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

  private MockHttpServletRequest request(String remoteAddr) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr(remoteAddr);
    return request;
  }

  private JsonNode response() {
    ObjectNode response = objectMapper.createObjectNode();
    response.put("request_id", "request-1");
    ObjectNode routing = response.putObject("routing");
    routing.put("execution_mode", "light");
    ArrayNode selectedPath = routing.putArray("selected_path");
    selectedPath.add("planner");
    selectedPath.add("advisor");
    response.putObject("stateContext");
    response.putObject("planner");
    response.putObject("guardrail");
    response.putObject("advisor");
    response.putObject("reflection");
    return response;
  }
}
