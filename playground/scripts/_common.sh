#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYGROUND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PLAYGROUND_DIR/.." && pwd)"
PROMPTS_DIR="$REPO_ROOT/prompts"
INPUTS_DIR="$PLAYGROUND_DIR/inputs"
OUTPUTS_ROOT_DIR="$PLAYGROUND_DIR/outputs"
OUTPUTS_DIR="${PLAYGROUND_OUTPUT_DIR:-$OUTPUTS_ROOT_DIR}"

compose_only_enabled() {
  [ "${CODEX_COMPOSE_ONLY:-0}" = "1" ]
}

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required for the playground scripts." >&2
    echo "Install jq first, for example with: brew install jq" >&2
    exit 1
  fi
}

require_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "Error: codex CLI is required for live execution mode." >&2
    echo "Install Codex CLI or run with CODEX_COMPOSE_ONLY=1 for request composition only." >&2
    exit 1
  fi
}

ensure_output_dir() {
  mkdir -p "$OUTPUTS_DIR"
}

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

relative_to_root() {
  local path="$1"
  path="${path#$REPO_ROOT/}"
  printf '%s\n' "$path"
}

resolve_input_file() {
  local input_file="${1:-$INPUTS_DIR/sample-input.json}"

  if [ ! -f "$input_file" ]; then
    echo "Error: input file not found: $input_file" >&2
    exit 1
  fi

  if ! jq empty "$input_file" >/dev/null 2>&1; then
    echo "Error: input file is not valid JSON: $input_file" >&2
    exit 1
  fi

  printf '%s\n' "$input_file"
}

derive_case_id_from_input() {
  local input_file="$1"
  local base_name
  base_name="$(basename "$input_file")"
  printf '%s\n' "${base_name%.json}"
}

resolve_output_dir() {
  local input_file="$1"
  local requested_output_dir="${2:-${PLAYGROUND_OUTPUT_DIR:-}}"
  local output_dir

  if [ -n "$requested_output_dir" ]; then
    output_dir="$requested_output_dir"
  else
    output_dir="$OUTPUTS_ROOT_DIR/$(derive_case_id_from_input "$input_file")"
  fi

  mkdir -p "$output_dir"
  printf '%s\n' "$output_dir"
}

case_id_from_output_dir() {
  local output_dir="$1"
  basename "$output_dir"
}

read_json_compact() {
  jq -c . "$1"
}

read_json_pretty() {
  jq . "$1"
}

prompt_path() {
  printf '%s/%s.md\n' "$PROMPTS_DIR" "$1"
}

read_prompt() {
  local stage="$1"
  local file
  file="$(prompt_path "$stage")"

  if [ ! -f "$file" ]; then
    echo "Error: prompt file not found: $file" >&2
    exit 1
  fi

  cat "$file"
}

stage_request_path() {
  printf '%s/%s-request.json\n' "$OUTPUTS_DIR" "$1"
}

stage_preview_path() {
  printf '%s/%s-preview.md\n' "$OUTPUTS_DIR" "$1"
}

stage_result_path() {
  printf '%s/%s-result.json\n' "$OUTPUTS_DIR" "$1"
}

stage_stub_path() {
  printf '%s/%s-result.stub.json\n' "$OUTPUTS_DIR" "$1"
}

summary_path() {
  printf '%s/summary.md\n' "$OUTPUTS_DIR"
}

copy_input_snapshot() {
  local input_file="$1"
  cp "$input_file" "$OUTPUTS_DIR/input.json"
}

resolve_stage_result_file() {
  local stage="$1"
  local actual_file
  local stub_file

  actual_file="$(stage_result_path "$stage")"
  stub_file="$(stage_stub_path "$stage")"

  if [ -f "$actual_file" ]; then
    printf '%s\n' "$actual_file"
    return 0
  fi

  if [ -f "$stub_file" ]; then
    printf '%s\n' "$stub_file"
    return 0
  fi

  echo "Error: missing result for stage '$stage'." >&2
  echo "Expected either $actual_file or $stub_file" >&2
  exit 1
}

schema_for_stage() {
  case "$1" in
    planner)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "decision_type": {
      "type": "string"
    },
    "factors": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": ["decision_type", "factors"]
}
JSON
      ;;
    scenario)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "three_months": {
      "type": "string"
    },
    "one_year": {
      "type": "string"
    },
    "three_years": {
      "type": "string"
    }
  },
  "required": ["three_months", "one_year", "three_years"]
}
JSON
      ;;
    risk)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    },
    "reasons": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": ["risk_level", "reasons"]
}
JSON
      ;;
    advisor)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "recommended_option": {
      "type": "string",
      "enum": ["A", "B"]
    },
    "reason": {
      "type": "string"
    }
  },
  "required": ["recommended_option", "reason"]
}
JSON
      ;;
    *)
      echo "Error: unknown schema stage '$1'" >&2
      exit 1
      ;;
  esac
}

