CREATE TABLE IF NOT EXISTS life_simul_session_memory_decisions (
  id BIGSERIAL PRIMARY KEY,
  memory_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  outcome_note TEXT NOT NULL,
  source_request_id TEXT,
  source_case_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_life_simul_session_memory_dedupe
  ON life_simul_session_memory_decisions (session_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_life_simul_session_memory_session_created
  ON life_simul_session_memory_decisions (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_life_simul_session_memory_expires_at
  ON life_simul_session_memory_decisions (expires_at);
