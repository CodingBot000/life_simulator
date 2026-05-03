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

option_change_score() {
  local text
  local score=0

  text="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

  if contains_keyword "$text" "창업" "스타트업" "startup" "사업"; then
    score=$((score + 2))
  fi

  if contains_keyword "$text" "이직" "프리랜스" "해외" "유학" "이사" "relocat" "quit"; then
    score=$((score + 2))
  fi

  if contains_keyword "$text" "사이드프로젝트" "sideproject" "manager" "관리"; then
    score=$((score + 1))
  fi

  if contains_keyword "$text" "남는다" "유지" "휴식" "안정" "취업" "정규직" "rest"; then
    score=$((score - 1))
  fi

  printf '%s\n' "$score"
}

priority_prefers_growth() {
  contains_keyword "$1" "growth" "independence" "future_optionality" "optionality" "expansion" "도전" "성장" "독립"
}

priority_prefers_stability() {
  contains_keyword "$1" "stability" "income" "health" "sustainability" "work_life_balance" "안정" "건강" "수입" "회복"
}

choose_recommendation_without_reasoning() {
  local risk_tolerance="$1"
  local priority_text="$2"
  local option_a="$3"
  local option_b="$4"
  local risk_a_level="${5:-}"
  local risk_b_level="${6:-}"
  local score_a
  local score_b

  score_a="$(option_change_score "$option_a")"
  score_b="$(option_change_score "$option_b")"

  if [ -n "$risk_a_level" ] && [ -n "$risk_b_level" ] && [ "$risk_a_level" != "$risk_b_level" ]; then
    if [ "$risk_tolerance" = "low" ] || [ "$risk_tolerance" = "medium" ]; then
      if [ "$risk_a_level" = "low" ] || [ "$risk_b_level" = "high" ]; then
        printf 'A\n'
        return 0
      fi

      if [ "$risk_b_level" = "low" ] || [ "$risk_a_level" = "high" ]; then
        printf 'B\n'
        return 0
      fi
    fi
  fi

  if priority_prefers_stability "$priority_text" || [ "$risk_tolerance" = "low" ]; then
    if [ "$score_a" -le "$score_b" ]; then
      printf 'A\n'
    else
      printf 'B\n'
    fi
    return 0
  fi

  if priority_prefers_growth "$priority_text" && [ "$risk_tolerance" != "low" ]; then
    if [ "$score_a" -ge "$score_b" ]; then
      printf 'A\n'
    else
      printf 'B\n'
    fi
    return 0
  fi

  if [ "$score_a" -le "$score_b" ]; then
    printf 'A\n'
  else
    printf 'B\n'
  fi
}

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
BASE_INPUT_COMPACT="$(read_json_compact "$INPUT_FILE")"
STATE_CONTEXT_FILE="$(state_context_path)"
STATE_CONTEXT_COMPACT="$(read_json_compact "$STATE_CONTEXT_FILE")"
STATE_CONTEXT_REL="$(relative_to_root "$STATE_CONTEXT_FILE")"
ROUTING_RESULT_FILE=""
ROUTING_RESULT_COMPACT='null'
ROUTING_RESULT_REL=""

if ROUTING_RESULT_FILE="$(optional_stage_result_file "routing" 2>/dev/null)"; then
  ROUTING_RESULT_COMPACT="$(jq -c '.routing' "$ROUTING_RESULT_FILE")"
  ROUTING_RESULT_REL="$(relative_to_root "$ROUTING_RESULT_FILE")"
  EXECUTION_MODE="$(jq -r '.routing.execution_mode' "$ROUTING_RESULT_FILE")"
  SELECTED_PATH_JSON="$(jq -c '.routing.selected_path' "$ROUTING_RESULT_FILE")"
else
  EXECUTION_MODE="$(infer_execution_mode_from_artifacts)"
  SELECTED_PATH_JSON="$(selected_path_json_for_mode "$EXECUTION_MODE")"
fi

PLANNER_RESULT_FILE="$(resolve_stage_result_file "planner")"
PLANNER_RESULT_COMPACT="$(read_json_compact "$PLANNER_RESULT_FILE")"
PLANNER_RESULT_REL="$(relative_to_root "$PLANNER_RESULT_FILE")"

