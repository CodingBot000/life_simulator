import type { GuardrailEvaluationActual } from "../../lib/guardrail-eval.ts";
import type {
  ExecutionMode,
  RequestLog,
  SimulationRequest,
  SimulationResponse,
} from "../../lib/types.ts";

export interface LLMStageLogEntry {
  request_id: string;
  trace_id: string;
  user_id: string;
  session_id: string;
  route_name: string;
  execution_mode: ExecutionMode;
  selected_path: string[];
  stage_name: string;
  model: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  fallback_used: boolean;
  retry_count: number;
  cache_hit: boolean;
  schema_valid: boolean;
  schema_failure_count: number;
  error_code?: string;
  prompt_version: string;
  context_version: string;
  request_payload: unknown;
  response_payload: unknown;
  created_at: string;
}

export interface RequestExecutionEnvelope {
  request_id: string;
  trace_id: string;
  user_id: string;
  session_id: string;
  route_name: string;
  execution_mode: ExecutionMode;
  selected_path: string[];
  selected_model: string;
  stage_model_plan: Record<string, string>;
  stage_fallback_plan: Record<string, string>;
  prompt_version: string;
  context_version: string;
  decision: string;
  confidence: number;
  latency_ms: number;
  total_tokens: number;
  estimated_cost_usd: number;
  fallback_used: boolean;
  retry_count: number;
  cache_hit: boolean;
  schema_valid: boolean;
  schema_failure_count: number;
  guardrail_flags: {
    final_mode: string;
    decision: string;
    risk_level: string;
    triggers: string[];
    confidence: number;
    uncertainty: number;
  };
  request_payload: SimulationRequest;
  response_payload: SimulationResponse;
  request_log: RequestLog;
  stage_logs: LLMStageLogEntry[];
  guardrail_evaluation: GuardrailEvaluationActual;
  created_at: string;
}

export interface EvalSampleRecord {
  request_id: string;
  trace_id: string;
  user_id: string;
  session_id: string;
  route_name: string;
  model: string;
  decision: string;
  confidence: number;
  guardrail_flags: Record<string, unknown>;
  expected_payload: Record<string, unknown>;
  actual_payload: Record<string, unknown>;
  source: "anomaly_queue";
  created_at: string;
}

export interface DriftAnomalyEvent {
  request_id?: string;
  trace_id?: string;
  route_name: string;
  anomaly_type: string;
  severity: "warning" | "critical";
  metric_name: string;
  current_value: number;
  baseline_value: number;
  threshold: number;
  message: string;
  created_at: string;
}

export interface DriftMetricSnapshot {
  metric_date: string;
  bucket_label: string;
  route_name: string;
  request_count: number;
  allow_rate: number;
  review_rate: number;
  block_rate: number;
  low_confidence_allow_rate: number;
  schema_fail_rate: number;
  fallback_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  avg_tokens: number;
  avg_cost_usd: number;
  guardrail_trigger_distribution: Record<string, number>;
  anomalies: DriftAnomalyEvent[];
  created_at: string;
}
