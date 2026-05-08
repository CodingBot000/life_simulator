package com.lifesimulator.backend.engine.contract;

import java.util.Map;

public record DecisionOption(String id, String label, Map<String, Object> attributes) {}