SCENARIO_A_RESULT_FILE=""
SCENARIO_B_RESULT_FILE=""
SCENARIO_A_RESULT_COMPACT='null'
SCENARIO_B_RESULT_COMPACT='null'
SCENARIO_A_RESULT_REL=""
SCENARIO_B_RESULT_REL=""

if stage_enabled_in_selected_path "$SELECTED_PATH_JSON" "scenario"; then
  SCENARIO_A_RESULT_FILE="$(resolve_stage_result_file "scenario-a")"
  SCENARIO_B_RESULT_FILE="$(resolve_stage_result_file "scenario-b")"
  SCENARIO_A_RESULT_COMPACT="$(read_json_compact "$SCENARIO_A_RESULT_FILE")"
  SCENARIO_B_RESULT_COMPACT="$(read_json_compact "$SCENARIO_B_RESULT_FILE")"
  SCENARIO_A_RESULT_REL="$(relative_to_root "$SCENARIO_A_RESULT_FILE")"
  SCENARIO_B_RESULT_REL="$(relative_to_root "$SCENARIO_B_RESULT_FILE")"
fi

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

REASONING_RESULT_FILE=""
REASONING_RESULT_COMPACT='null'
REASONING_RESULT_REL=""

if stage_enabled_in_selected_path "$SELECTED_PATH_JSON" "ab_reasoning"; then
  REASONING_RESULT_FILE="$(resolve_stage_result_file "reasoning")"
  REASONING_RESULT_COMPACT="$(read_json_compact "$REASONING_RESULT_FILE")"
  REASONING_RESULT_REL="$(relative_to_root "$REASONING_RESULT_FILE")"
fi

GUARDRAIL_RESULT_FILE=""
GUARDRAIL_RESULT_COMPACT='null'
GUARDRAIL_RESULT_REL=""

if GUARDRAIL_RESULT_FILE="$(optional_stage_result_file "guardrail" 2>/dev/null)"; then
  GUARDRAIL_RESULT_FILE="$(resolve_stage_result_file "guardrail")"
  GUARDRAIL_RESULT_COMPACT="$(read_json_compact "$GUARDRAIL_RESULT_FILE")"
  GUARDRAIL_RESULT_REL="$(relative_to_root "$GUARDRAIL_RESULT_FILE")"
fi

PROMPT_FILE="$(prompt_path "advisor")"
PROMPT_TEXT="$(read_prompt "advisor")"
SCHEMA_JSON="$(schema_for_stage "advisor")"
REQUEST_FILE="$(stage_request_path "advisor")"
PREVIEW_FILE="$(stage_preview_path "advisor")"
STUB_FILE="$(stage_stub_path "advisor")"
RESULT_FILE="$(stage_result_path "advisor")"

PREVIOUS_STAGE_RESULT_FILES_JSON="$(jq -cn \
  --arg state_context_rel "$STATE_CONTEXT_REL" \
  --arg routing_rel "$ROUTING_RESULT_REL" \
  --arg planner_rel "$PLANNER_RESULT_REL" \
  --arg scenario_a_rel "$SCENARIO_A_RESULT_REL" \
  --arg scenario_b_rel "$SCENARIO_B_RESULT_REL" \
  --arg risk_a_rel "$RISK_A_RESULT_REL" \
  --arg risk_b_rel "$RISK_B_RESULT_REL" \
  --arg reasoning_rel "$REASONING_RESULT_REL" \
  --arg guardrail_rel "$GUARDRAIL_RESULT_REL" \
  '[
    $state_context_rel,
    $routing_rel,
    $planner_rel,
    $scenario_a_rel,
    $scenario_b_rel,
    $risk_a_rel,
    $risk_b_rel,
    $reasoning_rel,
    $guardrail_rel
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
  --argjson guardrail_result "$GUARDRAIL_RESULT_COMPACT" \
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
    plannerResult: $planner_result
  }
  + (if $scenario_a != null then {scenarioA: $scenario_a} else {} end)
  + (if $scenario_b != null then {scenarioB: $scenario_b} else {} end)
  + (if $risk_a != null then {riskA: $risk_a} else {} end)
  + (if $risk_b != null then {riskB: $risk_b} else {} end)
  + (if $ab_reasoning != null then {abReasoning: $ab_reasoning} else {} end)
  + (if $guardrail_result != null then {guardrailResult: $guardrail_result} else {} end)')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

