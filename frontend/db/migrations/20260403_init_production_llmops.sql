CREATE TABLE IF NOT EXISTS llm_request_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  trace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  route_name TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  prompt_version TEXT,
  context_version TEXT,
  decision TEXT,
  confidence DOUBLE PRECISION,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_stage_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  route_name TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  stage_name TEXT NOT NULL,
  model TEXT,
  decision TEXT,
  confidence DOUBLE PRECISION,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, stage_name)
);

CREATE TABLE IF NOT EXISTS llm_guardrail_events (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  trace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  route_name TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  decision TEXT,
  confidence DOUBLE PRECISION,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_anomaly_events (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  route_name TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  decision TEXT,
  confidence DOUBLE PRECISION,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, created_at)
);

CREATE TABLE IF NOT EXISTS llm_drift_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  bucket_label TEXT NOT NULL,
  route_name TEXT NOT NULL,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms DOUBLE PRECISION,
  total_tokens DOUBLE PRECISION,
  estimated_cost_usd NUMERIC(12, 6),
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, bucket_label, route_name)
);

CREATE TABLE IF NOT EXISTS llm_model_usage_daily (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  route_name TEXT NOT NULL,
  model TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (metric_date, route_name, model)
);

CREATE TABLE IF NOT EXISTS llm_eval_samples (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  trace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  route_name TEXT NOT NULL,
  path JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  decision TEXT,
  confidence DOUBLE PRECISION,
  guardrail_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  expected_payload JSONB,
  actual_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_request_logs_created_at
  ON llm_request_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_stage_logs_created_at
  ON llm_stage_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_guardrail_events_created_at
  ON llm_guardrail_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_anomaly_events_created_at
  ON llm_anomaly_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_daily_metric_date
  ON llm_model_usage_daily (metric_date DESC);
