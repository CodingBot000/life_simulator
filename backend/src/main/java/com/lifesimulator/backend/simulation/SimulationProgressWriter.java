package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class SimulationProgressWriter {

  private final ObjectMapper objectMapper;
  private final OutputStream output;

  public SimulationProgressWriter(ObjectMapper objectMapper, OutputStream output) {
    this.objectMapper = objectMapper;
    this.output = output;
  }

  public synchronized void write(Object event) throws IOException {
    output.write(objectMapper.writeValueAsString(event).getBytes(StandardCharsets.UTF_8));
    output.write('\n');
    output.flush();
  }
}
