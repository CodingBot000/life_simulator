#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

print_usage() {
  echo "Usage: ./playground/scripts/run-risk.sh [A|B|all] [input-file] [output-dir]" >&2
  exit 1
}

resolve_target() {
  case "${1:-all}" in
    A|a)
      printf 'A\n'
      ;;
    B|b)
      printf 'B\n'
      ;;
    all|"")
      printf 'all\n'
      ;;
    *)
      print_usage
      ;;
  esac
}

infer_risk_level() {
  local option_label="$1"
  local selected_option="$2"
  local risk_tolerance="$3"

  case "$risk_tolerance:$option_label:$selected_option" in
    low:B:*스타트업*|low:B:*이직*|low:B:*창업*|low:B:*startup*|low:B:*Startup*)
      printf 'high\n'
      ;;
    low:A:*)
      printf 'low\n'
      ;;
    medium:B:*스타트업*|medium:B:*이직*|medium:B:*창업*|medium:B:*startup*|medium:B:*Startup*)
      printf 'medium\n'
      ;;
    high:B:*)
      printf 'medium\n'
      ;;
    *)
      printf 'medium\n'
      ;;
  esac
}

require_jq

TARGET="$(resolve_target "${1:-all}")"
INPUT_FILE="$(resolve_input_file "${2:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${3:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
BASE_INPUT_COMPACT="$(read_json_compact "$INPUT_FILE")"
STATE_CONTEXT_FILE="$(state_context_path)"
STATE_CONTEXT_COMPACT="$(read_json_compact "$STATE_CONTEXT_FILE")"
STATE_CONTEXT_REL="$(relative_to_root "$STATE_CONTEXT_FILE")"
PLANNER_RESULT_FILE="$(resolve_stage_result_file "planner")"
PLANNER_RESULT_COMPACT="$(read_json_compact "$PLANNER_RESULT_FILE")"
PLANNER_RESULT_REL="$(relative_to_root "$PLANNER_RESULT_FILE")"
PROMPT_FILE="$(prompt_path "risk")"
PROMPT_TEXT="$(read_prompt "risk")"
SCHEMA_JSON="$(schema_for_stage "risk")"

for OPTION_LABEL in A B; do
  if [ "$TARGET" != "all" ] && [ "$TARGET" != "$OPTION_LABEL" ]; then
    continue
  fi

  if [ "$OPTION_LABEL" = "A" ]; then
    STAGE_NAME="risk-a"
    SCENARIO_STAGE="scenario-a"
    SELECTED_OPTION="$(jq -r '.decision.optionA' "$INPUT_FILE")"
  else
    STAGE_NAME="risk-b"
    SCENARIO_STAGE="scenario-b"
    SELECTED_OPTION="$(jq -r '.decision.optionB' "$INPUT_FILE")"
  fi

  SCENARIO_RESULT_FILE="$(resolve_stage_result_file "$SCENARIO_STAGE")"
  SCENARIO_RESULT_COMPACT="$(read_json_compact "$SCENARIO_RESULT_FILE")"
  SCENARIO_RESULT_REL="$(relative_to_root "$SCENARIO_RESULT_FILE")"
  RISK_TOLERANCE="$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")"
  PRIMARY_PRIORITY="$(jq -r '.userProfile.priority[0] // "priority_alignment"' "$INPUT_FILE")"
  RISK_LEVEL="$(infer_risk_level "$OPTION_LABEL" "$SELECTED_OPTION" "$RISK_TOLERANCE")"

  INPUT_DATA_COMPACT="$(jq -cn \
    --arg case_id "$CASE_ID" \
    --argjson base_input "$BASE_INPUT_COMPACT" \
    --argjson state_context "$STATE_CONTEXT_COMPACT" \
    --argjson planner_result "$PLANNER_RESULT_COMPACT" \
    --argjson scenario_result "$SCENARIO_RESULT_COMPACT" \
    --arg option_label "$OPTION_LABEL" \
    --arg selected_option "$SELECTED_OPTION" \
    '{
      caseId: $case_id,
      caseInput: $base_input,
      stateContext: $state_context,
      optionLabel: $option_label,
      selectedOption: $selected_option,
      decisionContext: $base_input.decision.context,
      factors: ($planner_result.factors // []),
      plannerResult: $planner_result,
      scenario: $scenario_result
    }')"
  INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"
  REQUEST_FILE="$(stage_request_path "$STAGE_NAME")"
  PREVIEW_FILE="$(stage_preview_path "$STAGE_NAME")"
  STUB_FILE="$(stage_stub_path "$STAGE_NAME")"
  RESULT_FILE="$(stage_result_path "$STAGE_NAME")"

  jq -n \
    --arg stage "risk" \
    --arg generated_at "$(timestamp_utc)" \
    --arg description "Prepared request payload for Codex CLI live execution." \
    --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
    --arg input_source "$(relative_to_root "$INPUT_FILE")" \
    --arg prompt_text "$PROMPT_TEXT" \
    --arg input_json "$INPUT_JSON" \
    --argjson input_data "$INPUT_DATA_COMPACT" \
    --argjson expected_output_schema "$SCHEMA_JSON" \
    --argjson previous_stage_result_files "[\"$STATE_CONTEXT_REL\", \"$PLANNER_RESULT_REL\", \"$SCENARIO_RESULT_REL\"]" \
    --argjson provider_payload "$(live_provider_payload_json "$STAGE_NAME" "$RESULT_FILE" "$INPUT_FILE")" \
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
      provider_payload: $provider_payload
    }' > "$REQUEST_FILE"

  jq -n \
    --arg risk_level "$RISK_LEVEL" \
    --arg selected_option "$SELECTED_OPTION" \
    --arg risk_tolerance "$RISK_TOLERANCE" \
    --arg primary_priority "$PRIMARY_PRIORITY" \
    --arg scenario_hint "$(jq -r '.three_months' "$SCENARIO_RESULT_FILE")" \
    '{
      risk_level: $risk_level,
      reasons: [
        ("초기 시나리오에서 드러난 변화 비용을 고려하면 \($selected_option) 선택에는 현실적인 불확실성이 있다."),
        ("사용자의 risk_tolerance가 \($risk_tolerance)이므로 같은 사건도 체감 위험은 더 크게 또는 더 작게 느껴질 수 있다."),
        ("우선순위인 \($primary_priority) 관점에서 손실 가능성과 회복 비용을 함께 확인해야 한다."),
        ("현재 결과는 실제 모델 판단이 아니라 파이프라인 연결 점검을 위한 stub이며, 참고 시나리오는: \($scenario_hint)")
      ]
    }' > "$STUB_FILE"

  write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Risk ${OPTION_LABEL} Request Preview"

  echo "Created $(relative_to_root "$REQUEST_FILE")"
  echo "Created $(relative_to_root "$PREVIEW_FILE")"
  echo "Created $(relative_to_root "$STUB_FILE")"

  if compose_only_enabled; then
    echo "Skipped live execution for $STAGE_NAME because CODEX_COMPOSE_ONLY=1"
  else
    run_codex_for_request "risk" "$STAGE_NAME" "$REQUEST_FILE" "$RESULT_FILE"
  fi
done
