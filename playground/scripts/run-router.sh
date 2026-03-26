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

level_rank() {
  case "$1" in
    low)
      printf '0\n'
      ;;
    medium)
      printf '1\n'
      ;;
    high)
      printf '2\n'
      ;;
    *)
      echo "Error: unknown level '$1'." >&2
      exit 1
      ;;
  esac
}

classify_complexity() {
  local text="$1"
  local priority_count="$2"
  local context_length="$3"
  local score=0

  if [ "$priority_count" -ge 3 ]; then
    score=$((score + 1))
  fi

  if [ "$context_length" -ge 70 ]; then
    score=$((score + 1))
  fi

  if contains_keyword "$text" "하지만" "다만" "반면" "동시에" "however" "while" "yet"; then
    score=$((score + 1))
  fi

  if contains_keyword "$text" "창업" "스타트업" "startup" "이직" "해외" "유학" "이사" "relocat" "프리랜스" "번아웃" "대출" "manager"; then
    score=$((score + 1))
  fi

  if [ "$score" -ge 4 ]; then
    printf 'high\n'
  elif [ "$score" -ge 2 ]; then
    printf 'medium\n'
  else
    printf 'low\n'
  fi
}

classify_risk_level() {
  local text="$1"
  local risk_tolerance="$2"
  local score=0

  if contains_keyword "$text" "대출" "부채" "loan" "debt"; then
    score=$((score + 2))
  fi

  if contains_keyword "$text" "건강" "번아웃" "수면" "relationship" "연애" "결혼"; then
    score=$((score + 2))
  fi

  if contains_keyword "$text" "창업" "스타트업" "startup" "이직" "해외" "유학" "이사" "relocat" "프리랜스" "사업"; then
    score=$((score + 2))
  fi

  if contains_keyword "$text" "연봉" "수입" "income" "career" "job" "취업" "회사"; then
    score=$((score + 1))
  fi

  if [ "$risk_tolerance" = "low" ] && [ "$score" -ge 3 ]; then
    printf 'high\n'
  elif [ "$score" -ge 5 ]; then
    printf 'high\n'
  elif [ "$score" -ge 2 ]; then
    printf 'medium\n'
  else
    printf 'low\n'
  fi
}

classify_ambiguity() {
  local text="$1"
  local state_unknown_count="$2"
  local score=0

  if contains_keyword "$text" "느낌" "가능성" "고민" "부담" "애매" "불확실" "모르겠" "uncertain" "maybe" "could"; then
    score=$((score + 1))
  fi

  if contains_keyword "$text" "하지만" "다만" "한편" "반면" "동시에" "however" "yet"; then
    score=$((score + 1))
  fi

  if contains_keyword "$text" "장기" "미래" "선택지" "future" "optionality"; then
    score=$((score + 1))
  fi

  if [ "$state_unknown_count" -ge 3 ]; then
    score=$((score + 1))
  fi

  if [ "$score" -ge 3 ]; then
    printf 'high\n'
  elif [ "$score" -ge 1 ]; then
    printf 'medium\n'
  else
    printf 'low\n'
  fi
}

determine_execution_mode() {
  local complexity="$1"
  local risk_level="$2"
  local ambiguity="$3"

  if [ "$risk_level" = "high" ]; then
    printf 'full\n'
  elif [ "$ambiguity" = "high" ]; then
    printf 'full\n'
  elif [ "$complexity" = "high" ] && [ "$(level_rank "$ambiguity")" -ge 1 ]; then
    printf 'full\n'
  elif [ "$complexity" = "low" ] && [ "$risk_level" = "low" ] && [ "$ambiguity" = "low" ]; then
    printf 'light\n'
  elif [ "$risk_level" = "medium" ]; then
    printf 'careful\n'
  else
    printf 'standard\n'
  fi
}