write_request_preview() {
  local request_file="$1"
  local preview_file="$2"
  local title="$3"

  {
    printf '# %s\n\n' "$title"
    printf -- '- Request file: `%s`\n' "$(relative_to_root "$request_file")"
    printf -- '- Prompt file: `%s`\n' "$(jq -r '.prompt_file' "$request_file")"
    printf -- '- Input source: `%s`\n' "$(jq -r '.input_source' "$request_file")"

    if [ "$(jq '.previous_stage_result_files | length' "$request_file")" -gt 0 ]; then
      while IFS= read -r previous_file; do
        printf -- '- Previous result: `%s`\n' "$previous_file"
      done < <(jq -r '.previous_stage_result_files[]' "$request_file")
    else
      printf -- '- Previous result: `(none)`\n'
    fi

    printf '\n## Prompt\n\n```md\n%s\n```\n' "$(jq -r '.prompt_text' "$request_file")"
    printf '\n## Input JSON\n\n```json\n%s\n```\n' "$(jq -r '.input_json' "$request_file")"
    printf '\n## Expected Output Schema\n\n```json\n%s\n```\n' "$(jq '.expected_output_schema' "$request_file")"
    printf '\n## Provider Payload Preview\n\n```json\n%s\n```\n' "$(jq '.provider_payload' "$request_file")"
  } > "$preview_file"
}

normalize_inline_text() {
  tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

build_codex_exec_prompt() {
  local request_file="$1"
  local stage_name="$2"

  local prompt_text
  local input_json
  local expected_output_schema

  prompt_text="$(jq -r '.prompt_text' "$request_file")"
  input_json="$(jq -r '.input_json' "$request_file")"
  expected_output_schema="$(jq '.expected_output_schema' "$request_file")"

  cat <<EOF
You are executing the "${stage_name}" stage of a structured decision-simulation pipeline.

Follow the stage prompt exactly.
Return only valid JSON matching the expected output schema.
Do not wrap the output in markdown.
Do not add explanations, notes, or prose outside the JSON object.

[Stage Prompt]
$prompt_text

[Input JSON]
$input_json

[Expected Output Schema]
$expected_output_schema
EOF
}

validate_stage_result() {
  local stage_type="$1"
  local result_file="$2"

  if ! jq empty "$result_file" >/dev/null 2>&1; then
    echo "Error: stage '$stage_type' returned invalid JSON: $result_file" >&2
    exit 1
  fi

  case "$stage_type" in
    planner)
      jq -e '
        type == "object" and
        ((keys | sort) == ["decision_type", "factors"]) and
        (.decision_type | type == "string" and length > 0) and
        (.factors | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0))
      ' "$result_file" >/dev/null
      ;;
    scenario)
      jq -e '
        type == "object" and
        ((keys | sort) == ["one_year", "three_months", "three_years"]) and
        (.three_months | type == "string" and length > 0) and
        (.one_year | type == "string" and length > 0) and
        (.three_years | type == "string" and length > 0)
      ' "$result_file" >/dev/null
      ;;
    risk)
      jq -e '
        type == "object" and
        ((keys | sort) == ["reasons", "risk_level"]) and
        (.risk_level | IN("low", "medium", "high")) and
        (.reasons | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0))
      ' "$result_file" >/dev/null
      ;;
    advisor)
      jq -e '
        type == "object" and
        ((keys | sort) == ["reason", "recommended_option"]) and
        (.recommended_option | IN("A", "B")) and
        (.reason | type == "string" and length > 0)
      ' "$result_file" >/dev/null
      ;;
    *)
      echo "Error: unknown stage type '$stage_type' for validation." >&2
      exit 1
      ;;
  esac
}

run_codex_for_request() {
  local stage_type="$1"
  local stage_name="$2"
  local request_file="$3"
  local result_file="$4"

  require_codex

  local exec_prompt_file
  local tmp_result_file
  local raw_output_file
  local model
  local reasoning_effort

  exec_prompt_file="$(mktemp)"
  tmp_result_file="$(mktemp)"
  raw_output_file="${result_file%.json}.raw.txt"
  model="${CODEX_MODEL:-}"
  reasoning_effort="${CODEX_REASONING_EFFORT:-high}"

  build_codex_exec_prompt "$request_file" "$stage_name" > "$exec_prompt_file"

  echo "Running live Codex execution for $(relative_to_root "$request_file")"

  local -a cmd=(
    codex
    -c "model_reasoning_effort=\"${reasoning_effort}\""
    -c "mcp_servers={}"
    exec
    -
    --skip-git-repo-check
    -C "$REPO_ROOT"
    -s read-only
    --color never
    --output-last-message "$tmp_result_file"
  )

  if [ -n "$model" ]; then
    cmd+=(-m "$model")
  fi

  if ! "${cmd[@]}" < "$exec_prompt_file"; then
    rm -f "$exec_prompt_file" "$tmp_result_file"
    echo "Error: codex exec failed for stage '$stage_name'." >&2
    exit 1
  fi

  rm -f "$exec_prompt_file"

  if ! jq empty "$tmp_result_file" >/dev/null 2>&1; then
    mv "$tmp_result_file" "$raw_output_file"
    echo "Error: Codex returned non-JSON output for stage '$stage_name'." >&2
    echo "Saved raw output to $(relative_to_root "$raw_output_file")" >&2
    exit 1
  fi

  validate_stage_result "$stage_type" "$tmp_result_file"
  mv "$tmp_result_file" "$result_file"
  rm -f "$raw_output_file"

  echo "Created $(relative_to_root "$result_file")"
}

