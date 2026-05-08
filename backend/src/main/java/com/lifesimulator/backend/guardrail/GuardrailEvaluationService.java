package com.lifesimulator.backend.guardrail;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifesimulator.backend.engine.domain.life.guardrail.LifeGuardrailSignalMapper;
import com.lifesimulator.backend.engine.guardrail.GuardrailResultFactory;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import org.springframework.stereotype.Service;

@Service
public class GuardrailEvaluationService {

  private final GuardrailResultFactory resultFactory;
  private final LifeGuardrailSignalMapper signalMapper;

  public GuardrailEvaluationService(
    GuardrailResultFactory resultFactory,
    LifeGuardrailSignalMapper signalMapper
  ) {
    this.resultFactory = resultFactory;
    this.signalMapper = signalMapper;
  }

  public JsonNode evaluate(JsonNode response, BackendRoutingDecision routingDecision) {
    return resultFactory.create(signalMapper.inputFor(response, routingDecision));
  }
}
