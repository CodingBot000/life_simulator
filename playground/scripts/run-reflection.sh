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
ADVISOR_RESULT_FILE="$(resolve_stage_result_file "advisor")"

PLANNER_RESULT_COMPACT="$(read_json_compact "$PLANNER_RESULT_FILE")"
SCENARIO_A_RESULT_COMPACT="$(read_json_compact "$SCENARIO_A_RESULT_FILE")"
SCENARIO_B_RESULT_COMPACT="$(read_json_compact "$SCENARIO_B_RESULT_FILE")"
RISK_A_RESULT_COMPACT="$(read_json_compact "$RISK_A_RESULT_FILE")"
RISK_B_RESULT_COMPACT="$(read_json_compact "$RISK_B_RESULT_FILE")"
REASONING_RESULT_COMPACT="$(read_json_compact "$REASONING_RESULT_FILE")"
ADVISOR_RESULT_COMPACT="$(read_json_compact "$ADVISOR_RESULT_FILE")"

PROMPT_FILE="$(prompt_path "reflection")"
PROMPT_TEXT="$(read_prompt "reflection")"
SCHEMA_JSON="$(schema_for_stage "reflection")"
REQUEST_FILE="$(stage_request_path "reflection")"
PREVIEW_FILE="$(stage_preview_path "reflection")"
STUB_FILE="$(stage_stub_path "reflection")"
RESULT_FILE="$(stage_result_path "reflection")"

PRIMARY_PRIORITY="$(jq -r '.userProfile.priority[0] // "priority_alignment"' "$INPUT_FILE")"
DECISION_TYPE="$(jq -r '.decision_type' "$PLANNER_RESULT_FILE")"
ADVISOR_OPTION="$(jq -r '.recommended_option' "$ADVISOR_RESULT_FILE")"
RISK_A_LEVEL="$(jq -r '.risk_level' "$RISK_A_RESULT_FILE")"
RISK_B_LEVEL="$(jq -r '.risk_level' "$RISK_B_RESULT_FILE")"
SELECTED_REASONING="$(jq -r '.reasoning.final_selection.selected_reasoning' "$REASONING_RESULT_FILE")"
SELECTED_OPTION="$(jq -r '.reasoning.final_selection.selected_option' "$REASONING_RESULT_FILE")"
DECISION_CONFIDENCE="$(jq -r '.reasoning.final_selection.decision_confidence' "$REASONING_RESULT_FILE")"

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
  --argjson advisor_result "$ADVISOR_RESULT_COMPACT" \
  '{
    caseId: $case_id,
    caseInput: $base_input,
    stateContext: $state_context,
    plannerResult: $planner_result,
    scenarioA: $scenario_a,
    scenarioB: $scenario_b,
    riskA: $risk_a,
    riskB: $risk_b,
    abReasoning: $ab_reasoning,
    advisorResult: $advisor_result
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

jq -n \
  --arg stage "reflection" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "[\"$(relative_to_root "$STATE_CONTEXT_FILE")\", \"$(relative_to_root "$PLANNER_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_A_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_B_RESULT_FILE")\", \"$(relative_to_root "$RISK_A_RESULT_FILE")\", \"$(relative_to_root "$RISK_B_RESULT_FILE")\", \"$(relative_to_root "$REASONING_RESULT_FILE")\", \"$(relative_to_root "$ADVISOR_RESULT_FILE")\"]" \
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
  --arg primary_priority "$PRIMARY_PRIORITY" \
  --arg decision_type "$DECISION_TYPE" \
  --arg advisor_option "$ADVISOR_OPTION" \
  --arg risk_a_level "$RISK_A_LEVEL" \
  --arg risk_b_level "$RISK_B_LEVEL" \
  --arg selected_reasoning "$SELECTED_REASONING" \
  --arg selected_option "$SELECTED_OPTION" \
  --arg decision_confidence "$DECISION_CONFIDENCE" \
  '{
    scores: {
      realism: 4,
      consistency: 4,
      profile_alignment: 3,
      recommendation_clarity: 4
    },
    issues: [
      {
        type: "profile",
        description: ("planner가 \($decision_type)로 의사결정을 분류했지만, 최우선 priority인 \($primary_priority)을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.")
      },
      {
        type: "reasoning",
        description: ("reasoning의 최종 선택은 reasoning \($selected_reasoning), option \($selected_option), confidence \($decision_confidence)로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.")
      },
      {
        type: "advisor",
        description: ("advisor가 \($advisor_option)를 추천하지만 riskA=\($risk_a_level), riskB=\($risk_b_level)와 reasoning final_selection을 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.")
      }
    ],
    improvement_suggestions: [
      {
        target: "scenario",
        suggestion: ("각 시간 축 문장에서 \($primary_priority) 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.")
      },
      {
        target: "reasoning",
        suggestion: "A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라."
      },
      {
        target: "advisor",
        suggestion: "최종 추천 사유를 priority, risk, reasoning, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라."
      }
    ],
    overall_comment: "전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다."
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "Reflection Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from reflection stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "reflection" "reflection" "$REQUEST_FILE" "$RESULT_FILE"
fi
