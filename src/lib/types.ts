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

export interface MemoryDecisionRecord {
  topic: string;
  selected_option: string;
  outcome_note: string;
}

export interface ProfileState {
  risk_preference: string;
  decision_style: string;
  top_priorities: string[];
}

export interface SituationalState {
  career_stage: string;
  financial_pressure: string;
  time_pressure: string;
  emotional_state: string;
}

export interface MemoryState {
  recent_similar_decisions: MemoryDecisionRecord[];
  repeated_patterns: string[];
  consistency_notes: string[];
}

export interface UserState {
  profile_state: ProfileState;
  situational_state: SituationalState;
  memory_state: MemoryState;
}

export interface StateSummary {
  decision_bias: string;
  current_constraint: string;
  agent_guidance: string;
}

export interface StateContext {
  case_id: string;
  user_state: UserState;
  state_summary: StateSummary;
}

export interface StateHints {
  profile_state?: Partial<ProfileState>;
  situational_state?: Partial<SituationalState>;
}

export interface SimulationRequest {
  userProfile: UserProfile;
  decision: DecisionInput;
  prior_memory?: Partial<MemoryState>;
  state_hints?: StateHints;
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
export type AdvisorDecision = DecisionOptionLabel | "undecided";
export type GuardrailTrigger =
  | "ambiguity_high"
  | "reasoning_conflict"
  | "low_confidence"
  | "high_risk";
export type GuardrailStrategy =
  | "ask_more_info"
  | "neutralize_decision"
  | "soft_recommendation"
  | "risk_warning";
export type GuardrailMode = "normal" | "cautious" | "blocked";
export type GuardrailDecision = "allow" | "block" | "review";
export type OperationalOutputMode = "normal" | "safe" | "blocked";
export type GuardrailDecisionFlowStep =
  | "input_analysis"
  | "signal_extraction"
  | "threshold_compare"
  | "final_decision";

export interface GuardrailReasoningSignals {
  conflicting_signals: boolean;
  missing_context: boolean;
  weak_evidence: boolean;
  ambiguous_wording: boolean;
  strong_consensus: boolean;
  repeated_evidence: boolean;
}

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

export interface GuardrailResult {
  guardrail_triggered: boolean;
  triggers: GuardrailTrigger[];
  strategy: GuardrailStrategy[];
  risk_score: number;
  confidence_score: number;
  uncertainty_score: number;
  reasoning_signals: GuardrailReasoningSignals;
  final_mode: GuardrailMode;
}

export interface GuardrailLogSignals {
  cost_issue?: boolean;
  effect_issue?: boolean;
  recovery_issue?: boolean;
  safety_issue?: boolean;
}

export interface GuardrailThresholdEval {
  cost_weight: number;
  effect_weight: number;
  recovery_weight: number;
  safety_weight: number;
  total_score: number;
}

export interface GuardrailCalibrationInfo {
  adjusted_confidence: number;
  calibration_version: string;
}

export interface LogVersionInfo {
  record_version: string;
  evaluator_version: string;
  threshold_version: string;
  calibration_version: string;
  signal_mapping_version: string;
  prompt_version?: string;
}

export interface GuardrailDerivedSummary {
  raw_guardrail_mode: GuardrailMode;
  output_mode: OperationalOutputMode;
  detected_triggers: GuardrailTrigger[];
  trigger_count: number;
  reason: string;
}

export interface AnomalyFlags {
  underblocking: boolean;
  overblocking: boolean;
  low_confidence: boolean;
  conflict: boolean;
}

export interface AnomalyEvaluationSet {
  anomaly_raw_based: AnomalyFlags;
  anomaly_derived_based: AnomalyFlags;
}

export type AnomalySource = "anomaly_raw_based" | "anomaly_derived_based";
export type GuardrailRawLog = Record<string, any>;

export interface GuardrailDerivedLog {
  risk_level: RiskTolerance;
  confidence: number;
  uncertainty: number;
  decision: GuardrailDecision;
  output_mode: OperationalOutputMode;
  summary: GuardrailDerivedSummary;
  reasons: string[];
  threshold_hit: string[];
  signals: GuardrailLogSignals;
  threshold_eval: GuardrailThresholdEval;
  reasoning_trace: string[];
  decision_flow: GuardrailDecisionFlowStep[];
  calibration: GuardrailCalibrationInfo;
  mapping_note: string;
  anomaly: AnomalyEvaluationSet;
}

export interface GuardrailLogRecord {
  versions: LogVersionInfo;
  guardrail_raw: GuardrailRawLog;
  guardrail_derived: GuardrailDerivedLog;
}

export interface RequestLog {
  request_id: string;
  timestamp: string;
  versions: LogVersionInfo;
  input: {
    user_query: string;
    user_context: Record<string, any>;
  };
  state: {
    session_id: string;
    memory_snapshot?: MemoryState;
    state_context?: StateContext;
  };
  intermediate: {
    planner?: PlannerResult;
    scenario?: {
      optionA: ScenarioResult;
      optionB: ScenarioResult;
    };
    risk?: {
      optionA: RiskResult;
      optionB: RiskResult;
    };
    ab_reasoning?: AbReasoningResult;
  };
  guardrail: GuardrailLogRecord;
  output: {
    final_answer: string;
    mode: OperationalOutputMode;
  };
  meta: {
    latency_ms: number;
    model: string;
    tokens: number;
  };
}

export interface AnomalyQueueEntry {
  queue_id: string;
  detected_at: string;
  versions: LogVersionInfo;
  source: AnomalySource[];
  anomaly: AnomalyEvaluationSet;
  request_log: RequestLog;
}

export interface ReEvaluationDatasetCandidate {
  versions: LogVersionInfo;
  input: RequestLog["input"];
  expected: {
    risk_level: RiskTolerance;
    decision: GuardrailDecision;
    mode: OperationalOutputMode;
  };
  source: "online_anomaly";
  judge: string;
}

export interface ReEvaluationResult {
  request_id: string;
  reevaluated_at: string;
  source_log_path: string;
  versions: LogVersionInfo;
  source: AnomalySource[];
  anomaly: AnomalyEvaluationSet;
  reevaluated_guardrail: GuardrailLogRecord;
  dataset_candidate: ReEvaluationDatasetCandidate;
}

export interface AdvisorResult {
  decision: AdvisorDecision;
  confidence: number;
  reason: string;
  guardrail_applied: boolean;
  recommended_option: AdvisorDecision;
  reasoning_basis: {
    selected_reasoning: AdvisorDecision;
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

export interface ReflectionGuardrailReview {
  was_needed: boolean;
  was_triggered: boolean;
  correctness: "good" | "over" | "missing";
}

export interface ReflectionResult {
  evaluation: string;
  scores: ReflectionScores;
  issues: ReflectionIssue[];
  improvement_suggestions: ReflectionImprovementSuggestion[];
  overall_comment: string;
  guardrail_review: ReflectionGuardrailReview;
}

export interface SimulationResponse {
  request_id: string;
  stateContext: StateContext;
  planner: PlannerResult;
  scenarioA: ScenarioResult;
  scenarioB: ScenarioResult;
  riskA: RiskResult;
  riskB: RiskResult;
  reasoning: AbReasoningResult;
  guardrail: GuardrailResult;
  advisor: AdvisorResult;
  reflection: ReflectionResult;
}