write_case_summary() {
  local input_file="${1:-$OUTPUTS_DIR/input.json}"
  local summary_file
  local planner_file
  local scenario_a_file
  local scenario_b_file
  local risk_a_file
  local risk_b_file
  local advisor_file
  local case_id

  if [ ! -f "$input_file" ]; then
    echo "Error: summary input file not found: $input_file" >&2
    exit 1
  fi

  summary_file="$(summary_path)"
  planner_file="$(resolve_stage_result_file "planner")"
  scenario_a_file="$(resolve_stage_result_file "scenario-a")"
  scenario_b_file="$(resolve_stage_result_file "scenario-b")"
  risk_a_file="$(resolve_stage_result_file "risk-a")"
  risk_b_file="$(resolve_stage_result_file "risk-b")"
  advisor_file="$(resolve_stage_result_file "advisor")"
  case_id="$(case_id_from_output_dir "$OUTPUTS_DIR")"

  {
    printf '# %s\n\n' "$case_id"
    printf -- '- Case ID: `%s`\n' "$case_id"
    printf -- '- Input snapshot: `%s`\n' "$(relative_to_root "$input_file")"
    printf -- '- Output directory: `%s`\n' "$(relative_to_root "$OUTPUTS_DIR")"

    printf '\n## Input Summary\n\n'
    printf -- '- Profile: age %s, job %s, risk tolerance %s\n' \
      "$(jq -r '.userProfile.age' "$input_file")" \
      "$(jq -r '.userProfile.job' "$input_file")" \
      "$(jq -r '.userProfile.risk_tolerance' "$input_file")"
    printf -- '- Priority: %s\n' "$(jq -r '.userProfile.priority | join(", ")' "$input_file")"
    printf -- '- Option A: %s\n' "$(jq -r '.decision.optionA' "$input_file")"
    printf -- '- Option B: %s\n' "$(jq -r '.decision.optionB' "$input_file")"
    printf -- '- Context: %s\n' "$(jq -r '.decision.context' "$input_file" | normalize_inline_text)"

    printf '\n## Planner\n\n'
    printf -- '- Decision type: %s\n' "$(jq -r '.decision_type' "$planner_file")"
    printf -- '- Factors: %s\n' "$(jq -r '.factors | join(", ")' "$planner_file")"

    printf '\n## Scenario A\n\n'
    printf -- '- 3 months: %s\n' "$(jq -r '.three_months' "$scenario_a_file" | normalize_inline_text)"
    printf -- '- 1 year: %s\n' "$(jq -r '.one_year' "$scenario_a_file" | normalize_inline_text)"
    printf -- '- 3 years: %s\n' "$(jq -r '.three_years' "$scenario_a_file" | normalize_inline_text)"

    printf '\n## Scenario B\n\n'
    printf -- '- 3 months: %s\n' "$(jq -r '.three_months' "$scenario_b_file" | normalize_inline_text)"
    printf -- '- 1 year: %s\n' "$(jq -r '.one_year' "$scenario_b_file" | normalize_inline_text)"
    printf -- '- 3 years: %s\n' "$(jq -r '.three_years' "$scenario_b_file" | normalize_inline_text)"

    printf '\n## Risk A\n\n'
    printf -- '- Level: %s\n' "$(jq -r '.risk_level' "$risk_a_file")"
    while IFS= read -r reason; do
      printf -- '- %s\n' "$reason"
    done < <(jq -r '.reasons[]' "$risk_a_file")

    printf '\n## Risk B\n\n'
    printf -- '- Level: %s\n' "$(jq -r '.risk_level' "$risk_b_file")"
    while IFS= read -r reason; do
      printf -- '- %s\n' "$reason"
    done < <(jq -r '.reasons[]' "$risk_b_file")

    printf '\n## Advisor\n\n'
    printf -- '- Recommended option: %s\n' "$(jq -r '.recommended_option' "$advisor_file")"
    printf -- '- Reason: %s\n' "$(jq -r '.reason' "$advisor_file" | normalize_inline_text)"
  } > "$summary_file"

  echo "Created $(relative_to_root "$summary_file")"
}
