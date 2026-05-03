package com.lifesimulator.backend.simulation;

public enum SimulationStage {
  STATE_LOADER("state_loader", "stateContext", "state_loader.md"),
  PLANNER("planner", "planner", "planner.md"),
  SCENARIO_A("scenario_a", "scenarioA", "scenario.md"),
  SCENARIO_B("scenario_b", "scenarioB", "scenario.md"),
  RISK_A("risk_a", "riskA", "risk.md"),
  RISK_B("risk_b", "riskB", "risk.md"),
  AB_REASONING("ab_reasoning", "reasoning", "ab_reasoning.md"),
  GUARDRAIL("guardrail", "guardrail", "guardrail.md"),
  ADVISOR("advisor", "advisor", "advisor.md"),
  REFLECTION("reflection", "reflection", "reflection.md");

  private final String stageName;
  private final String responseField;
  private final String promptFile;

  SimulationStage(String stageName, String responseField, String promptFile) {
    this.stageName = stageName;
    this.responseField = responseField;
    this.promptFile = promptFile;
  }

  public String stageName() {
    return stageName;
  }

  public String responseField() {
    return responseField;
  }

  public String promptFile() {
    return promptFile;
  }

  public boolean isDerivedOnly() {
    return this == GUARDRAIL;
  }
}