build_routing_reason() {
  local complexity="$1"
  local risk_level="$2"
  local ambiguity="$3"
  local execution_mode="$4"
  local state_unknown_count="$5"

  case "$execution_mode" in
    full)
      if [ "$risk_level" = "high" ]; then
        printf '%s\n' "잘못 판단했을 때 손실 규모가 커 고위험 케이스로 보고 전체 경로 실행이 필요하다."
      elif [ "$ambiguity" = "high" ] && [ "$state_unknown_count" -ge 3 ]; then
        printf '%s\n' "상태 정보의 공백과 해석 여지가 함께 커 전체 경로 실행이 필요하다."
      elif [ "$ambiguity" = "high" ]; then
        printf '%s\n' "정보 해석 여지가 크고 불확실성이 높아 전체 경로 실행이 필요하다."
      else
        printf '%s\n' "복잡도와 불확실성이 함께 높아 planner 이후 심화 검토가 모두 필요하다."
      fi
      ;;
    careful)
      printf '%s\n' "리스크 점검은 필요하지만 전체 반성 단계까지 갈 수준은 아니어서 careful 경로를 선택한다."
      ;;
    standard)
      printf '%s\n' "중간 수준의 변수는 있으나 주된 검토는 시나리오 비교로 구조화 가능해 standard 경로를 선택한다."
      ;;
    light)
      printf '%s\n' "복잡도, 리스크, 모호성이 모두 낮아 planner와 advisor만으로 충분한 light 경로를 선택한다."
      ;;
    *)
      echo "Error: unknown execution mode '$execution_mode'." >&2
      exit 1
      ;;
  esac
}

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
STATE_CONTEXT_FILE="$(state_context_path)"
REQUEST_FILE="$(stage_request_path "routing")"
PREVIEW_FILE="$(stage_preview_path "routing")"
STUB_FILE="$(stage_stub_path "routing")"
RESULT_FILE="$(stage_result_path "routing")"
PROMPT_FILE="$(prompt_path "router")"
PROMPT_TEXT="$(read_prompt "router")"
SCHEMA_JSON="$(schema_for_stage "routing")"

if [ ! -f "$STATE_CONTEXT_FILE" ]; then
  echo "Error: state context file not found: $STATE_CONTEXT_FILE" >&2
  exit 1
fi

INPUT_DATA_COMPACT="$(jq -cn \
  --arg case_id "$CASE_ID" \
  --argjson base_input "$(read_json_compact "$INPUT_FILE")" \
  --argjson state_context "$(read_json_compact "$STATE_CONTEXT_FILE")" \
  '{
    caseId: $case_id,
    caseInput: $base_input,
    stateContext: $state_context
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

OPTION_A="$(jq -r '.decision.optionA' "$INPUT_FILE")"
OPTION_B="$(jq -r '.decision.optionB' "$INPUT_FILE")"
CONTEXT="$(jq -r '.decision.context' "$INPUT_FILE")"
RISK_TOLERANCE="$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")"
JOB="$(jq -r '.userProfile.job' "$INPUT_FILE")"
PRIORITY_TEXT="$(jq -r '.userProfile.priority | join(" ")' "$INPUT_FILE")"
PRIORITY_COUNT="$(jq -r '.userProfile.priority | length' "$INPUT_FILE")"
COMBINED_TEXT="$(printf '%s %s %s %s %s' "$OPTION_A" "$OPTION_B" "$CONTEXT" "$JOB" "$PRIORITY_TEXT" | tr '[:upper:]' '[:lower:]')"
CONTEXT_LENGTH="${#CONTEXT}"
STATE_UNKNOWN_COUNT="$(jq -r '[.user_state.profile_state.risk_preference, .user_state.profile_state.decision_style, .user_state.situational_state.career_stage, .user_state.situational_state.financial_pressure, .user_state.situational_state.time_pressure, .user_state.situational_state.emotional_state] | map(select(. == "unknown" or . == "none")) | length' "$STATE_CONTEXT_FILE")"

COMPLEXITY="$(classify_complexity "$COMBINED_TEXT" "$PRIORITY_COUNT" "$CONTEXT_LENGTH")"
RISK_LEVEL="$(classify_risk_level "$COMBINED_TEXT" "$RISK_TOLERANCE")"
AMBIGUITY="$(classify_ambiguity "$COMBINED_TEXT" "$STATE_UNKNOWN_COUNT")"
EXECUTION_MODE="$(determine_execution_mode "$COMPLEXITY" "$RISK_LEVEL" "$AMBIGUITY")"
SELECTED_PATH_JSON="$(selected_path_json_for_mode "$EXECUTION_MODE")"
ROUTING_REASON="$(build_routing_reason "$COMPLEXITY" "$RISK_LEVEL" "$AMBIGUITY" "$EXECUTION_MODE" "$STATE_UNKNOWN_COUNT")"

jq -n \
  --arg stage "router" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "[\"$(relative_to_root "$STATE_CONTEXT_FILE")\"]" \
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
  --arg case_id "$CASE_ID" \
  --arg complexity "$COMPLEXITY" \
  --arg risk_level "$RISK_LEVEL" \
  --arg ambiguity "$AMBIGUITY" \
  --arg execution_mode "$EXECUTION_MODE" \
  --arg routing_reason "$ROUTING_REASON" \
  --argjson selected_path "$SELECTED_PATH_JSON" \
  '{
    case_id: $case_id,
    routing: {
      complexity: $complexity,
      risk_level: $risk_level,
      ambiguity: $ambiguity,
      execution_mode: $execution_mode,
      selected_path: $selected_path,
      routing_reason: $routing_reason
    }
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Router Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from routing stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "routing" "router" "$REQUEST_FILE" "$RESULT_FILE"
fi
