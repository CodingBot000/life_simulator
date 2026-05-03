#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

contains_keyword() {
  local haystack="$1"
  shift

  local keyword
  for keyword in "$@"; do
    if [[ "$haystack" == *"$keyword"* ]]; then
      return 0
    fi
  done

  return 1
}

join_with_delimiter() {
  local delimiter="$1"
  shift

  local item
  local joined=""

  for item in "$@"; do
    if [ -z "$joined" ]; then
      joined="$item"
    else
      joined="${joined}${delimiter}${item}"
    fi
  done

  printf '%s\n' "$joined"
}

infer_decision_style() {
  local explicit_value="$1"
  local risk_preference="$2"
  local text="$3"

  if [ -n "$explicit_value" ]; then
    printf '%s\n' "$explicit_value"
    return 0
  fi

  if contains_keyword "$text" "고민" "확신" "신중" "걱정" "불안" "부담"; then
    printf 'deliberate\n'
  elif [ "$risk_preference" = "high" ] || contains_keyword "$text" "자신감" "도전" "독립" "확장"; then
    printf 'exploratory\n'
  elif [ "$risk_preference" = "low" ]; then
    printf 'deliberate\n'
  elif [ "$risk_preference" = "medium" ]; then
    printf 'balanced\n'
  else
    printf 'unknown\n'
  fi
}

infer_career_stage() {
  local explicit_value="$1"
  local age="$2"

  if [ -n "$explicit_value" ]; then
    printf '%s\n' "$explicit_value"
    return 0
  fi

  if [ "$age" -lt 30 ]; then
    printf 'early\n'
  elif [ "$age" -lt 40 ]; then
    printf 'mid\n'
  else
    printf 'senior\n'
  fi
}

infer_financial_pressure() {
  local explicit_value="$1"
  local text="$2"

  if [ -n "$explicit_value" ]; then
    printf '%s\n' "$explicit_value"
    return 0
  fi

  if contains_keyword "$text" "대출" "상환" "생활비" "학비" "고정 수입" "수입이 끊" "돈" "부채"; then
    printf 'high\n'
  elif contains_keyword "$text" "연봉" "수입" "income" "보상" "안정감"; then
    printf 'medium\n'
  else
    printf 'unknown\n'
  fi
}

infer_time_pressure() {
  local explicit_value="$1"
  local text="$2"

  if [ -n "$explicit_value" ]; then
    printf '%s\n' "$explicit_value"
    return 0
  fi

  if contains_keyword "$text" "번아웃" "수면" "집중력" "바쁜" "퇴근 후" "장거리"; then
    printf 'high\n'
  elif contains_keyword "$text" "동시에" "병행" "반복" "몇 번" "계속"; then
    printf 'medium\n'
  else
    printf 'unknown\n'
  fi
}

infer_emotional_state() {
  local explicit_value="$1"
  local text="$2"

  if [ -n "$explicit_value" ]; then
    printf '%s\n' "$explicit_value"
    return 0
  fi

  if contains_keyword "$text" "번아웃" "수면" "집중력" "지쳤" "피로"; then
    printf 'strained\n'
  elif contains_keyword "$text" "고민" "불안" "확신이 서지" "부담" "갈등" "uncertain"; then
    printf 'uncertain\n'
  elif contains_keyword "$text" "자신감" "기대" "끌리" "원하"; then
    printf 'cautiously_optimistic\n'
  else
    printf 'unknown\n'
  fi
}

build_decision_bias() {
  local risk_preference="$1"
  local first_pattern="$2"

  local base_bias
  case "$risk_preference" in
    low)
      base_bias="leans conservative under uncertainty"
      ;;
    medium)
      base_bias="balances stability and upside"
      ;;
    high)
      base_bias="accepts volatility for upside"
      ;;
    *)
      base_bias="unknown"
      ;;
  esac

  if [ -n "$first_pattern" ]; then
    printf '%s; memory pattern: %s\n' "$base_bias" "$first_pattern"
  else
    printf '%s\n' "$base_bias"
  fi
}

