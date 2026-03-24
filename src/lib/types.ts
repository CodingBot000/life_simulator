export type RiskTolerance = "low" | "medium" | "high";

export interface UserProfile {
  age: number;
  job: string;
  risk_tolerance: RiskTolerance;
  priority: string[];
}

export interface DecisionInput {
  optionA: string;
  optionB: string;
  context: string;
}

export interface SimulationRequest {
  userProfile: UserProfile;
  decision: DecisionInput;
}

export interface PlannerResult {
  decision_type: string;
  factors: string[];
}

export interface ScenarioResult {
  three_months: string;
  one_year: string;
  three_years: string;
}

export interface RiskResult {
  risk_level: RiskTolerance;
  reasons: string[];
}

export interface AdvisorResult {
  recommended_option: "A" | "B";
  reason: string;
}

export interface SimulationResponse {
  planner: PlannerResult;
  scenarioA: ScenarioResult;
  scenarioB: ScenarioResult;
  riskA: RiskResult;
  riskB: RiskResult;
  advisor: AdvisorResult;
}
