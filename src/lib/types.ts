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

export type DecisionOptionLabel = "A" | "B";

export interface ReasoningPerspective {
  stance: string;
  summary: string;
  key_assumptions: string[];
  pros: string[];
  cons: string[];
  recommended_option: DecisionOptionLabel;
  confidence: number;
}

export interface ReasoningComparison {
  agreements: string[];
  conflicts: string[];
  which_fits_user_better: DecisionOptionLabel;
  reason: string;
}

export interface ReasoningFinalSelection {
  selected_reasoning: DecisionOptionLabel;
  selected_option: DecisionOptionLabel;
  why_selected: string;
  decision_confidence: number;
}

export interface AbReasoningResult {
  case_id: string;
  input_summary: {
    user_profile: UserProfile;
    decision_options: DecisionInput;
    planner_goal: string;
  };
  reasoning: {
    a_reasoning: ReasoningPerspective;
    b_reasoning: ReasoningPerspective;
    comparison: ReasoningComparison;
    final_selection: ReasoningFinalSelection;
  };
}

export interface AdvisorResult {
  recommended_option: DecisionOptionLabel;
  reason: string;
  reasoning_basis: {
    selected_reasoning: DecisionOptionLabel;
    core_why: string;
    decision_confidence: number;
  };
}

export type ReflectionScore = 1 | 2 | 3 | 4 | 5;

export interface ReflectionScores {
  realism: ReflectionScore;
  consistency: ReflectionScore;
  profile_alignment: ReflectionScore;
  recommendation_clarity: ReflectionScore;
}

export interface ReflectionIssue {
  type: "scenario" | "risk" | "reasoning" | "advisor" | "profile";
  description: string;
}

export interface ReflectionImprovementSuggestion {
  target: "planner" | "scenario" | "risk" | "reasoning" | "advisor";
  suggestion: string;
}

export interface ReflectionResult {
  scores: ReflectionScores;
  issues: ReflectionIssue[];
  improvement_suggestions: ReflectionImprovementSuggestion[];
  overall_comment: string;
}

export interface SimulationResponse {
  planner: PlannerResult;
  scenarioA: ScenarioResult;
  scenarioB: ScenarioResult;
  riskA: RiskResult;
  riskB: RiskResult;
  reasoning: AbReasoningResult;
  advisor: AdvisorResult;
  reflection: ReflectionResult;
}
