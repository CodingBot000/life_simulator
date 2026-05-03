package com.lifesimulator.backend.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class SimulationLogService {

  private static final Logger LOGGER = LoggerFactory.getLogger(SimulationLogService.class);

  private final ObjectProvider<SimulationLogRepository> repository;

  public SimulationLogService(ObjectProvider<SimulationLogRepository> repository) {
    this.repository = repository;
  }

  public void persistBestEffort(SimulationExecutionEnvelope envelope) {
    SimulationLogRepository resolved = repository.getIfAvailable();
    if (resolved == null) {
      return;
    }

    try {
      resolved.save(envelope);
    } catch (RuntimeException error) {
      LOGGER.warn("Failed to persist simulation execution envelope: {}", envelope.requestId(), error);
    }
  }
}
