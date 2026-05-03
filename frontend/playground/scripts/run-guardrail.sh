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
ROUTING_RESULT_FILE=""
ROUTING_RESULT_COMPACT='null'
ROUTING_RESULT_REL=""
EXECUTION_MODE=""
SELECTED_PATH_JSON=""

if ROUTING_RESULT_FILE="$(optional_stage_result_file "routing" 2>/dev/null)"; then
  ROUTING_RESULT_COMPACT="$(jq -c '.routing' "$ROUTING_RESULT_FILE")"
  ROUTING_RESULT_REL="$(relative_to_root "$ROUTING_RESULT_FILE")"
  EXECUTION_MODE="$(jq -r '.routing.execution_mode' "$ROUTING_RESULT_FILE")"
  SELECTED_PATH_JSON="$(jq -c '.routing.selected_path' "$ROUTING_RESULT_FILE")"
else
  EXECUTION_MODE="$(infer_execution_mode_from_artifacts)"
  SELECTED_PATH_JSON="$(selected_path_json_for_mode "$EXECUTION_MODE")"
fi

REQUEST_FILE="$(stage_request_path "guardrail")"
PREVIEW_FILE="$(stage_preview_path "guardrail")"
STUB_FILE="$(stage_stub_path "guardrail")"
RESULT_FILE="$(stage_result_path "guardrail")"
PROMPT_FILE="$REPO_ROOT/src/server/guardrail/service.ts"
PROMPT_TEXT="Deterministic guardrail evaluation aligned to the web guardrail service."
SCHEMA_JSON="$(schema_for_stage "guardrail")"

if [ "$EXECUTION_MODE" = "full" ]; then
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

  PREVIOUS_STAGE_RESULT_FILES_JSON="$(jq -cn \
    --arg state_context_rel "$(relative_to_root "$STATE_CONTEXT_FILE")" \
    --arg routing_rel "$ROUTING_RESULT_REL" \
    --arg planner_rel "$(relative_to_root "$PLANNER_RESULT_FILE")" \
    --arg scenario_a_rel "$(relative_to_root "$SCENARIO_A_RESULT_FILE")" \
    --arg scenario_b_rel "$(relative_to_root "$SCENARIO_B_RESULT_FILE")" \
    --arg risk_a_rel "$(relative_to_root "$RISK_A_RESULT_FILE")" \
    --arg risk_b_rel "$(relative_to_root "$RISK_B_RESULT_FILE")" \
    --arg reasoning_rel "$(relative_to_root "$REASONING_RESULT_FILE")" \
    '[
      $state_context_rel,
      $routing_rel,
      $planner_rel,
      $scenario_a_rel,
      $scenario_b_rel,
      $risk_a_rel,
      $risk_b_rel,
      $reasoning_rel
    ] | map(select(length > 0))')"

  INPUT_DATA_COMPACT="$(jq -cn \
    --arg case_id "$CASE_ID" \
    --arg execution_mode "$EXECUTION_MODE" \
    --argjson selected_path "$SELECTED_PATH_JSON" \
    --argjson base_input "$BASE_INPUT_COMPACT" \
    --argjson state_context "$STATE_CONTEXT_COMPACT" \
    --argjson planner_result "$PLANNER_RESULT_COMPACT" \
    --argjson routing_result "$ROUTING_RESULT_COMPACT" \
    --argjson scenario_a "$SCENARIO_A_RESULT_COMPACT" \
    --argjson scenario_b "$SCENARIO_B_RESULT_COMPACT" \
    --argjson risk_a "$RISK_A_RESULT_COMPACT" \
    --argjson risk_b "$RISK_B_RESULT_COMPACT" \
    --argjson ab_reasoning "$REASONING_RESULT_COMPACT" \
    '{
      caseId: $case_id,
      executionMode: $execution_mode,
      caseInput: $base_input,
      stateContext: $state_context,
      routing: (
        if $routing_result != null then
          $routing_result
        else
          {
            execution_mode: $execution_mode,
            selected_path: $selected_path
          }
        end
      ),
      plannerResult: $planner_result,
      scenarioA: $scenario_a,
      scenarioB: $scenario_b,
      riskA: $risk_a,
      riskB: $risk_b,
      abReasoning: $ab_reasoning
    }')"
  PROVIDER_RUNNER="evaluateSimulationGuardrail"

  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
    "$REPO_ROOT/scripts/resolve_playground_guardrail.ts" \
    full \
    "$INPUT_FILE" \
    "$STATE_CONTEXT_FILE" \
    "$RISK_A_RESULT_FILE" \
    "$RISK_B_RESULT_FILE" \
    "$REASONING_RESULT_FILE" > "$STUB_FILE"