OPTION_A="$(jq -r '.decision.optionA' "$INPUT_FILE")"
OPTION_B="$(jq -r '.decision.optionB' "$INPUT_FILE")"
RISK_TOLERANCE="$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")"
PRIMARY_PRIORITY="$(jq -r '.userProfile.priority[0] // "priority_alignment"' "$INPUT_FILE")"
PRIORITY_TEXT="$(jq -r '.userProfile.priority | join(" ")' "$INPUT_FILE")"

RISK_A_LEVEL="not_run"
RISK_B_LEVEL="not_run"

if [ -n "$RISK_A_RESULT_FILE" ]; then
  RISK_A_LEVEL="$(jq -r '.risk_level' "$RISK_A_RESULT_FILE")"
  RISK_B_LEVEL="$(jq -r '.risk_level' "$RISK_B_RESULT_FILE")"
fi

BASE_DECISION=""
BASE_SELECTED_REASONING=""
BASE_CONFIDENCE=""
BASE_CORE_WHY=""
BASE_REASON_TEXT=""

if [ -n "$REASONING_RESULT_FILE" ]; then
  BASE_SELECTED_REASONING="$(jq -r '.reasoning.final_selection.selected_reasoning' "$REASONING_RESULT_FILE")"
  BASE_DECISION="$(jq -r '.reasoning.final_selection.selected_option' "$REASONING_RESULT_FILE")"
  BASE_CONFIDENCE="$(jq '.reasoning.final_selection.decision_confidence' "$REASONING_RESULT_FILE")"
  BASE_CORE_WHY="$(jq -r '.reasoning.final_selection.why_selected' "$REASONING_RESULT_FILE")"
  BASE_REASON_TEXT="사용자의 risk_tolerance가 ${RISK_TOLERANCE}이고 최우선 기준이 ${PRIMARY_PRIORITY}이므로, full 경로에서 생성된 A/B reasoning의 최종 선택을 기본값으로 채택한다. 실행 모드는 ${EXECUTION_MODE}이며 riskA=${RISK_A_LEVEL}, riskB=${RISK_B_LEVEL} 조합을 함께 고려했을 때 현재는 ${BASE_DECISION}를 추천한다."
else
  BASE_DECISION="$(choose_recommendation_without_reasoning "$RISK_TOLERANCE" "$PRIORITY_TEXT" "$OPTION_A" "$OPTION_B" "${RISK_A_LEVEL#not_run}" "${RISK_B_LEVEL#not_run}")"
  BASE_SELECTED_REASONING="$BASE_DECISION"

  case "$EXECUTION_MODE" in
    light)
      BASE_CONFIDENCE='0.61'
      BASE_CORE_WHY="router가 light 경로를 선택했기 때문에 planner의 비교 기준과 사용자의 우선순위, risk_tolerance만으로 더 맞는 선택을 정리했다."
      BASE_REASON_TEXT="router가 light 경로를 선택해 planner 결과와 userProfile만으로 비교했다. 최우선 기준이 ${PRIMARY_PRIORITY}이고 risk_tolerance가 ${RISK_TOLERANCE}이므로 현재 stub에서는 ${BASE_DECISION}를 추천한다."
      ;;
    standard)
      BASE_CONFIDENCE='0.66'
      BASE_CORE_WHY="scenarioA와 scenarioB까지 비교한 결과, 사용자의 우선순위와 더 잘 맞는 흐름을 advisor가 직접 선택했다."
      BASE_REASON_TEXT="router가 standard 경로를 선택해 scenarioA/B까지 비교했다. 최우선 기준이 ${PRIMARY_PRIORITY}이고 risk_tolerance가 ${RISK_TOLERANCE}이므로 현재 stub에서는 ${BASE_DECISION}를 추천한다."
      ;;
    careful)
      BASE_CONFIDENCE='0.70'
      BASE_CORE_WHY="scenario와 risk를 함께 비교한 결과, 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 선택을 advisor가 직접 선택했다."
      BASE_REASON_TEXT="router가 careful 경로를 선택해 scenario와 risk를 함께 비교했다. riskA=${RISK_A_LEVEL}, riskB=${RISK_B_LEVEL}이며 최우선 기준이 ${PRIMARY_PRIORITY}이므로 현재 stub에서는 ${BASE_DECISION}를 추천한다."
      ;;
    *)
      echo "Error: reasoning result is required for execution mode '$EXECUTION_MODE'." >&2
      exit 1
      ;;
  esac