build_current_constraint() {
  local financial_pressure="$1"
  local time_pressure="$2"
  local emotional_state="$3"

  local -a constraints=()

  if [ "$financial_pressure" != "unknown" ] && [ "$financial_pressure" != "low" ] && [ "$financial_pressure" != "none" ]; then
    constraints+=("financial pressure is ${financial_pressure}")
  fi

  if [ "$time_pressure" != "unknown" ] && [ "$time_pressure" != "low" ] && [ "$time_pressure" != "none" ]; then
    constraints+=("time pressure is ${time_pressure}")
  fi

  if [ "$emotional_state" != "unknown" ] && [ "$emotional_state" != "none" ]; then
    constraints+=("emotional state is ${emotional_state}")
  fi

  if [ "${#constraints[@]}" -eq 0 ]; then
    printf 'none\n'
  else
    join_with_delimiter "; " "${constraints[@]}"
  fi
}

build_agent_guidance() {
  local priorities_summary="$1"
  local current_constraint="$2"
  local first_consistency_note="$3"

  if [ -n "$first_consistency_note" ]; then
    printf '%s\n' "$first_consistency_note"
    return 0
  fi

  if [ "$priorities_summary" != "none" ] && [ "$current_constraint" != "none" ]; then
    printf 'explain tradeoffs around %s while respecting %s\n' "$priorities_summary" "$current_constraint"
  elif [ "$priorities_summary" != "none" ]; then
    printf 'tie the recommendation directly to %s and make the tradeoff explicit\n' "$priorities_summary"
  else
    printf 'make tradeoffs explicit and stay within the known user constraints\n'
  fi
}

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
REQUEST_FILE="$(stage_request_path "state-loader")"
PREVIEW_FILE="$(stage_preview_path "state-loader")"
STUB_FILE="$(state_context_stub_path)"
RESULT_FILE="$(state_context_path)"
PROMPT_FILE="$(prompt_path "state_loader")"
PROMPT_TEXT="$(read_prompt "state_loader")"
SCHEMA_JSON="$(schema_for_stage "state_loader")"
INPUT_DATA_COMPACT="$(jq -cn \
  --arg case_id "$CASE_ID" \
  --argjson case_input "$(read_json_compact "$INPUT_FILE")" \
  '{
    caseId: $case_id,
    caseInput: $case_input
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

CONTEXT_TEXT="$(jq -r '.decision.context // ""' "$INPUT_FILE")"
COMBINED_TEXT="$(printf '%s %s %s %s %s' \
  "$(jq -r '.decision.optionA // ""' "$INPUT_FILE")" \
  "$(jq -r '.decision.optionB // ""' "$INPUT_FILE")" \
  "$CONTEXT_TEXT" \
  "$(jq -r '.userProfile.job // ""' "$INPUT_FILE")" \
  "$(jq -r '.userProfile.priority // [] | join(" ")' "$INPUT_FILE")" \
  | tr '[:upper:]' '[:lower:]')"