else
  ADVISOR_RESULT_FILE="$(resolve_stage_result_file "advisor")"
  ADVISOR_RESULT_COMPACT="$(read_json_compact "$ADVISOR_RESULT_FILE")"
  RISK_A_RESULT_FILE=""
  RISK_B_RESULT_FILE=""
  RISK_A_RESULT_COMPACT='null'
  RISK_B_RESULT_COMPACT='null'
  RISK_A_RESULT_REL=""
  RISK_B_RESULT_REL=""

  if stage_enabled_in_selected_path "$SELECTED_PATH_JSON" "risk"; then
    RISK_A_RESULT_FILE="$(resolve_stage_result_file "risk-a")"
    RISK_B_RESULT_FILE="$(resolve_stage_result_file "risk-b")"
    RISK_A_RESULT_COMPACT="$(read_json_compact "$RISK_A_RESULT_FILE")"
    RISK_B_RESULT_COMPACT="$(read_json_compact "$RISK_B_RESULT_FILE")"
    RISK_A_RESULT_REL="$(relative_to_root "$RISK_A_RESULT_FILE")"
    RISK_B_RESULT_REL="$(relative_to_root "$RISK_B_RESULT_FILE")"
  fi

  PREVIOUS_STAGE_RESULT_FILES_JSON="$(jq -cn \
    --arg state_context_rel "$(relative_to_root "$STATE_CONTEXT_FILE")" \
    --arg routing_rel "$ROUTING_RESULT_REL" \
    --arg advisor_rel "$(relative_to_root "$ADVISOR_RESULT_FILE")" \
    --arg risk_a_rel "$RISK_A_RESULT_REL" \
    --arg risk_b_rel "$RISK_B_RESULT_REL" \
    '[
      $state_context_rel,
      $routing_rel,
      $advisor_rel,
      $risk_a_rel,
      $risk_b_rel
    ] | map(select(length > 0))')"

  INPUT_DATA_COMPACT="$(jq -cn \
    --arg case_id "$CASE_ID" \
    --arg execution_mode "$EXECUTION_MODE" \
    --argjson selected_path "$SELECTED_PATH_JSON" \
    --argjson base_input "$BASE_INPUT_COMPACT" \
    --argjson state_context "$STATE_CONTEXT_COMPACT" \
    --argjson routing_result "$ROUTING_RESULT_COMPACT" \
    --argjson advisor_result "$ADVISOR_RESULT_COMPACT" \
    --argjson risk_a "$RISK_A_RESULT_COMPACT" \
    --argjson risk_b "$RISK_B_RESULT_COMPACT" \
    '{
      caseId: $case_id,
      executionMode: $execution_mode,
      caseInput: $base_input,
      stateContext: $state_context,
      routing: (
        if $routing_result != null then
          $routing_result
        else
          {
            execution_mode: $execution_mode,
            selected_path: $selected_path
          }
        end
      ),
      advisorResult: $advisor_result
    }
    + (if $risk_a != null then {riskA: $risk_a} else {} end)
    + (if $risk_b != null then {riskB: $risk_b} else {} end)')"
  PROVIDER_RUNNER="deriveSelectiveGuardrailEvaluation"

  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types \
    "$REPO_ROOT/scripts/resolve_playground_guardrail.ts" \
    selective \
    "$INPUT_FILE" \
    "$STATE_CONTEXT_FILE" \
    "$ADVISOR_RESULT_FILE" \
    "${RISK_A_RESULT_FILE:--}" \
    "${RISK_B_RESULT_FILE:--}" > "$STUB_FILE"
fi

INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

jq -n \
  --arg stage "guardrail" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared deterministic guardrail evaluation payload aligned to the web runtime." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "$PREVIOUS_STAGE_RESULT_FILES_JSON" \
  --arg provider_runner "$PROVIDER_RUNNER" \
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
      runner: $provider_runner,
      call_status: "complete",
      output_file: $output_file,
      model: "deterministic",
      stage_plan_key: "guardrail",
      model_plan_source: "web_guardrail_logic"
    }
  }' > "$REQUEST_FILE"

validate_stage_result "guardrail" "$STUB_FILE"
cp "$STUB_FILE" "$RESULT_FILE"
write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Guardrail Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"
echo "Created $(relative_to_root "$RESULT_FILE") from deterministic guardrail evaluation"
