package com.lifesimulator.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.logging.SimulationExecutionEnvelope;
import com.lifesimulator.backend.logging.SimulationLogService;
import com.lifesimulator.backend.security.SimulationRateLimitService;
import com.lifesimulator.backend.simulation.SimulationProgressWriter;
import com.lifesimulator.backend.simulation.SimulationRunResult;
import com.lifesimulator.backend.simulation.SimulationService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class SimulationControllerTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

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

  private JsonNode response() {
    ObjectNode response = objectMapper.createObjectNode();
    response.put("request_id", "request-1");
    ObjectNode routing = response.putObject("routing");
    routing.put("execution_mode", "light");
    routing.putArray("selected_path").add("planner").add("advisor");
    return response;
  }
}