fi

STUB_DECISION="$BASE_DECISION"
STUB_RECOMMENDED_OPTION="$BASE_DECISION"
SELECTED_REASONING="$BASE_SELECTED_REASONING"
DECISION_CONFIDENCE="$BASE_CONFIDENCE"
CORE_WHY="$BASE_CORE_WHY"
REASON_TEXT="$BASE_REASON_TEXT"
GUARDRAIL_APPLIED="false"

if [ -n "$GUARDRAIL_RESULT_FILE" ]; then
  GUARDRAIL_FINAL_MODE="$(jq -r '.final_mode' "$GUARDRAIL_RESULT_FILE")"
  GUARDRAIL_TRIGGERS="$(jq -r 'if (.triggers | length) > 0 then .triggers | join(", ") else "none" end' "$GUARDRAIL_RESULT_FILE")"
  GUARDRAIL_STRATEGY="$(jq -r 'if (.strategy | length) > 0 then .strategy | join(", ") else "none" end' "$GUARDRAIL_RESULT_FILE")"

  case "$GUARDRAIL_FINAL_MODE" in
    cautious)
      GUARDRAIL_APPLIED="true"
      DECISION_CONFIDENCE="$(jq -rn --argjson confidence "$BASE_CONFIDENCE" 'if ($confidence - 0.15) < 0.15 then 0.15 else ($confidence - 0.15) end')"
      REASON_TEXT="guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 ${GUARDRAIL_TRIGGERS}이고 대응 strategy는 ${GUARDRAIL_STRATEGY}다. 사용자의 최우선 기준이 ${PRIMARY_PRIORITY}인 점은 유지하되 riskA=${RISK_A_LEVEL}, riskB=${RISK_B_LEVEL}를 더 무겁게 반영해 현재는 ${BASE_DECISION} 쪽을 조심스럽게 권한다."
      CORE_WHY="guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다."
      ;;
    blocked)
      GUARDRAIL_APPLIED="true"
      STUB_DECISION="undecided"
      STUB_RECOMMENDED_OPTION="undecided"
      SELECTED_REASONING="undecided"
      DECISION_CONFIDENCE='0.35'
      REASON_TEXT="guardrail이 blocked 모드로 전환됐기 때문에 지금은 결론을 내리지 않는다. trigger는 ${GUARDRAIL_TRIGGERS}이고 strategy는 ${GUARDRAIL_STRATEGY}다. 현재 입력만으로는 사용자의 우선순위와 위험 해석 사이의 충돌을 안전하게 정리하기 어려우므로 추가 정보가 필요하다."
      CORE_WHY="모호성과 reasoning 충돌이 함께 커서 단정 추천보다 추가 정보 요청이 더 안전하다."
      ;;
  esac
fi

jq -n \
  --arg stage "advisor" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "$PREVIOUS_STAGE_RESULT_FILES_JSON" \
  --argjson provider_payload "$(live_provider_payload_json "advisor" "$RESULT_FILE" "$INPUT_FILE")" \
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
  --arg decision "$STUB_DECISION" \
  --arg recommended_option "$STUB_RECOMMENDED_OPTION" \
  --arg selected_reasoning "$SELECTED_REASONING" \
  --arg core_why "$CORE_WHY" \
  --arg reason "$REASON_TEXT" \
  --argjson confidence "$DECISION_CONFIDENCE" \
  --argjson guardrail_applied "$GUARDRAIL_APPLIED" \
  --argjson decision_confidence "$DECISION_CONFIDENCE" \
  '{
    decision: $decision,
    confidence: $confidence,
    recommended_option: $recommended_option,
    reason: $reason,
    guardrail_applied: $guardrail_applied,
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
