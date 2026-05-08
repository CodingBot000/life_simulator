package com.lifesimulator.backend.engine.contract;

import java.util.List;
import java.util.Map;

public record GenericDecisionRequest(
  DecisionSubject subject,
  DecisionQuestion question,
  DecisionContext context,
  DecisionPreference preference,
  List<DecisionOption> options,
  Map<String, Object> memory,
  Map<String, Object> hints
) {}
