#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

REQUEST_FILE="$(stage_request_path "planner")"
PREVIEW_FILE="$(stage_preview_path "planner")"
STUB_FILE="$(stage_stub_path "planner")"
RESULT_FILE="$(stage_result_path "planner")"
PROMPT_FILE="$(prompt_path "planner")"
PROMPT_TEXT="$(read_prompt "planner")"
SCHEMA_JSON="$(schema_for_stage "planner")"
INPUT_DATA_COMPACT="$(read_json_compact "$INPUT_FILE")"
INPUT_JSON="$(read_json_pretty "$INPUT_FILE")"

jq -n \
  --arg stage "planner" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files '[]' \
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

jq -n \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  '{
    decision_type: "pending_model_inference",
    factors: (
      ($input_data.userProfile.priority // [])
      | map(tostring)
      | if length > 0 then .[:6] else ["stability", "income", "work_life_balance"] end
    )
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Planner Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  echo "Skipped live execution because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "planner" "planner" "$REQUEST_FILE" "$RESULT_FILE"
fi
