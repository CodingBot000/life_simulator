package com.lifesimulator.backend.engine.contract;

import java.util.Map;

public record DecisionSubject(String type, Map<String, Object> attributes) {}
