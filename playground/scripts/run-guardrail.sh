#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
BASE_INPUT_COMPACT="$(read_json_compact "$INPUT_FILE")"
STATE_CONTEXT_FILE="$(state_context_path)"
STATE_CONTEXT_COMPACT="$(read_json_compact "$STATE_CONTEXT_FILE")"
PLANNER_RESULT_FILE="$(resolve_stage_result_file "planner")"
SCENARIO_A_RESULT_FILE="$(resolve_stage_result_file "scenario-a")"
SCENARIO_B_RESULT_FILE="$(resolve_stage_result_file "scenario-b")"
RISK_A_RESULT_FILE="$(resolve_stage_result_file "risk-a")"
RISK_B_RESULT_FILE="$(resolve_stage_result_file "risk-b")"
REASONING_RESULT_FILE="$(resolve_stage_result_file "reasoning")"

PLANNER_RESULT_COMPACT="$(read_json_compact "$PLANNER_RESULT_FILE")"
SCENARIO_A_RESULT_COMPACT="$(read_json_compact "$SCENARIO_A_RESULT_FILE")"
SCENARIO_B_RESULT_COMPACT="$(read_json_compact "$SCENARIO_B_RESULT_FILE")"
RISK_A_RESULT_COMPACT="$(read_json_compact "$RISK_A_RESULT_FILE")"
RISK_B_RESULT_COMPACT="$(read_json_compact "$RISK_B_RESULT_FILE")"
REASONING_RESULT_COMPACT="$(read_json_compact "$REASONING_RESULT_FILE")"

PROMPT_FILE="$(prompt_path "guardrail")"
PROMPT_TEXT="$(read_prompt "guardrail")"
SCHEMA_JSON="$(schema_for_stage "guardrail")"
REQUEST_FILE="$(stage_request_path "guardrail")"
PREVIEW_FILE="$(stage_preview_path "guardrail")"
STUB_FILE="$(stage_stub_path "guardrail")"
RESULT_FILE="$(stage_result_path "guardrail")"

INPUT_DATA_COMPACT="$(jq -cn \
  --arg case_id "$CASE_ID" \
  --argjson base_input "$BASE_INPUT_COMPACT" \
  --argjson state_context "$STATE_CONTEXT_COMPACT" \
  --argjson planner_result "$PLANNER_RESULT_COMPACT" \
  --argjson scenario_a "$SCENARIO_A_RESULT_COMPACT" \
  --argjson scenario_b "$SCENARIO_B_RESULT_COMPACT" \
  --argjson risk_a "$RISK_A_RESULT_COMPACT" \
  --argjson risk_b "$RISK_B_RESULT_COMPACT" \
  --argjson ab_reasoning "$REASONING_RESULT_COMPACT" \
  '{
    caseId: $case_id,
    caseInput: $base_input,
    stateContext: $state_context,
    plannerResult: $planner_result,
    scenarioA: $scenario_a,
    scenarioB: $scenario_b,
    riskA: $risk_a,
    riskB: $risk_b,
    abReasoning: $ab_reasoning
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

jq -n \
  --arg stage "guardrail" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "[\"$(relative_to_root "$STATE_CONTEXT_FILE")\", \"$(relative_to_root "$PLANNER_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_A_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_B_RESULT_FILE")\", \"$(relative_to_root "$RISK_A_RESULT_FILE")\", \"$(relative_to_root "$RISK_B_RESULT_FILE")\", \"$(relative_to_root "$REASONING_RESULT_FILE")\"]" \
  '{
    stage: $stage,
    generated_at: $generated_at,
    description: $description,
    prompt_file: $prompt_file,
    input_source: $input_source,
    previous_stage_result_files: $previous_stage_result_files,
    prompt_text: $prompt_text,
    expected_output_schema: $expected_output_schema,
    input_data: $input_data,
    input_json: $input_json,
    provider_payload: {
      runner: "codex exec",
      call_status: "ready",
      output_file: $output_file
    }
  }' > "$REQUEST_FILE"

node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
  "$REPO_ROOT/scripts/compute_guardrail_result.ts" \
  "$STATE_CONTEXT_FILE" \
  "$RISK_A_RESULT_FILE" \
  "$RISK_B_RESULT_FILE" \
  "$REASONING_RESULT_FILE" \
  baseline > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Guardrail Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from guardrail stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "guardrail" "guardrail" "$REQUEST_FILE" "$RESULT_FILE"
fi