RISK_PREFERENCE="$(jq -r '.state_hints.profile_state.risk_preference // .userProfile.risk_tolerance // "unknown"' "$INPUT_FILE")"
DECISION_STYLE_HINT="$(jq -r '.state_hints.profile_state.decision_style // empty' "$INPUT_FILE")"
CAREER_STAGE_HINT="$(jq -r '.state_hints.situational_state.career_stage // empty' "$INPUT_FILE")"
FINANCIAL_PRESSURE_HINT="$(jq -r '.state_hints.situational_state.financial_pressure // empty' "$INPUT_FILE")"
TIME_PRESSURE_HINT="$(jq -r '.state_hints.situational_state.time_pressure // empty' "$INPUT_FILE")"
EMOTIONAL_STATE_HINT="$(jq -r '.state_hints.situational_state.emotional_state // empty' "$INPUT_FILE")"
TOP_PRIORITIES_JSON="$(jq -c '.state_hints.profile_state.top_priorities // .userProfile.priority // [] | map(tostring)' "$INPUT_FILE")"
TOP_PRIORITIES_TEXT="$(jq -r 'if (.state_hints.profile_state.top_priorities // .userProfile.priority // [] | length) > 0 then (.state_hints.profile_state.top_priorities // .userProfile.priority // [] | join(", ")) else "none" end' "$INPUT_FILE")"
RECENT_MEMORY_JSON="$(jq -c '(.prior_memory.recent_similar_decisions // []) | map({
  topic: (.topic // "unknown"),
  selected_option: (.selected_option // "unknown"),
  outcome_note: (.outcome_note // "none")
})' "$INPUT_FILE")"
REPEATED_PATTERNS_JSON="$(jq -c '(.prior_memory.repeated_patterns // []) | map(if type == "string" and length > 0 then . else "unknown" end)' "$INPUT_FILE")"
CONSISTENCY_NOTES_JSON="$(jq -c '(.prior_memory.consistency_notes // []) | map(if type == "string" and length > 0 then . else "unknown" end)' "$INPUT_FILE")"
FIRST_PATTERN="$(jq -r '.prior_memory.repeated_patterns[0] // empty' "$INPUT_FILE")"
FIRST_CONSISTENCY_NOTE="$(jq -r '.prior_memory.consistency_notes[0] // empty' "$INPUT_FILE")"
AGE="$(jq -r '.userProfile.age // 0' "$INPUT_FILE")"

DECISION_STYLE="$(infer_decision_style "$DECISION_STYLE_HINT" "$RISK_PREFERENCE" "$COMBINED_TEXT")"
CAREER_STAGE="$(infer_career_stage "$CAREER_STAGE_HINT" "$AGE")"
FINANCIAL_PRESSURE="$(infer_financial_pressure "$FINANCIAL_PRESSURE_HINT" "$COMBINED_TEXT")"
TIME_PRESSURE="$(infer_time_pressure "$TIME_PRESSURE_HINT" "$COMBINED_TEXT")"
EMOTIONAL_STATE="$(infer_emotional_state "$EMOTIONAL_STATE_HINT" "$COMBINED_TEXT")"
DECISION_BIAS="$(build_decision_bias "$RISK_PREFERENCE" "$FIRST_PATTERN")"
CURRENT_CONSTRAINT="$(build_current_constraint "$FINANCIAL_PRESSURE" "$TIME_PRESSURE" "$EMOTIONAL_STATE")"
AGENT_GUIDANCE="$(build_agent_guidance "$TOP_PRIORITIES_TEXT" "$CURRENT_CONSTRAINT" "$FIRST_CONSISTENCY_NOTE")"

jq -n \
  --arg stage "state_loader" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for state-context generation." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files '[]' \
  --argjson provider_payload "$(live_provider_payload_json "state_loader" "$RESULT_FILE" "$INPUT_FILE")" \
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
  --arg case_id "$CASE_ID" \
  --arg risk_preference "$RISK_PREFERENCE" \
  --arg decision_style "$DECISION_STYLE" \
  --arg career_stage "$CAREER_STAGE" \
  --arg financial_pressure "$FINANCIAL_PRESSURE" \
  --arg time_pressure "$TIME_PRESSURE" \
  --arg emotional_state "$EMOTIONAL_STATE" \
  --arg decision_bias "$DECISION_BIAS" \
  --arg current_constraint "$CURRENT_CONSTRAINT" \
  --arg agent_guidance "$AGENT_GUIDANCE" \
  --argjson top_priorities "$TOP_PRIORITIES_JSON" \
  --argjson recent_similar_decisions "$RECENT_MEMORY_JSON" \
  --argjson repeated_patterns "$REPEATED_PATTERNS_JSON" \
  --argjson consistency_notes "$CONSISTENCY_NOTES_JSON" \
  '{
    case_id: $case_id,
    user_state: {
      profile_state: {
        risk_preference: $risk_preference,
        decision_style: $decision_style,
        top_priorities: $top_priorities
      },
      situational_state: {
        career_stage: $career_stage,
        financial_pressure: $financial_pressure,
        time_pressure: $time_pressure,
        emotional_state: $emotional_state
      },
      memory_state: {
        recent_similar_decisions: $recent_similar_decisions,
        repeated_patterns: $repeated_patterns,
        consistency_notes: $consistency_notes
      }
    },
    state_summary: {
      decision_bias: $decision_bias,
      current_constraint: $current_constraint,
      agent_guidance: $agent_guidance
    }
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "State Loader Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from state-context stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "state_loader" "state_loader" "$REQUEST_FILE" "$RESULT_FILE"
fi
