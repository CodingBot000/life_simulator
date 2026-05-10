CREATE TABLE IF NOT EXISTS life_simul_user_feedback (
  id BIGSERIAL PRIMARY KEY,
  feedback_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  target_type TEXT NOT NULL,
  target_option TEXT,
  feedback_signal TEXT NOT NULL,
  rating INTEGER,
  reason_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_user_feedback_request_id
  ON life_simul_user_feedback (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_user_feedback_session_id
  ON life_simul_user_feedback (session_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_user_feedback_target_signal
  ON life_simul_user_feedback (target_type, feedback_signal);

CREATE INDEX IF NOT EXISTS idx_life_simul_user_feedback_created_at
  ON life_simul_user_feedback (created_at DESC);

CREATE TABLE IF NOT EXISTS life_simul_outcome_followups (
  id BIGSERIAL PRIMARY KEY,
  followup_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  actual_choice TEXT NOT NULL,
  satisfaction_score INTEGER,
  regret_score INTEGER,
  outcome_note TEXT,
  unexpected_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  horizon_days INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_outcome_followups_request_id
  ON life_simul_outcome_followups (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_outcome_followups_created_at
  ON life_simul_outcome_followups (created_at DESC);

CREATE TABLE IF NOT EXISTS life_simul_state_corrections (
  id BIGSERIAL PRIMARY KEY,
  correction_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  field_path TEXT NOT NULL,
  original_value JSONB,
  corrected_value JSONB NOT NULL,
  correction_type TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_state_corrections_request_id
  ON life_simul_state_corrections (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_state_corrections_created_at
  ON life_simul_state_corrections (created_at DESC);

CREATE TABLE IF NOT EXISTS life_simul_guardrail_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  reviewer_type TEXT NOT NULL,
  review_label TEXT NOT NULL,
  correct_mode TEXT,
  reason_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_guardrail_reviews_request_id
  ON life_simul_guardrail_reviews (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_guardrail_reviews_label
  ON life_simul_guardrail_reviews (review_label);

CREATE INDEX IF NOT EXISTS idx_life_simul_guardrail_reviews_created_at
  ON life_simul_guardrail_reviews (created_at DESC);

CREATE TABLE IF NOT EXISTS life_simul_dataset_candidates (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL UNIQUE,
  request_id TEXT NOT NULL,
  candidate_type TEXT NOT NULL,
  source TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  expected_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  label_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_life_simul_dataset_candidates_request_id
  ON life_simul_dataset_candidates (request_id);

CREATE INDEX IF NOT EXISTS idx_life_simul_dataset_candidates_type_status
  ON life_simul_dataset_candidates (candidate_type, status);

CREATE INDEX IF NOT EXISTS idx_life_simul_dataset_candidates_created_at
  ON life_simul_dataset_candidates (created_at DESC);
