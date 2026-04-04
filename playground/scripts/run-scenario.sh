#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

print_usage() {
  echo "Usage: ./playground/scripts/run-scenario.sh [A|B|all] [input-file] [output-dir]" >&2
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
PROMPT_FILE="$(prompt_path "scenario")"
PROMPT_TEXT="$(read_prompt "scenario")"
SCHEMA_JSON="$(schema_for_stage "scenario")"

for OPTION_LABEL in A B; do
  if [ "$TARGET" != "all" ] && [ "$TARGET" != "$OPTION_LABEL" ]; then
    continue
  fi

  if [ "$OPTION_LABEL" = "A" ]; then
    STAGE_NAME="scenario-a"
    SELECTED_OPTION="$(jq -r '.decision.optionA' "$INPUT_FILE")"
  else
    STAGE_NAME="scenario-b"
    SELECTED_OPTION="$(jq -r '.decision.optionB' "$INPUT_FILE")"
  fi

  INPUT_DATA_COMPACT="$(jq -cn \
    --arg case_id "$CASE_ID" \
    --argjson base_input "$BASE_INPUT_COMPACT" \
    --argjson state_context "$STATE_CONTEXT_COMPACT" \
    --argjson planner_result "$PLANNER_RESULT_COMPACT" \
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
      plannerResult: $planner_result
    }')"
  INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"
  REQUEST_FILE="$(stage_request_path "$STAGE_NAME")"
  PREVIEW_FILE="$(stage_preview_path "$STAGE_NAME")"
  STUB_FILE="$(stage_stub_path "$STAGE_NAME")"
  RESULT_FILE="$(stage_result_path "$STAGE_NAME")"

  jq -n \
    --arg stage "scenario" \
    --arg generated_at "$(timestamp_utc)" \
    --arg description "Prepared request payload for Codex CLI live execution." \
    --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
    --arg input_source "$(relative_to_root "$INPUT_FILE")" \
    --arg prompt_text "$PROMPT_TEXT" \
    --arg input_json "$INPUT_JSON" \
    --argjson input_data "$INPUT_DATA_COMPACT" \
    --argjson expected_output_schema "$SCHEMA_JSON" \
    --argjson previous_stage_result_files "[\"$STATE_CONTEXT_REL\", \"$PLANNER_RESULT_REL\"]" \
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
    --arg option_label "$OPTION_LABEL" \
    --arg selected_option "$SELECTED_OPTION" \
    --arg decision_context "$(jq -r '.decision.context' "$INPUT_FILE")" \
    --arg risk_tolerance "$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")" \
    '{
      three_months: ("\($option_label)안(\($selected_option))을 선택한 뒤 초반 적응이 진행된다. 감정은 신중하지만 방향은 점차 또렷해진다. 맥락은 \($decision_context)이며, 이 문장은 모델 호출 전 체인 검증용 stub이다."),
      one_year: ("1년 시점에는 선택의 장단점이 더 선명해진다. 사용자의 risk_tolerance는 \($risk_tolerance)이며, 그에 따라 만족감과 부담이 함께 드러나는 현실적인 중간 결과를 가정한 stub이다."),
      three_years: ("3년 시점에는 누적된 경험이 경력과 생활 리듬에 반영된다. 다만 이 결과는 실제 판단이 아니라 request composition 파이프라인 점검을 위한 임시 시나리오다.")
    }' > "$STUB_FILE"

  write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Scenario ${OPTION_LABEL} Request Preview"

  echo "Created $(relative_to_root "$REQUEST_FILE")"
  echo "Created $(relative_to_root "$PREVIEW_FILE")"
  echo "Created $(relative_to_root "$STUB_FILE")"

  if compose_only_enabled; then
    echo "Skipped live execution for $STAGE_NAME because CODEX_COMPOSE_ONLY=1"
  else
    run_codex_for_request "scenario" "$STAGE_NAME" "$REQUEST_FILE" "$RESULT_FILE"
  fi
done
