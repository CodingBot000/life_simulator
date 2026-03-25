#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

require_jq

INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

BASE_INPUT_COMPACT="$(read_json_compact "$INPUT_FILE")"
CASE_ID="$(case_id_from_output_dir "$OUTPUTS_DIR")"
PLANNER_RESULT_FILE="$(resolve_stage_result_file "planner")"
SCENARIO_A_RESULT_FILE="$(resolve_stage_result_file "scenario-a")"
SCENARIO_B_RESULT_FILE="$(resolve_stage_result_file "scenario-b")"
RISK_A_RESULT_FILE="$(resolve_stage_result_file "risk-a")"
RISK_B_RESULT_FILE="$(resolve_stage_result_file "risk-b")"

PLANNER_RESULT_COMPACT="$(read_json_compact "$PLANNER_RESULT_FILE")"
SCENARIO_A_RESULT_COMPACT="$(read_json_compact "$SCENARIO_A_RESULT_FILE")"
SCENARIO_B_RESULT_COMPACT="$(read_json_compact "$SCENARIO_B_RESULT_FILE")"
RISK_A_RESULT_COMPACT="$(read_json_compact "$RISK_A_RESULT_FILE")"
RISK_B_RESULT_COMPACT="$(read_json_compact "$RISK_B_RESULT_FILE")"

PROMPT_FILE="$(prompt_path "ab_reasoning")"
PROMPT_TEXT="$(read_prompt "ab_reasoning")"
SCHEMA_JSON="$(schema_for_stage "reasoning")"
REQUEST_FILE="$(stage_request_path "reasoning")"
PREVIEW_FILE="$(stage_preview_path "reasoning")"
STUB_FILE="$(stage_stub_path "reasoning")"
RESULT_FILE="$(stage_result_path "reasoning")"

RISK_TOLERANCE="$(jq -r '.userProfile.risk_tolerance' "$INPUT_FILE")"
PRIMARY_PRIORITY="$(jq -r '.userProfile.priority[0] // "priority_alignment"' "$INPUT_FILE")"
DECISION_TYPE="$(jq -r '.decision_type' "$PLANNER_RESULT_FILE")"
FACTORS_TEXT="$(jq -r '.factors | join(", ")' "$PLANNER_RESULT_FILE")"
RISK_A_LEVEL="$(jq -r '.risk_level' "$RISK_A_RESULT_FILE")"
RISK_B_LEVEL="$(jq -r '.risk_level' "$RISK_B_RESULT_FILE")"

if [ "$RISK_A_LEVEL" = "low" ] && [ "$RISK_B_LEVEL" != "low" ]; then
  SELECTED_OPTION="A"
  SELECTED_REASONING="A"
  DECISION_CONFIDENCE='0.77'
elif [ "$RISK_B_LEVEL" = "low" ] && [ "$RISK_A_LEVEL" != "low" ]; then
  SELECTED_OPTION="B"
  SELECTED_REASONING="B"
  DECISION_CONFIDENCE='0.71'
elif [ "$RISK_TOLERANCE" = "high" ] && [ "$RISK_B_LEVEL" != "high" ]; then
  SELECTED_OPTION="B"
  SELECTED_REASONING="B"
  DECISION_CONFIDENCE='0.68'
else
  SELECTED_OPTION="A"
  SELECTED_REASONING="A"
  DECISION_CONFIDENCE='0.70'
fi

INPUT_DATA_COMPACT="$(jq -cn \
  --arg case_id "$CASE_ID" \
  --argjson base_input "$BASE_INPUT_COMPACT" \
  --argjson planner_result "$PLANNER_RESULT_COMPACT" \
  --argjson scenario_a "$SCENARIO_A_RESULT_COMPACT" \
  --argjson scenario_b "$SCENARIO_B_RESULT_COMPACT" \
  --argjson risk_a "$RISK_A_RESULT_COMPACT" \
  --argjson risk_b "$RISK_B_RESULT_COMPACT" \
  '{
    caseId: $case_id,
    userProfile: $base_input.userProfile,
    decision: $base_input.decision,
    plannerResult: $planner_result,
    scenarioA: $scenario_a,
    scenarioB: $scenario_b,
    riskA: $risk_a,
    riskB: $risk_b
  }')"
INPUT_JSON="$(printf '%s' "$INPUT_DATA_COMPACT" | jq .)"

