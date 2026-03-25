#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

BASE_INPUT_COMPACT="$(read_json_compact "$INPUT_FILE")"
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

PROMPT_FILE="$(prompt_path "advisor")"
PROMPT_TEXT="$(read_prompt "advisor")"
SCHEMA_JSON="$(schema_for_stage "advisor")"
REQUEST_FILE="$(stage_request_path "advisor")"
PREVIEW_FILE="$(stage_preview_path "advisor")"
STUB_FILE="$(stage_stub_path "advisor")"
RESULT_FILE="$(stage_result_path "advisor")"

INPUT_DATA_COMPACT="$(jq -cn \
  --argjson base_input "$BASE_INPUT_COMPACT" \
  --argjson planner_result "$PLANNER_RESULT_COMPACT" \
  --argjson scenario_a "$SCENARIO_A_RESULT_COMPACT" \
  --argjson scenario_b "$SCENARIO_B_RESULT_COMPACT" \
  --argjson risk_a "$RISK_A_RESULT_COMPACT" \
  --argjson risk_b "$RISK_B_RESULT_COMPACT" \
  --argjson ab_reasoning "$REASONING_RESULT_COMPACT" \
  '{
    userProfile: $base_input.userProfile,
    decision: $base_input.decision,
    plannerResult: $planner_result,
    scenarioA: $scenario_a,
    scenarioB: $scenario_b,
    riskA: $risk_a,
    riskB: $risk_b,
    abReasoning: $ab_reasoning
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"
RISK_A_LEVEL="$(jq -r '.risk_level' "$RISK_A_RESULT_FILE")"
RISK_B_LEVEL="$(jq -r '.risk_level' "$RISK_B_RESULT_FILE")"
RISK_TOLERANCE="$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")"
PRIMARY_PRIORITY="$(jq -r '.userProfile.priority[0] // "priority_alignment"' "$INPUT_FILE")"
SELECTED_REASONING="$(jq -r '.reasoning.final_selection.selected_reasoning' "$REASONING_RESULT_FILE")"
STUB_RECOMMENDED_OPTION="$(jq -r '.reasoning.final_selection.selected_option' "$REASONING_RESULT_FILE")"
DECISION_CONFIDENCE="$(jq '.reasoning.final_selection.decision_confidence' "$REASONING_RESULT_FILE")"
CORE_WHY="$(jq -r '.reasoning.final_selection.why_selected' "$REASONING_RESULT_FILE")"

jq -n \
  --arg stage "advisor" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "[\"$(relative_to_root "$PLANNER_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_A_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_B_RESULT_FILE")\", \"$(relative_to_root "$RISK_A_RESULT_FILE")\", \"$(relative_to_root "$RISK_B_RESULT_FILE")\", \"$(relative_to_root "$REASONING_RESULT_FILE")\"]" \
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
  --arg recommended_option "$STUB_RECOMMENDED_OPTION" \
  --arg selected_reasoning "$SELECTED_REASONING" \
  --arg core_why "$CORE_WHY" \
  --arg risk_tolerance "$RISK_TOLERANCE" \
  --arg primary_priority "$PRIMARY_PRIORITY" \
  --arg risk_a_level "$RISK_A_LEVEL" \
  --arg risk_b_level "$RISK_B_LEVEL" \
  --argjson decision_confidence "$DECISION_CONFIDENCE" \
  '{
    recommended_option: $recommended_option,
    reason: ("사용자의 risk_tolerance가 \($risk_tolerance)이고 최우선 기준이 \($primary_priority)이므로, reasoning의 최종 선택을 기본값으로 채택한다. riskA=\($risk_a_level), riskB=\($risk_b_level)이며, 불확실성이 높아질수록 조건부 재검토가 필요하지만 현재 stub에서는 \($recommended_option)를 추천한다."),
    reasoning_basis: {
      selected_reasoning: $selected_reasoning,
      core_why: $core_why,
      decision_confidence: $decision_confidence
    }
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Advisor Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from advisor stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "advisor" "advisor" "$REQUEST_FILE" "$RESULT_FILE"
fi
