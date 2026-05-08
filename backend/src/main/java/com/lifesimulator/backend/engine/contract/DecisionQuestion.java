package com.lifesimulator.backend.engine.contract;

import java.util.Map;

public record DecisionQuestion(String prompt, String context, Map<String, Object> attributes) {}