jq -n \
  --arg stage "ab_reasoning" \
  --arg generated_at "$(timestamp_utc)" \
  --arg description "Prepared request payload for Codex CLI live execution." \
  --arg prompt_file "$(relative_to_root "$PROMPT_FILE")" \
  --arg input_source "$(relative_to_root "$INPUT_FILE")" \
  --arg output_file "$(relative_to_root "$RESULT_FILE")" \
  --arg prompt_text "$PROMPT_TEXT" \
  --arg input_json "$INPUT_JSON" \
  --argjson input_data "$INPUT_DATA_COMPACT" \
  --argjson expected_output_schema "$SCHEMA_JSON" \
  --argjson previous_stage_result_files "[\"$(relative_to_root "$PLANNER_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_A_RESULT_FILE")\", \"$(relative_to_root "$SCENARIO_B_RESULT_FILE")\", \"$(relative_to_root "$RISK_A_RESULT_FILE")\", \"$(relative_to_root "$RISK_B_RESULT_FILE")\"]" \
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
  --arg planner_goal "$DECISION_TYPE decision에서 $FACTORS_TEXT 기준으로 사용자에게 더 맞는 선택을 판별한다." \
  --arg risk_tolerance "$RISK_TOLERANCE" \
  --arg primary_priority "$PRIMARY_PRIORITY" \
  --arg risk_a_level "$RISK_A_LEVEL" \
  --arg risk_b_level "$RISK_B_LEVEL" \
  --arg selected_reasoning "$SELECTED_REASONING" \
  --arg selected_option "$SELECTED_OPTION" \
  --arg option_a "$(jq -r '.decision.optionA' "$INPUT_FILE")" \
  --arg option_b "$(jq -r '.decision.optionB' "$INPUT_FILE")" \
  --arg context "$(jq -r '.decision.context' "$INPUT_FILE")" \
  --argjson base_input "$BASE_INPUT_COMPACT" \
  --argjson decision_confidence "$DECISION_CONFIDENCE" \
  '{
    case_id: $case_id,
    input_summary: {
      user_profile: $base_input.userProfile,
      decision_options: $base_input.decision,
      planner_goal: $planner_goal
    },
    reasoning: {
      a_reasoning: {
        stance: "conservative",
        summary: ("보수적 reasoning은 사용자의 risk_tolerance가 \($risk_tolerance)이고 최우선 priority가 \($primary_priority)라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다."),
        key_assumptions: [
          ("사용자는 \($primary_priority) 기준의 손실을 성장 기회보다 더 크게 체감한다."),
          ("riskA=\($risk_a_level), riskB=\($risk_b_level) 차이는 실제 선택 만족도에 직접 영향을 준다.")
        ],
        pros: [
          ("선택지 A(\($option_a))는 안정성, 예측 가능성, 회복 비용 측면에서 방어력이 높다."),
          "현재 시나리오 흐름에서는 급격한 생활 리듬 훼손 가능성이 상대적으로 낮다."
        ],
        cons: [
          "성장 속도나 기회 폭이 제한될 수 있다.",
          "장기적으로는 기회비용을 더 크게 느낄 수 있다."
        ],
        recommended_option: "A",
        confidence: 0.76
      },
      b_reasoning: {
        stance: "opportunity_seeking",
        summary: ("기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다."),
        key_assumptions: [
          "사용자가 단기 불확실성을 감당할 수 있다면 장기 성장 체감은 더 커질 수 있다.",
          ("decision context인 \($context)에서 정체 해소가 중요한 만족 요인이 될 수 있다.")
        ],
        pros: [
          ("선택지 B(\($option_b))는 역할 변화와 성장 기회를 더 크게 열 수 있다."),
          "장기적으로는 기술 경험과 선택지 확장에 유리할 수 있다."
        ],
        cons: [
          ("riskB=\($risk_b_level)라면 사용자의 현재 성향과 직접 충돌할 수 있다."),
          "초기 적응 비용과 생활 변동성을 더 크게 감수해야 할 수 있다."
        ],
        recommended_option: "B",
        confidence: 0.64
      },
      comparison: {
        agreements: [
          "두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.",
          "두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다."
        ],
        conflicts: [
          "A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.",
          "A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다."
        ],
        which_fits_user_better: $selected_option,
        reason: ("현재 입력에서는 risk_tolerance=\($risk_tolerance), primary_priority=\($primary_priority), riskA=\($risk_a_level), riskB=\($risk_b_level) 조합 때문에 \($selected_option) 쪽이 사용자 성향과 더 직접적으로 맞는다.")
      },
      final_selection: {
        selected_reasoning: $selected_reasoning,
        selected_option: $selected_option,
        why_selected: ("최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 \($selected_reasoning) reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다."),
        decision_confidence: $decision_confidence
      }
    }
  }' > "$STUB_FILE"

write_request_preview "$REQUEST_FILE" "$PREVIEW_FILE" "A/B Reasoning Request Preview"

echo "Created $(relative_to_root "$REQUEST_FILE")"
echo "Created $(relative_to_root "$PREVIEW_FILE")"
echo "Created $(relative_to_root "$STUB_FILE")"

if compose_only_enabled; then
  cp "$STUB_FILE" "$RESULT_FILE"
  echo "Created $(relative_to_root "$RESULT_FILE") from reasoning stub because CODEX_COMPOSE_ONLY=1"
else
  run_codex_for_request "reasoning" "ab_reasoning" "$REQUEST_FILE" "$RESULT_FILE"
fi
