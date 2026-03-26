#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAYGROUND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PLAYGROUND_DIR/.." && pwd)"
PROMPTS_DIR="$REPO_ROOT/prompts"
INPUTS_DIR="$PLAYGROUND_DIR/inputs"
OUTPUTS_ROOT_DIR="$PLAYGROUND_DIR/outputs"
OUTPUTS_DIR="${PLAYGROUND_OUTPUT_DIR:-$OUTPUTS_ROOT_DIR}"

compose_only_enabled() {
  [ "${CODEX_COMPOSE_ONLY:-0}" = "1" ]
}

array_to_json() {
  jq -cn '$ARGS.positional' --args "$@"
}

has_value() {
  local needle="$1"
  shift

  local item
  for item in "$@"; do
    if [ "$item" = "$needle" ]; then
      return 0
    fi
  done

  return 1
}

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required for the playground scripts." >&2
    echo "Install jq first, for example with: brew install jq" >&2
    exit 1
  fi
}

require_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "Error: codex CLI is required for live execution mode." >&2
    echo "Install Codex CLI or run with CODEX_COMPOSE_ONLY=1 for request composition only." >&2
    exit 1
  fi
}

ensure_output_dir() {
  mkdir -p "$OUTPUTS_DIR"
}

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

relative_to_root() {
  local path="$1"
  path="${path#$REPO_ROOT/}"
  printf '%s\n' "$path"
}

resolve_input_file() {
  local input_file="${1:-$INPUTS_DIR/sample-input.json}"

  if [ ! -f "$input_file" ]; then
    echo "Error: input file not found: $input_file" >&2
    exit 1
  fi

  if ! jq empty "$input_file" >/dev/null 2>&1; then
    echo "Error: input file is not valid JSON: $input_file" >&2
    exit 1
  fi

  printf '%s\n' "$input_file"
}

derive_case_id_from_input() {
  local input_file="$1"
  local base_name
  base_name="$(basename "$input_file")"
  printf '%s\n' "${base_name%.json}"
}

resolve_output_dir() {
  local input_file="$1"
  local requested_output_dir="${2:-${PLAYGROUND_OUTPUT_DIR:-}}"
  local output_dir

  if [ -n "$requested_output_dir" ]; then
    output_dir="$requested_output_dir"
  else
    output_dir="$OUTPUTS_ROOT_DIR/$(derive_case_id_from_input "$input_file")"
  fi

  mkdir -p "$output_dir"
  printf '%s\n' "$output_dir"
}

case_id_from_output_dir() {
  local output_dir="$1"
  basename "$output_dir"
}

read_json_compact() {
  jq -c . "$1"
}

read_json_pretty() {
  jq . "$1"
}

prompt_path() {
  printf '%s/%s.md\n' "$PROMPTS_DIR" "$1"
}

read_prompt() {
  local stage="$1"
  local file
  file="$(prompt_path "$stage")"

  if [ ! -f "$file" ]; then
    echo "Error: prompt file not found: $file" >&2
    exit 1
  fi

  cat "$file"
}

stage_request_path() {
  printf '%s/%s-request.json\n' "$OUTPUTS_DIR" "$1"
}

stage_preview_path() {
  printf '%s/%s-preview.md\n' "$OUTPUTS_DIR" "$1"
}

stage_result_path() {
  printf '%s/%s-result.json\n' "$OUTPUTS_DIR" "$1"
}

stage_stub_path() {
  printf '%s/%s-result.stub.json\n' "$OUTPUTS_DIR" "$1"
}

state_context_path() {
  printf '%s/state-context.json\n' "$OUTPUTS_DIR"
}

state_context_stub_path() {
  printf '%s/state-context.stub.json\n' "$OUTPUTS_DIR"
}

selected_path_json_for_mode() {
  case "$1" in
    light)
      printf '%s\n' '["planner","advisor"]'
      ;;
    standard)
      printf '%s\n' '["planner","scenario","advisor"]'
      ;;
    careful)
      printf '%s\n' '["planner","scenario","risk","advisor"]'
      ;;
    full)
      printf '%s\n' '["planner","scenario","risk","ab_reasoning","guardrail","advisor","reflection"]'
      ;;
    *)
      echo "Error: unknown execution mode '$1'." >&2
      exit 1
      ;;
  esac
}

stage_enabled_in_selected_path() {
  local selected_path_json="$1"
  local stage_name="$2"

  jq -e --arg stage_name "$stage_name" 'index($stage_name) != null' <<<"$selected_path_json" >/dev/null
}

stage_result_exists() {
  local stage="$1"
  local actual_file
  local stub_file

  actual_file="$(stage_result_path "$stage")"
  stub_file="$(stage_stub_path "$stage")"

  [ -f "$actual_file" ] || [ -f "$stub_file" ]
}

optional_stage_result_file() {
  local stage="$1"

  if stage_result_exists "$stage"; then
    resolve_stage_result_file "$stage"
    return 0
  fi

  return 1
}

infer_execution_mode_from_artifacts() {
  if stage_result_exists "reasoning"; then
    printf 'full\n'
  elif stage_result_exists "risk-a" && stage_result_exists "risk-b"; then
    printf 'careful\n'
  elif stage_result_exists "scenario-a" && stage_result_exists "scenario-b"; then
    printf 'standard\n'
  else
    printf 'light\n'
  fi
}

summary_path() {
  printf '%s/summary.md\n' "$OUTPUTS_DIR"
}

aggregate_summary_path() {
  printf '%s/summary.md\n' "$OUTPUTS_ROOT_DIR"
}

write_default_guardrail_result() {
  local execution_mode="${1:-$(infer_execution_mode_from_artifacts)}"
  local stub_file
  local result_file
  local routing_file=""
  local risk_a_file=""
  local risk_b_file=""
  local state_context_file
  local routing_risk_level="low"
  local routing_ambiguity="low"
  local risk_a_level="not_run"
  local risk_b_level="not_run"
  local state_unknown_count="0"
  local guardrail_triggered="false"
  local final_mode="normal"
  local triggers_json
  local strategy_json
  local -a triggers=()
  local -a strategies=()

  require_jq

  stub_file="$(stage_stub_path "guardrail")"
  result_file="$(stage_result_path "guardrail")"
  state_context_file="$(state_context_path)"

  if [ -f "$state_context_file" ]; then
    state_unknown_count="$(jq -r '[.user_state.profile_state.risk_preference, .user_state.profile_state.decision_style, .user_state.situational_state.career_stage, .user_state.situational_state.financial_pressure, .user_state.situational_state.time_pressure, .user_state.situational_state.emotional_state] | map(select(. == "unknown" or . == "none")) | length' "$state_context_file")"
  fi

  if routing_file="$(optional_stage_result_file "routing" 2>/dev/null)"; then
    routing_risk_level="$(jq -r '.routing.risk_level' "$routing_file")"
    routing_ambiguity="$(jq -r '.routing.ambiguity' "$routing_file")"
  fi

  if risk_a_file="$(optional_stage_result_file "risk-a" 2>/dev/null)"; then
    risk_b_file="$(resolve_stage_result_file "risk-b")"
    risk_a_level="$(jq -r '.risk_level' "$risk_a_file")"
    risk_b_level="$(jq -r '.risk_level' "$risk_b_file")"
  fi

  if [ "$routing_ambiguity" = "high" ] || [ "$state_unknown_count" -ge 3 ]; then
    triggers+=("ambiguity_high")
    strategies+=("ask_more_info")
  fi

  if [ "$routing_risk_level" = "high" ] || [ "$risk_a_level" = "high" ] || [ "$risk_b_level" = "high" ]; then
    triggers+=("high_risk")
    strategies+=("risk_warning")
  fi

  if [ "${#triggers[@]}" -gt 0 ]; then
    guardrail_triggered="true"
    final_mode="cautious"
  fi

  triggers_json='[]'
  strategy_json='[]'

  if [ "${#triggers[@]}" -gt 0 ]; then
    triggers_json="$(array_to_json "${triggers[@]}")"
    strategy_json="$(array_to_json "${strategies[@]}")"
  fi

  jq -n \
    --argjson guardrail_triggered "$guardrail_triggered" \
    --argjson triggers "$triggers_json" \
    --argjson strategy "$strategy_json" \
    --arg final_mode "$final_mode" \
    '{
      guardrail_triggered: $guardrail_triggered,
      triggers: $triggers,
      strategy: $strategy,
      final_mode: $final_mode
    }' > "$stub_file"

  cp "$stub_file" "$result_file"

  echo "Created $(relative_to_root "$stub_file")"
  echo "Created $(relative_to_root "$result_file") as derived guardrail output for execution_mode=$execution_mode"
}

write_default_reflection_result() {
  local execution_mode="${1:-$(infer_execution_mode_from_artifacts)}"
  local stub_file
  local result_file
  local advisor_file
  local guardrail_file=""
  local routing_file=""
  local risk_a_file=""
  local risk_b_file=""
  local advisor_decision
  local advisor_confidence
  local advisor_guardrail_applied
  local guardrail_final_mode="normal"
  local guardrail_triggered="false"
  local guardrail_was_needed="false"
  local guardrail_correctness="good"
  local routing_risk_level="low"
  local routing_ambiguity="low"
  local risk_a_level="not_run"
  local risk_b_level="not_run"
  local evaluation_text
  local overall_comment
  local stage_issue_type="advisor"
  local stage_issue_text
  local stage_target="advisor"
  local stage_suggestion_text

  require_jq

  stub_file="$(stage_stub_path "reflection")"
  result_file="$(stage_result_path "reflection")"
  advisor_file="$(resolve_stage_result_file "advisor")"

  advisor_decision="$(jq -r '.decision' "$advisor_file")"
  advisor_confidence="$(jq -r '.confidence' "$advisor_file")"
  advisor_guardrail_applied="$(jq -r '.guardrail_applied' "$advisor_file")"

  if guardrail_file="$(optional_stage_result_file "guardrail" 2>/dev/null)"; then
    guardrail_triggered="$(jq -r '.guardrail_triggered' "$guardrail_file")"
    guardrail_final_mode="$(jq -r '.final_mode' "$guardrail_file")"
  fi

  if routing_file="$(optional_stage_result_file "routing" 2>/dev/null)"; then
    routing_risk_level="$(jq -r '.routing.risk_level' "$routing_file")"
    routing_ambiguity="$(jq -r '.routing.ambiguity' "$routing_file")"
  fi

  if risk_a_file="$(optional_stage_result_file "risk-a" 2>/dev/null)"; then
    risk_b_file="$(resolve_stage_result_file "risk-b")"
    risk_a_level="$(jq -r '.risk_level' "$risk_a_file")"
    risk_b_level="$(jq -r '.risk_level' "$risk_b_file")"
  fi

  if [ "$guardrail_triggered" = "true" ] || [ "$guardrail_final_mode" != "normal" ] || [ "$routing_risk_level" = "high" ] || [ "$routing_ambiguity" = "high" ] || [ "$risk_a_level" = "high" ] || [ "$risk_b_level" = "high" ]; then
    guardrail_was_needed="true"
  fi

  if [ "$guardrail_was_needed" = "true" ] && [ "$guardrail_triggered" = "false" ]; then
    guardrail_correctness="missing"
  elif [ "$guardrail_was_needed" = "false" ] && [ "$guardrail_triggered" = "true" ]; then
    guardrail_correctness="over"
  fi

  case "$execution_mode" in
    light)
      stage_issue_type="profile"
      stage_issue_text="light 경로에서는 planner와 advisor만 사용하므로, 우선순위와 risk_tolerance가 추천 근거에 얼마나 직접 연결됐는지 더 선명하게 보여줄 필요가 있다."
      stage_target="planner"
      stage_suggestion_text="planner에서 최우선 priority와 risk_tolerance를 한 줄 요약으로 고정해 advisor reason이 그대로 재사용할 수 있게 하라."
      ;;
    standard)
      stage_issue_type="scenario"
      stage_issue_text="standard 경로에서는 scenario 비교가 핵심이므로, 각 옵션의 시간축 변화가 최우선 priority와 어떻게 연결되는지 더 직접적으로 드러낼 필요가 있다."
      stage_target="scenario"
      stage_suggestion_text="scenario A/B의 3개월, 1년, 3년 문장마다 사용자의 최우선 priority 유지 여부를 한 문장씩 명시하라."
      ;;
    careful)
      stage_issue_type="risk"
      stage_issue_text="careful 경로에서는 risk 판단이 guardrail 필요성에 직접 연결되므로, risk 차이가 advisor reason에 어떻게 반영됐는지 더 또렷해야 한다."
      stage_target="risk"
      stage_suggestion_text="risk 단계에서 high/medium 차이를 advisor가 그대로 인용할 수 있도록 단기 리스크와 장기 리스크를 분리해 적어라."
      ;;
    *)
      stage_issue_type="advisor"
      stage_issue_text="현재 실행 경로의 핵심 증거가 advisor reason에 압축돼 있어, 어떤 근거가 결론을 지탱하는지 추적성이 약해질 수 있다."
      stage_target="advisor"
      stage_suggestion_text="advisor reason을 routing, 핵심 증거, 최종 선택 순서로 다시 정리해 guardrail 영향이 한눈에 보이게 하라."
      ;;
  esac

  case "$guardrail_final_mode" in
    blocked)
      evaluation_text="guardrail final_mode=blocked 조건에서 advisor가 결론을 보류한 판단이 현재 증거 수준에 비해 과하거나 부족하지 않은지 다시 점검한다."
      overall_comment="blocked 모드에서는 결론 보류 자체는 타당하지만, 어떤 추가 정보가 들어오면 판단을 재개할지까지 적어야 검증 가능성이 높아진다."
      ;;
    cautious)
      evaluation_text="guardrail final_mode=cautious 조건에서 advisor가 약한 추천과 낮아진 confidence로 위험 신호를 충분히 반영했는지 다시 점검한다."
      overall_comment="cautious 모드 전환은 적절하며, 위험 신호를 유지한 채 추천 강도를 낮춘 점이 현재 실행 경로와 잘 맞는다."
      ;;
    *)
      evaluation_text="guardrail final_mode=normal 조건에서 advisor가 불필요하게 보수적이지 않으면서도 현재 실행 경로의 증거를 충분히 연결했는지 다시 점검한다."
      overall_comment="normal 모드에서는 현재 추천 강도가 크게 과하지 않지만, 사용된 근거 축을 더 분명히 적으면 검증 추적성이 좋아진다."
      ;;
  esac

  jq -n \
    --arg execution_mode "$execution_mode" \
    --arg advisor_decision "$advisor_decision" \
    --argjson advisor_confidence "$advisor_confidence" \
    --arg advisor_guardrail_applied "$advisor_guardrail_applied" \
    --arg guardrail_final_mode "$guardrail_final_mode" \
    --arg risk_a_level "$risk_a_level" \
    --arg risk_b_level "$risk_b_level" \
    --arg routing_risk_level "$routing_risk_level" \
    --arg routing_ambiguity "$routing_ambiguity" \
    --arg evaluation_text "$evaluation_text" \
    --arg overall_comment "$overall_comment" \
    --arg stage_issue_type "$stage_issue_type" \
    --arg stage_issue_text "$stage_issue_text" \
    --arg stage_target "$stage_target" \
    --arg stage_suggestion_text "$stage_suggestion_text" \
    --argjson guardrail_was_needed "$guardrail_was_needed" \
    --argjson guardrail_was_triggered "$guardrail_triggered" \
    --arg guardrail_correctness "$guardrail_correctness" \
    '{
      evaluation: $evaluation_text,
      scores: {
        realism: 4,
        consistency: (if $guardrail_correctness == "good" then 4 else 2 end),
        profile_alignment: 4,
        recommendation_clarity: (
          if $guardrail_final_mode == "blocked" then 3
          elif $guardrail_final_mode == "cautious" then 4
          else 4
          end
        )
      },
      issues: [
        {
          type: "advisor",
          description: (
            "advisor decision=" + $advisor_decision
            + ", confidence=" + ($advisor_confidence | tostring)
            + ", guardrail_applied=" + $advisor_guardrail_applied
            + " 조합이 guardrail final_mode=" + $guardrail_final_mode
            + " 및 위험 신호(routing risk=" + $routing_risk_level
            + ", ambiguity=" + $routing_ambiguity
            + ", riskA=" + $risk_a_level
            + ", riskB=" + $risk_b_level
            + ")와 어떻게 연결되는지 문장 수준에서 더 직접적으로 드러나야 한다."
          )
        },
        {
          type: $stage_issue_type,
          description: $stage_issue_text
        }
      ],
      improvement_suggestions: [
        {
          target: "advisor",
          suggestion: (
            if $guardrail_final_mode == "blocked" then
              "advisor reason에 추가 정보 필요 조건과 결론 재개 기준을 직접 적어 blocked 판단의 근거를 명확히 하라."
            elif $guardrail_final_mode == "cautious" then
              "advisor reason에 조심스러운 추천임을 직접 밝히고 risk/uncertainty가 confidence를 낮춘 이유를 한 문장으로 덧붙여라."
            else
              "advisor reason에 사용된 핵심 증거 축을 routing과 함께 적어 normal 추천이 왜 과도하게 보수적이지 않은지 보여줘라."
            end
          )
        },
        {
          target: $stage_target,
          suggestion: $stage_suggestion_text
        }
      ],
      overall_comment: $overall_comment,
      guardrail_review: {
        was_needed: $guardrail_was_needed,
        was_triggered: $guardrail_was_triggered,
        correctness: $guardrail_correctness
      }
    }' > "$stub_file"

  cp "$stub_file" "$result_file"

  echo "Created $(relative_to_root "$stub_file")"
  echo "Created $(relative_to_root "$result_file") as derived reflection output for execution_mode=$execution_mode"
}

copy_input_snapshot() {
  local input_file="$1"
  cp "$input_file" "$OUTPUTS_DIR/input.json"
}

resolve_stage_result_file() {
  local stage="$1"
  local actual_file
  local stub_file

  actual_file="$(stage_result_path "$stage")"
  stub_file="$(stage_stub_path "$stage")"

  if [ -f "$actual_file" ]; then
    printf '%s\n' "$actual_file"
    return 0
  fi

  if [ -f "$stub_file" ]; then
    printf '%s\n' "$stub_file"
    return 0
  fi

  echo "Error: missing result for stage '$stage'." >&2
  echo "Expected either $actual_file or $stub_file" >&2
  exit 1
}

schema_for_stage() {
  case "$1" in
    state_loader)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "case_id": {
      "type": "string"
    },
    "user_state": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "profile_state": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "risk_preference": {
              "type": "string"
            },
            "decision_style": {
              "type": "string"
            },
            "top_priorities": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": ["risk_preference", "decision_style", "top_priorities"]
        },
        "situational_state": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "career_stage": {
              "type": "string"
            },
            "financial_pressure": {
              "type": "string"
            },
            "time_pressure": {
              "type": "string"
            },
            "emotional_state": {
              "type": "string"
            }
          },
          "required": ["career_stage", "financial_pressure", "time_pressure", "emotional_state"]
        },
        "memory_state": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "recent_similar_decisions": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "topic": {
                    "type": "string"
                  },
                  "selected_option": {
                    "type": "string"
                  },
                  "outcome_note": {
                    "type": "string"
                  }
                },
                "required": ["topic", "selected_option", "outcome_note"]
              }
            },
            "repeated_patterns": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "consistency_notes": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "required": ["recent_similar_decisions", "repeated_patterns", "consistency_notes"]
        }
      },
      "required": ["profile_state", "situational_state", "memory_state"]
    },
    "state_summary": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "decision_bias": {
          "type": "string"
        },
        "current_constraint": {
          "type": "string"
        },
        "agent_guidance": {
          "type": "string"
        }
      },
      "required": ["decision_bias", "current_constraint", "agent_guidance"]
    }
  },
  "required": ["case_id", "user_state", "state_summary"]
}
JSON
      ;;
    routing)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "case_id": {
      "type": "string"
    },
    "routing": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "complexity": {
          "type": "string",
          "enum": ["low", "medium", "high"]
        },
        "risk_level": {
          "type": "string",
          "enum": ["low", "medium", "high"]
        },
        "ambiguity": {
          "type": "string",
          "enum": ["low", "medium", "high"]
        },
        "execution_mode": {
          "type": "string",
          "enum": ["light", "standard", "careful", "full"]
        },
        "selected_path": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"]
          },
          "minItems": 2
        },
        "routing_reason": {
          "type": "string"
        }
      },
      "required": ["complexity", "risk_level", "ambiguity", "execution_mode", "selected_path", "routing_reason"]
    }
  },
  "required": ["case_id", "routing"]
}
JSON
      ;;
    planner)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "decision_type": {
      "type": "string"
    },
    "factors": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": ["decision_type", "factors"]
}
JSON
      ;;
    scenario)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "three_months": {
      "type": "string"
    },
    "one_year": {
      "type": "string"
    },
    "three_years": {
      "type": "string"
    }
  },
  "required": ["three_months", "one_year", "three_years"]
}
JSON
      ;;
    risk)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    },
    "reasons": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": ["risk_level", "reasons"]
}
JSON
      ;;
    reasoning)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "case_id": {
      "type": "string"
    },
    "input_summary": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "user_profile": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "age": {
              "type": "number"
            },
            "job": {
              "type": "string"
            },
            "risk_tolerance": {
              "type": "string",
              "enum": ["low", "medium", "high"]
            },
            "priority": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            }
          },
          "required": ["age", "job", "risk_tolerance", "priority"]
        },
        "decision_options": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "optionA": {
              "type": "string"
            },
            "optionB": {
              "type": "string"
            },
            "context": {
              "type": "string"
            }
          },
          "required": ["optionA", "optionB", "context"]
        },
        "planner_goal": {
          "type": "string"
        }
      },
      "required": ["user_profile", "decision_options", "planner_goal"]
    },
    "reasoning": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "a_reasoning": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "stance": {
              "type": "string"
            },
            "summary": {
              "type": "string"
            },
            "key_assumptions": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "pros": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "cons": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "recommended_option": {
              "type": "string",
              "enum": ["A", "B"]
            },
            "confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          },
          "required": ["stance", "summary", "key_assumptions", "pros", "cons", "recommended_option", "confidence"]
        },
        "b_reasoning": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "stance": {
              "type": "string"
            },
            "summary": {
              "type": "string"
            },
            "key_assumptions": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "pros": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "cons": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "recommended_option": {
              "type": "string",
              "enum": ["A", "B"]
            },
            "confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          },
          "required": ["stance", "summary", "key_assumptions", "pros", "cons", "recommended_option", "confidence"]
        },
        "comparison": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "agreements": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "conflicts": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1
            },
            "which_fits_user_better": {
              "type": "string",
              "enum": ["A", "B"]
            },
            "reason": {
              "type": "string"
            }
          },
          "required": ["agreements", "conflicts", "which_fits_user_better", "reason"]
        },
        "final_selection": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "selected_reasoning": {
              "type": "string",
              "enum": ["A", "B"]
            },
            "selected_option": {
              "type": "string",
              "enum": ["A", "B"]
            },
            "why_selected": {
              "type": "string"
            },
            "decision_confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            }
          },
          "required": ["selected_reasoning", "selected_option", "why_selected", "decision_confidence"]
        }
      },
      "required": ["a_reasoning", "b_reasoning", "comparison", "final_selection"]
    }
  },
  "required": ["case_id", "input_summary", "reasoning"]
}
JSON
      ;;
    guardrail)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "guardrail_triggered": {
      "type": "boolean"
    },
    "triggers": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["ambiguity_high", "reasoning_conflict", "low_confidence", "high_risk"]
      },
      "uniqueItems": true
    },
    "strategy": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["ask_more_info", "neutralize_decision", "soft_recommendation", "risk_warning"]
      },
      "uniqueItems": true
    },
    "final_mode": {
      "type": "string",
      "enum": ["normal", "cautious", "blocked"]
    }
  },
  "required": ["guardrail_triggered", "triggers", "strategy", "final_mode"]
}
JSON
      ;;
    advisor)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "decision": {
      "type": "string",
      "enum": ["A", "B", "undecided"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "reason": {
      "type": "string"
    },
    "guardrail_applied": {
      "type": "boolean"
    },
    "recommended_option": {
      "type": "string",
      "enum": ["A", "B", "undecided"]
    },
    "reasoning_basis": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "selected_reasoning": {
          "type": "string",
          "enum": ["A", "B", "undecided"]
        },
        "core_why": {
          "type": "string"
        },
        "decision_confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": ["selected_reasoning", "core_why", "decision_confidence"]
    }
  },
  "required": ["decision", "confidence", "reason", "guardrail_applied", "recommended_option", "reasoning_basis"]
}
JSON
      ;;
    reflection)
      cat <<'JSON'
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "evaluation": {
      "type": "string"
    },
    "scores": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "realism": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "consistency": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "profile_alignment": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "recommendation_clarity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        }
      },
      "required": ["realism", "consistency", "profile_alignment", "recommendation_clarity"]
    },
    "issues": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": ["scenario", "risk", "reasoning", "advisor", "profile"]
          },
          "description": {
            "type": "string"
          }
        },
        "required": ["type", "description"]
      }
    },
    "improvement_suggestions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "target": {
            "type": "string",
            "enum": ["planner", "scenario", "risk", "reasoning", "advisor"]
          },
          "suggestion": {
            "type": "string"
          }
        },
        "required": ["target", "suggestion"]
      }
    },
    "overall_comment": {
      "type": "string"
    },
    "guardrail_review": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "was_needed": {
          "type": "boolean"
        },
        "was_triggered": {
          "type": "boolean"
        },
        "correctness": {
          "type": "string",
          "enum": ["good", "over", "missing"]
        }
      },
      "required": ["was_needed", "was_triggered", "correctness"]
    }
  },
  "required": ["evaluation", "scores", "issues", "improvement_suggestions", "overall_comment", "guardrail_review"]
}
JSON
      ;;
    *)
      echo "Error: unknown schema stage '$1'" >&2
      exit 1
      ;;
  esac
}

write_request_preview() {
  local request_file="$1"
  local preview_file="$2"
  local title="$3"

  {
    printf '# %s\n\n' "$title"
    printf -- '- Request file: `%s`\n' "$(relative_to_root "$request_file")"
    printf -- '- Prompt file: `%s`\n' "$(jq -r '.prompt_file' "$request_file")"
    printf -- '- Input source: `%s`\n' "$(jq -r '.input_source' "$request_file")"

    if [ "$(jq '.previous_stage_result_files | length' "$request_file")" -gt 0 ]; then
      while IFS= read -r previous_file; do
        printf -- '- Previous result: `%s`\n' "$previous_file"
      done < <(jq -r '.previous_stage_result_files[]' "$request_file")
    else
      printf -- '- Previous result: `(none)`\n'
    fi

    printf '\n## Prompt\n\n```md\n%s\n```\n' "$(jq -r '.prompt_text' "$request_file")"
    printf '\n## Input JSON\n\n```json\n%s\n```\n' "$(jq -r '.input_json' "$request_file")"
    printf '\n## Expected Output Schema\n\n```json\n%s\n```\n' "$(jq '.expected_output_schema' "$request_file")"
    printf '\n## Provider Payload Preview\n\n```json\n%s\n```\n' "$(jq '.provider_payload' "$request_file")"
  } > "$preview_file"
}

normalize_inline_text() {
  tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
}

build_codex_exec_prompt() {
  local request_file="$1"
  local stage_name="$2"

  local prompt_text
  local input_json
  local expected_output_schema

  prompt_text="$(jq -r '.prompt_text' "$request_file")"
  input_json="$(jq -r '.input_json' "$request_file")"
  expected_output_schema="$(jq '.expected_output_schema' "$request_file")"

  cat <<EOF
You are executing the "${stage_name}" stage of a structured decision-simulation pipeline.

Follow the stage prompt exactly.
Return only valid JSON matching the expected output schema.
Do not wrap the output in markdown.
Do not add explanations, notes, or prose outside the JSON object.

[Stage Prompt]
$prompt_text

[Input JSON]
$input_json

[Expected Output Schema]
$expected_output_schema
EOF
}

validate_stage_result() {
  local stage_type="$1"
  local result_file="$2"

  if ! jq empty "$result_file" >/dev/null 2>&1; then
    echo "Error: stage '$stage_type' returned invalid JSON: $result_file" >&2
    exit 1
  fi

  case "$stage_type" in
    state_loader)
      jq -e '
        type == "object" and
        ((keys | sort) == ["case_id", "state_summary", "user_state"]) and
        (.case_id | type == "string" and length > 0) and
        (.user_state | type == "object") and
        ((.user_state | keys | sort) == ["memory_state", "profile_state", "situational_state"]) and
        (.user_state.profile_state | type == "object") and
        ((.user_state.profile_state | keys | sort) == ["decision_style", "risk_preference", "top_priorities"]) and
        (.user_state.profile_state.risk_preference | type == "string" and length > 0) and
        (.user_state.profile_state.decision_style | type == "string" and length > 0) and
        (.user_state.profile_state.top_priorities | type == "array" and all(.[]; type == "string")) and
        (.user_state.situational_state | type == "object") and
        ((.user_state.situational_state | keys | sort) == ["career_stage", "emotional_state", "financial_pressure", "time_pressure"]) and
        (.user_state.situational_state.career_stage | type == "string" and length > 0) and
        (.user_state.situational_state.financial_pressure | type == "string" and length > 0) and
        (.user_state.situational_state.time_pressure | type == "string" and length > 0) and
        (.user_state.situational_state.emotional_state | type == "string" and length > 0) and
        (.user_state.memory_state | type == "object") and
        ((.user_state.memory_state | keys | sort) == ["consistency_notes", "recent_similar_decisions", "repeated_patterns"]) and
        (.user_state.memory_state.recent_similar_decisions | type == "array" and all(.[]; type == "object" and ((keys | sort) == ["outcome_note", "selected_option", "topic"]) and (.topic | type == "string" and length > 0) and (.selected_option | type == "string" and length > 0) and (.outcome_note | type == "string" and length > 0))) and
        (.user_state.memory_state.repeated_patterns | type == "array" and all(.[]; type == "string" and length > 0)) and
        (.user_state.memory_state.consistency_notes | type == "array" and all(.[]; type == "string" and length > 0)) and
        (.state_summary | type == "object") and
        ((.state_summary | keys | sort) == ["agent_guidance", "current_constraint", "decision_bias"]) and
        (.state_summary.decision_bias | type == "string" and length > 0) and
        (.state_summary.current_constraint | type == "string" and length > 0) and
        (.state_summary.agent_guidance | type == "string" and length > 0)
      ' "$result_file" >/dev/null
      ;;
    routing)
      jq -e '
        type == "object" and
        ((keys | sort) == ["case_id", "routing"]) and
        (.case_id | type == "string" and length > 0) and
        (.routing | type == "object") and
        ((.routing | keys | sort) == ["ambiguity", "complexity", "execution_mode", "risk_level", "routing_reason", "selected_path"]) and
        (.routing.complexity | IN("low", "medium", "high")) and
        (.routing.risk_level | IN("low", "medium", "high")) and
        (.routing.ambiguity | IN("low", "medium", "high")) and
        (.routing.execution_mode | IN("light", "standard", "careful", "full")) and
        (.routing.selected_path | type == "array" and length >= 2 and all(.[]; IN("planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"))) and
        (.routing.routing_reason | type == "string" and length > 0) and
        (
          .routing.selected_path ==
          (if .routing.execution_mode == "light" then ["planner", "advisor"]
           elif .routing.execution_mode == "standard" then ["planner", "scenario", "advisor"]
           elif .routing.execution_mode == "careful" then ["planner", "scenario", "risk", "advisor"]
           else ["planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"]
           end)
        )
      ' "$result_file" >/dev/null
      ;;
    planner)
      jq -e '
        type == "object" and
        ((keys | sort) == ["decision_type", "factors"]) and
        (.decision_type | type == "string" and length > 0) and
        (.factors | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0))
      ' "$result_file" >/dev/null
      ;;
    scenario)
      jq -e '
        type == "object" and
        ((keys | sort) == ["one_year", "three_months", "three_years"]) and
        (.three_months | type == "string" and length > 0) and
        (.one_year | type == "string" and length > 0) and
        (.three_years | type == "string" and length > 0)
      ' "$result_file" >/dev/null
      ;;
    risk)
      jq -e '
        type == "object" and
        ((keys | sort) == ["reasons", "risk_level"]) and
        (.risk_level | IN("low", "medium", "high")) and
        (.reasons | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0))
      ' "$result_file" >/dev/null
      ;;
    reasoning)
      jq -e '
        type == "object" and
        ((keys | sort) == ["case_id", "input_summary", "reasoning"]) and
        (.case_id | type == "string" and length > 0) and
        (.input_summary | type == "object") and
        ((.input_summary | keys | sort) == ["decision_options", "planner_goal", "user_profile"]) and
        (.input_summary.user_profile | type == "object") and
        ((.input_summary.user_profile | keys | sort) == ["age", "job", "priority", "risk_tolerance"]) and
        (.input_summary.user_profile.age | type == "number") and
        (.input_summary.user_profile.job | type == "string" and length > 0) and
        (.input_summary.user_profile.risk_tolerance | IN("low", "medium", "high")) and
        (.input_summary.user_profile.priority | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
        (.input_summary.decision_options | type == "object") and
        ((.input_summary.decision_options | keys | sort) == ["context", "optionA", "optionB"]) and
        (.input_summary.decision_options.optionA | type == "string" and length > 0) and
        (.input_summary.decision_options.optionB | type == "string" and length > 0) and
        (.input_summary.decision_options.context | type == "string" and length > 0) and
        (.input_summary.planner_goal | type == "string" and length > 0) and
        (.reasoning | type == "object") and
        ((.reasoning | keys | sort) == ["a_reasoning", "b_reasoning", "comparison", "final_selection"]) and
        ([.reasoning.a_reasoning, .reasoning.b_reasoning] | all(
          .[];
          ((keys | sort) == ["confidence", "cons", "key_assumptions", "pros", "recommended_option", "stance", "summary"]) and
          (.stance | type == "string" and length > 0) and
          (.summary | type == "string" and length > 0) and
          (.key_assumptions | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
          (.pros | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
          (.cons | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
          (.recommended_option | IN("A", "B")) and
          (.confidence | type == "number" and . >= 0 and . <= 1)
        )) and
        (.reasoning.comparison | type == "object") and
        ((.reasoning.comparison | keys | sort) == ["agreements", "conflicts", "reason", "which_fits_user_better"]) and
        (.reasoning.comparison.agreements | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
        (.reasoning.comparison.conflicts | type == "array" and length >= 1 and all(.[]; type == "string" and length > 0)) and
        (.reasoning.comparison.which_fits_user_better | IN("A", "B")) and
        (.reasoning.comparison.reason | type == "string" and length > 0) and
        (.reasoning.final_selection | type == "object") and
        ((.reasoning.final_selection | keys | sort) == ["decision_confidence", "selected_option", "selected_reasoning", "why_selected"]) and
        (.reasoning.final_selection.selected_reasoning | IN("A", "B")) and
        (.reasoning.final_selection.selected_option | IN("A", "B")) and
        (.reasoning.final_selection.why_selected | type == "string" and length > 0) and
        (.reasoning.final_selection.decision_confidence | type == "number" and . >= 0 and . <= 1)
      ' "$result_file" >/dev/null
      ;;
    guardrail)
      jq -e '
        type == "object" and
        ((keys | sort) == ["final_mode", "guardrail_triggered", "strategy", "triggers"]) and
        (.guardrail_triggered | type == "boolean") and
        (.triggers | type == "array" and all(.[]; IN("ambiguity_high", "reasoning_conflict", "low_confidence", "high_risk"))) and
        (.strategy | type == "array" and all(.[]; IN("ask_more_info", "neutralize_decision", "soft_recommendation", "risk_warning"))) and
        (.final_mode | IN("normal", "cautious", "blocked")) and
        ((.guardrail_triggered == false and (.triggers | length) == 0 and (.strategy | length) == 0 and .final_mode == "normal") or .guardrail_triggered == true)
      ' "$result_file" >/dev/null
      ;;
    advisor)
      jq -e '
        type == "object" and
        ((keys | sort) == ["confidence", "decision", "guardrail_applied", "reason", "reasoning_basis", "recommended_option"]) and
        (.decision | IN("A", "B", "undecided")) and
        (.confidence | type == "number" and . >= 0 and . <= 1) and
        (.reason | type == "string" and length > 0) and
        (.guardrail_applied | type == "boolean") and
        (.recommended_option | IN("A", "B", "undecided")) and
        (.reasoning_basis | type == "object") and
        ((.reasoning_basis | keys | sort) == ["core_why", "decision_confidence", "selected_reasoning"]) and
        (.reasoning_basis.selected_reasoning | IN("A", "B", "undecided")) and
        (.reasoning_basis.core_why | type == "string" and length > 0) and
        (.reasoning_basis.decision_confidence | type == "number" and . >= 0 and . <= 1) and
        (.recommended_option == .decision) and
        (.confidence == .reasoning_basis.decision_confidence)
      ' "$result_file" >/dev/null
      ;;
    reflection)
      jq -e '
        type == "object" and
        ((keys | sort) == ["evaluation", "guardrail_review", "improvement_suggestions", "issues", "overall_comment", "scores"]) and
        (.evaluation | type == "string" and length > 0) and
        (.scores | type == "object") and
        ((.scores | keys | sort) == ["consistency", "profile_alignment", "realism", "recommendation_clarity"]) and
        ([.scores[]] | all(.[]; type == "number" and floor == . and . >= 1 and . <= 5)) and
        (.issues | type == "array" and length >= 1 and all(.[]; type == "object" and ((keys | sort) == ["description", "type"]) and (.type | IN("scenario", "risk", "reasoning", "advisor", "profile")) and (.description | type == "string" and length > 0))) and
        (.improvement_suggestions | type == "array" and length >= 1 and all(.[]; type == "object" and ((keys | sort) == ["suggestion", "target"]) and (.target | IN("planner", "scenario", "risk", "reasoning", "advisor")) and (.suggestion | type == "string" and length > 0))) and
        (.overall_comment | type == "string" and length > 0) and
        (.guardrail_review | type == "object") and
        ((.guardrail_review | keys | sort) == ["correctness", "was_needed", "was_triggered"]) and
        (.guardrail_review.was_needed | type == "boolean") and
        (.guardrail_review.was_triggered | type == "boolean") and
        (.guardrail_review.correctness | IN("good", "over", "missing"))
      ' "$result_file" >/dev/null
      ;;
    *)
      echo "Error: unknown stage type '$stage_type' for validation." >&2
      exit 1
      ;;
  esac
}

run_codex_for_request() {
  local stage_type="$1"
  local stage_name="$2"
  local request_file="$3"
  local result_file="$4"

  require_codex

  local exec_prompt_file
  local tmp_result_file
  local raw_output_file
  local model
  local reasoning_effort

  exec_prompt_file="$(mktemp)"
  tmp_result_file="$(mktemp)"
  raw_output_file="${result_file%.json}.raw.txt"
  model="${CODEX_MODEL:-}"
  reasoning_effort="${CODEX_REASONING_EFFORT:-high}"

  build_codex_exec_prompt "$request_file" "$stage_name" > "$exec_prompt_file"

  echo "Running live Codex execution for $(relative_to_root "$request_file")"

  local -a cmd=(
    codex
    -c "model_reasoning_effort=\"${reasoning_effort}\""
    -c "mcp_servers={}"
    exec
    -
    --skip-git-repo-check
    -C "$REPO_ROOT"
    -s read-only
    --color never
    --output-last-message "$tmp_result_file"
  )

  if [ -n "$model" ]; then
    cmd+=(-m "$model")
  fi

  if ! "${cmd[@]}" < "$exec_prompt_file"; then
    rm -f "$exec_prompt_file" "$tmp_result_file"
    echo "Error: codex exec failed for stage '$stage_name'." >&2
    exit 1
  fi

  rm -f "$exec_prompt_file"

  if ! jq empty "$tmp_result_file" >/dev/null 2>&1; then
    mv "$tmp_result_file" "$raw_output_file"
    echo "Error: Codex returned non-JSON output for stage '$stage_name'." >&2
    echo "Saved raw output to $(relative_to_root "$raw_output_file")" >&2
    exit 1
  fi

  validate_stage_result "$stage_type" "$tmp_result_file"
  mv "$tmp_result_file" "$result_file"
  rm -f "$raw_output_file"

  echo "Created $(relative_to_root "$result_file")"
}

write_case_summary() {
  local input_file="${1:-$OUTPUTS_DIR/input.json}"
  local state_context_file
  local routing_file=""
  local routing_complexity
  local routing_risk_level
  local routing_ambiguity
  local routing_reason
  local execution_mode
  local selected_path_json
  local selected_path_text
  local summary_file
  local planner_file
  local scenario_a_file=""
  local scenario_b_file=""
  local risk_a_file=""
  local risk_b_file=""
  local reasoning_file=""
  local guardrail_file=""
  local advisor_file
  local reflection_file=""
  local case_id

  require_jq

  if [ ! -f "$input_file" ]; then
    echo "Error: summary input file not found: $input_file" >&2
    exit 1
  fi

  summary_file="$(summary_path)"
  case_id="$(case_id_from_output_dir "$OUTPUTS_DIR")"
  state_context_file="$(state_context_path)"

  if [ ! -f "$state_context_file" ]; then
    echo "Error: state context file not found: $state_context_file" >&2
    exit 1
  fi

  if routing_file="$(optional_stage_result_file "routing" 2>/dev/null)"; then
    execution_mode="$(jq -r '.routing.execution_mode' "$routing_file")"
    selected_path_json="$(jq -c '.routing.selected_path' "$routing_file")"
    routing_complexity="$(jq -r '.routing.complexity' "$routing_file")"
    routing_risk_level="$(jq -r '.routing.risk_level' "$routing_file")"
    routing_ambiguity="$(jq -r '.routing.ambiguity' "$routing_file")"
    routing_reason="$(jq -r '.routing.routing_reason' "$routing_file" | normalize_inline_text)"
  else
    execution_mode="$(infer_execution_mode_from_artifacts)"
    selected_path_json="$(selected_path_json_for_mode "$execution_mode")"
    routing_complexity="n/a"
    routing_risk_level="n/a"
    routing_ambiguity="n/a"
    routing_reason="router 결과가 없어 현재 아티팩트 기준으로 execution_mode=${execution_mode} 경로를 추정했다."
  fi

  selected_path_text="$(printf '%s' "$selected_path_json" | jq -r 'join(" -> ")')"
  planner_file="$(resolve_stage_result_file "planner")"
  advisor_file="$(resolve_stage_result_file "advisor")"

  if stage_enabled_in_selected_path "$selected_path_json" "scenario"; then
    scenario_a_file="$(resolve_stage_result_file "scenario-a")"
    scenario_b_file="$(resolve_stage_result_file "scenario-b")"
  fi

  if stage_enabled_in_selected_path "$selected_path_json" "risk"; then
    risk_a_file="$(resolve_stage_result_file "risk-a")"
    risk_b_file="$(resolve_stage_result_file "risk-b")"
  fi

  if stage_enabled_in_selected_path "$selected_path_json" "ab_reasoning"; then
    reasoning_file="$(resolve_stage_result_file "reasoning")"
  fi

  if guardrail_file="$(optional_stage_result_file "guardrail" 2>/dev/null)"; then
    guardrail_file="$(resolve_stage_result_file "guardrail")"
  fi

  if reflection_file="$(optional_stage_result_file "reflection" 2>/dev/null)"; then
    reflection_file="$(resolve_stage_result_file "reflection")"
  fi

  {
    printf '# %s\n\n' "$case_id"
    printf -- '- Case ID: `%s`\n' "$case_id"
    printf -- '- Input snapshot: `%s`\n' "$(relative_to_root "$input_file")"
    printf -- '- Output directory: `%s`\n' "$(relative_to_root "$OUTPUTS_DIR")"

    printf '\n## Input Summary\n\n'
    printf -- '- Profile: age %s, job %s, risk tolerance %s\n' \
      "$(jq -r '.userProfile.age' "$input_file")" \
      "$(jq -r '.userProfile.job' "$input_file")" \
      "$(jq -r '.userProfile.risk_tolerance' "$input_file")"
    printf -- '- Priority: %s\n' "$(jq -r '.userProfile.priority | join(", ")' "$input_file")"
    printf -- '- Option A: %s\n' "$(jq -r '.decision.optionA' "$input_file")"
    printf -- '- Option B: %s\n' "$(jq -r '.decision.optionB' "$input_file")"
    printf -- '- Context: %s\n' "$(jq -r '.decision.context' "$input_file" | normalize_inline_text)"

    printf '\n## State Context\n\n'
    printf '### Profile State\n\n'
    printf -- '- risk_preference: %s\n' "$(jq -r '.user_state.profile_state.risk_preference' "$state_context_file")"
    printf -- '- decision_style: %s\n' "$(jq -r '.user_state.profile_state.decision_style' "$state_context_file")"
    printf -- '- top_priorities: %s\n' "$(jq -r 'if (.user_state.profile_state.top_priorities | length) > 0 then .user_state.profile_state.top_priorities | join(", ") else "none" end' "$state_context_file")"

    printf '\n### Situational State\n\n'
    printf -- '- career_stage: %s\n' "$(jq -r '.user_state.situational_state.career_stage' "$state_context_file")"
    printf -- '- financial_pressure: %s\n' "$(jq -r '.user_state.situational_state.financial_pressure' "$state_context_file")"
    printf -- '- time_pressure: %s\n' "$(jq -r '.user_state.situational_state.time_pressure' "$state_context_file")"
    printf -- '- emotional_state: %s\n' "$(jq -r '.user_state.situational_state.emotional_state' "$state_context_file")"

    printf '\n### Memory State\n\n'
    if [ "$(jq '.user_state.memory_state.recent_similar_decisions | length' "$state_context_file")" -gt 0 ]; then
      while IFS= read -r memory_item; do
        printf -- '- recent_similar_decisions: %s\n' "$memory_item"
      done < <(jq -r '.user_state.memory_state.recent_similar_decisions[] | "topic=\(.topic) / selected_option=\(.selected_option) / outcome_note=\(.outcome_note | gsub("[\\r\\n]+"; " "))"' "$state_context_file")
    else
      printf -- '- recent_similar_decisions: none\n'
    fi

    if [ "$(jq '.user_state.memory_state.repeated_patterns | length' "$state_context_file")" -gt 0 ]; then
      while IFS= read -r pattern; do
        printf -- '- repeated_patterns: %s\n' "$pattern"
      done < <(jq -r '.user_state.memory_state.repeated_patterns[]' "$state_context_file")
    else
      printf -- '- repeated_patterns: none\n'
    fi

    if [ "$(jq '.user_state.memory_state.consistency_notes | length' "$state_context_file")" -gt 0 ]; then
      while IFS= read -r note; do
        printf -- '- consistency_notes: %s\n' "$note"
      done < <(jq -r '.user_state.memory_state.consistency_notes[]' "$state_context_file")
    else
      printf -- '- consistency_notes: none\n'
    fi

    printf '\n### State Summary\n\n'
    printf -- '- decision_bias: %s\n' "$(jq -r '.state_summary.decision_bias' "$state_context_file" | normalize_inline_text)"
    printf -- '- current_constraint: %s\n' "$(jq -r '.state_summary.current_constraint' "$state_context_file" | normalize_inline_text)"
    printf -- '- agent_guidance: %s\n' "$(jq -r '.state_summary.agent_guidance' "$state_context_file" | normalize_inline_text)"

    printf '\n## Routing\n\n'
    printf -- '- complexity: %s\n' "$routing_complexity"
    printf -- '- risk_level: %s\n' "$routing_risk_level"
    printf -- '- ambiguity: %s\n' "$routing_ambiguity"
    printf -- '- execution_mode: %s\n' "$execution_mode"
    printf -- '- selected_path: %s\n' "$selected_path_text"
    printf -- '- reason: %s\n' "$routing_reason"

    printf '\n## Planner\n\n'
    printf -- '- Decision type: %s\n' "$(jq -r '.decision_type' "$planner_file")"
    printf -- '- Factors: %s\n' "$(jq -r '.factors | join(", ")' "$planner_file")"

    printf '\n## Scenario A\n\n'
    if [ -n "$scenario_a_file" ]; then
      printf -- '- 3 months: %s\n' "$(jq -r '.three_months' "$scenario_a_file" | normalize_inline_text)"
      printf -- '- 1 year: %s\n' "$(jq -r '.one_year' "$scenario_a_file" | normalize_inline_text)"
      printf -- '- 3 years: %s\n' "$(jq -r '.three_years' "$scenario_a_file" | normalize_inline_text)"
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## Scenario B\n\n'
    if [ -n "$scenario_b_file" ]; then
      printf -- '- 3 months: %s\n' "$(jq -r '.three_months' "$scenario_b_file" | normalize_inline_text)"
      printf -- '- 1 year: %s\n' "$(jq -r '.one_year' "$scenario_b_file" | normalize_inline_text)"
      printf -- '- 3 years: %s\n' "$(jq -r '.three_years' "$scenario_b_file" | normalize_inline_text)"
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## Risk A\n\n'
    if [ -n "$risk_a_file" ]; then
      printf -- '- Level: %s\n' "$(jq -r '.risk_level' "$risk_a_file")"
      while IFS= read -r reason; do
        printf -- '- %s\n' "$reason"
      done < <(jq -r '.reasons[]' "$risk_a_file")
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## Risk B\n\n'
    if [ -n "$risk_b_file" ]; then
      printf -- '- Level: %s\n' "$(jq -r '.risk_level' "$risk_b_file")"
      while IFS= read -r reason; do
        printf -- '- %s\n' "$reason"
      done < <(jq -r '.reasons[]' "$risk_b_file")
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## A/B Reasoning\n\n'
    if [ -n "$reasoning_file" ]; then
      printf '### A Reasoning\n\n'
      printf -- '- stance: %s\n' "$(jq -r '.reasoning.a_reasoning.stance' "$reasoning_file")"
      printf -- '- recommended option: %s\n' "$(jq -r '.reasoning.a_reasoning.recommended_option' "$reasoning_file")"
      printf -- '- summary: %s\n' "$(jq -r '.reasoning.a_reasoning.summary' "$reasoning_file" | normalize_inline_text)"

      printf '\n### B Reasoning\n\n'
      printf -- '- stance: %s\n' "$(jq -r '.reasoning.b_reasoning.stance' "$reasoning_file")"
      printf -- '- recommended option: %s\n' "$(jq -r '.reasoning.b_reasoning.recommended_option' "$reasoning_file")"
      printf -- '- summary: %s\n' "$(jq -r '.reasoning.b_reasoning.summary' "$reasoning_file" | normalize_inline_text)"

      printf '\n### Comparison\n\n'
      printf -- '- agreements: %s\n' "$(jq -r '.reasoning.comparison.agreements | join("; ")' "$reasoning_file" | normalize_inline_text)"
      printf -- '- conflicts: %s\n' "$(jq -r '.reasoning.comparison.conflicts | join("; ")' "$reasoning_file" | normalize_inline_text)"
      printf -- '- which fits user better: %s\n' "$(jq -r '.reasoning.comparison.which_fits_user_better' "$reasoning_file")"
      printf -- '- reason: %s\n' "$(jq -r '.reasoning.comparison.reason' "$reasoning_file" | normalize_inline_text)"

      printf '\n### Final Selection\n\n'
      printf -- '- selected reasoning: %s\n' "$(jq -r '.reasoning.final_selection.selected_reasoning' "$reasoning_file")"
      printf -- '- selected option: %s\n' "$(jq -r '.reasoning.final_selection.selected_option' "$reasoning_file")"
      printf -- '- why selected: %s\n' "$(jq -r '.reasoning.final_selection.why_selected' "$reasoning_file" | normalize_inline_text)"
      printf -- '- decision confidence: %s\n' "$(jq -r '.reasoning.final_selection.decision_confidence' "$reasoning_file")"
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## Guardrail\n\n'
    if [ -n "$guardrail_file" ]; then
      printf -- '- guardrail_triggered: %s\n' "$(jq -r '.guardrail_triggered' "$guardrail_file")"
      printf -- '- triggers: %s\n' "$(jq -r 'if (.triggers | length) > 0 then .triggers | join(", ") else "none" end' "$guardrail_file")"
      printf -- '- strategy: %s\n' "$(jq -r 'if (.strategy | length) > 0 then .strategy | join(", ") else "none" end' "$guardrail_file")"
      printf -- '- final_mode: %s\n' "$(jq -r '.final_mode' "$guardrail_file")"
      if [ -n "$reflection_file" ]; then
        printf -- '- guardrail correctness: %s\n' "$(jq -r '.guardrail_review.correctness' "$reflection_file")"
      fi
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi

    printf '\n## Advisor\n\n'
    printf -- '- Decision: %s\n' "$(jq -r '.decision' "$advisor_file")"
    printf -- '- Confidence: %s\n' "$(jq -r '.confidence' "$advisor_file")"
    printf -- '- Guardrail applied: %s\n' "$(jq -r '.guardrail_applied' "$advisor_file")"
    printf -- '- Recommended option: %s\n' "$(jq -r '.recommended_option' "$advisor_file")"
    printf -- '- Reason: %s\n' "$(jq -r '.reason' "$advisor_file" | normalize_inline_text)"
    printf -- '- Reasoning basis: reasoning %s / confidence %s / %s\n' \
      "$(jq -r '.reasoning_basis.selected_reasoning' "$advisor_file")" \
      "$(jq -r '.reasoning_basis.decision_confidence' "$advisor_file")" \
      "$(jq -r '.reasoning_basis.core_why' "$advisor_file" | normalize_inline_text)"

    printf '\n## Reflection\n\n'
    if [ -n "$reflection_file" ]; then
      printf -- '- evaluation: %s\n' "$(jq -r '.evaluation' "$reflection_file" | normalize_inline_text)"
      printf -- '- realism: %s\n' "$(jq -r '.scores.realism' "$reflection_file")"
      printf -- '- consistency: %s\n' "$(jq -r '.scores.consistency' "$reflection_file")"
      printf -- '- profile_alignment: %s\n' "$(jq -r '.scores.profile_alignment' "$reflection_file")"
      printf -- '- recommendation_clarity: %s\n' "$(jq -r '.scores.recommendation_clarity' "$reflection_file")"
      printf -- '- guardrail_review: needed=%s / triggered=%s / correctness=%s\n' \
        "$(jq -r '.guardrail_review.was_needed' "$reflection_file")" \
        "$(jq -r '.guardrail_review.was_triggered' "$reflection_file")" \
        "$(jq -r '.guardrail_review.correctness' "$reflection_file")"

      printf '\n### 주요 문제\n\n'
      while IFS= read -r issue; do
        printf -- '- %s\n' "$issue"
      done < <(jq -r '.issues[] | "[\(.type)] \(.description | gsub("[\\r\\n]+"; " "))"' "$reflection_file")

      printf '\n### 개선 방향\n\n'
      while IFS= read -r suggestion; do
        printf -- '- %s\n' "$suggestion"
      done < <(jq -r '.improvement_suggestions[] | "[\(.target)] \(.suggestion | gsub("[\\r\\n]+"; " "))"' "$reflection_file")

      printf '\n- Overall comment: %s\n' "$(jq -r '.overall_comment | gsub("[\\r\\n]+"; " ")' "$reflection_file")"
    else
      printf -- '- Skipped in execution_mode=%s\n' "$execution_mode"
    fi
  } > "$summary_file"

  echo "Created $(relative_to_root "$summary_file")"
}

write_guardrail_verification_summary() {
  local summary_file
  local total_cases=0
  local normal_cases=0
  local cautious_cases=0
  local blocked_cases=0
  local good_cases=0
  local over_cases=0
  local missing_cases=0
  local case_dir
  local case_id
  local guardrail_file
  local advisor_file
  local reflection_file
  local case_summary_file
  local final_mode
  local guardrail_triggered
  local decision
  local recommended_option
  local guardrail_applied
  local confidence
  local reason
  local correctness
  local failure_text
  local -a case_summary_lines=()
  local -a failure_lines=()
  local -a case_failures=()

  require_jq

  summary_file="$(aggregate_summary_path)"

  while IFS= read -r case_dir; do
    case_id="$(basename "$case_dir")"
    guardrail_file="$case_dir/guardrail-result.json"
    advisor_file="$case_dir/advisor-result.json"
    reflection_file="$case_dir/reflection-result.json"
    case_summary_file="$case_dir/summary.md"
    case_failures=()

    if [ ! -f "$guardrail_file" ] && [ -f "$case_dir/guardrail-result.stub.json" ]; then
      guardrail_file="$case_dir/guardrail-result.stub.json"
    fi

    if [ ! -f "$advisor_file" ] && [ -f "$case_dir/advisor-result.stub.json" ]; then
      advisor_file="$case_dir/advisor-result.stub.json"
    fi

    if [ ! -f "$reflection_file" ] && [ -f "$case_dir/reflection-result.stub.json" ]; then
      reflection_file="$case_dir/reflection-result.stub.json"
    fi

    if [ ! -f "$guardrail_file" ] || [ ! -f "$advisor_file" ] || [ ! -f "$reflection_file" ]; then
      failure_text=""

      if [ ! -f "$guardrail_file" ]; then
        failure_text="missing guardrail-result.json"
      fi

      if [ ! -f "$advisor_file" ]; then
        if [ -n "$failure_text" ]; then
          failure_text="$failure_text; "
        fi
        failure_text="${failure_text}missing advisor-result.json"
      fi

      if [ ! -f "$reflection_file" ]; then
        if [ -n "$failure_text" ]; then
          failure_text="$failure_text; "
        fi
        failure_text="${failure_text}missing reflection-result.json"
        missing_cases=$((missing_cases + 1))
      fi

      total_cases=$((total_cases + 1))
      case_summary_lines+=("- ${case_id}: \`$(relative_to_root "$case_summary_file")\`")
      failure_lines+=("- ${case_id}: ${failure_text}")
      continue
    fi

    total_cases=$((total_cases + 1))
    case_summary_lines+=("- ${case_id}: \`$(relative_to_root "$case_summary_file")\`")

    final_mode="$(jq -r '.final_mode' "$guardrail_file")"
    guardrail_triggered="$(jq -r '.guardrail_triggered' "$guardrail_file")"
    decision="$(jq -r '.decision' "$advisor_file")"
    recommended_option="$(jq -r '.recommended_option' "$advisor_file")"
    guardrail_applied="$(jq -r '.guardrail_applied' "$advisor_file")"
    confidence="$(jq -r '.confidence' "$advisor_file")"
    reason="$(jq -r '.reason' "$advisor_file")"
    correctness="$(jq -r '.guardrail_review.correctness' "$reflection_file")"

    case "$final_mode" in
      normal)
        normal_cases=$((normal_cases + 1))
        ;;
      cautious)
        cautious_cases=$((cautious_cases + 1))
        ;;
      blocked)
        blocked_cases=$((blocked_cases + 1))
        ;;
    esac

    case "$correctness" in
      good)
        good_cases=$((good_cases + 1))
        ;;
      over)
        over_cases=$((over_cases + 1))
        ;;
      missing)
        missing_cases=$((missing_cases + 1))
        ;;
    esac

    case "$final_mode" in
      blocked)
        if [ "$decision" != "undecided" ] || [ "$recommended_option" != "undecided" ]; then
          case_failures+=("blocked인데 recommendation이 undecided가 아님")
        fi
        if [ "$guardrail_applied" != "true" ]; then
          case_failures+=("blocked인데 advisor에 guardrail_applied=true가 아님")
        fi
        if [[ ! "$reason" =~ 추가[[:space:]]정보|결론[[:space:]]보류|결론을[[:space:]]내리지[[:space:]]않는다|보류|정리하기[[:space:]]어렵 ]]; then
          case_failures+=("blocked reason에 추가 정보 필요 또는 결론 보류 의미가 부족함")
        fi
        ;;
      cautious)
        if [ "$guardrail_applied" != "true" ]; then
          case_failures+=("cautious인데 advisor에 guardrail_applied=true가 아님")
        fi
        if [ "$(jq -rn --argjson confidence "$confidence" '$confidence > 0.75')" = "true" ]; then
          case_failures+=("cautious인데 confidence가 과도하게 높음")
        fi
        if [[ ! "$reason" =~ risk|위험|불확실|조심 ]]; then
          case_failures+=("cautious reason에 risk 또는 uncertainty 반영이 약함")
        fi
        ;;
      normal)
        if [ "$decision" = "undecided" ] || [ "$recommended_option" = "undecided" ]; then
          case_failures+=("normal인데 undecided 출력이 포함됨")
        fi
        if [[ "$reason" =~ ask_more_info|추가[[:space:]]정보|결론[[:space:]]보류|조심스럽게 ]]; then
          case_failures+=("normal인데 과도하게 보수적인 reason이 포함됨")
        fi
        ;;
    esac

    if [ "$correctness" != "good" ]; then
      case_failures+=("guardrail correctness=${correctness}")
    fi

    if [ "${#case_failures[@]}" -gt 0 ]; then
      failure_text=""
      for reason in "${case_failures[@]}"; do
        if [ -n "$failure_text" ]; then
          failure_text="$failure_text; "
        fi
        failure_text="${failure_text}${reason}"
      done
      failure_lines+=("- ${case_id}: ${failure_text}")
    fi
  done < <(find "$OUTPUTS_ROOT_DIR" -maxdepth 1 -mindepth 1 -type d -name 'case-*' | sort)

  {
    printf '# Playground Outputs\n\n'
    printf -- '- generated_at: %s\n' "$(timestamp_utc)"

    printf '\n## Case Summaries\n\n'
    if [ "${#case_summary_lines[@]}" -gt 0 ]; then
      printf '%s\n' "${case_summary_lines[@]}"
    else
      printf -- '- none\n'
    fi

    printf '\n## Guardrail Verification Summary\n\n'
    printf -- '- total cases: %s\n' "$total_cases"
    printf -- '- normal cases: %s\n' "$normal_cases"
    printf -- '- cautious cases: %s\n' "$cautious_cases"
    printf -- '- blocked cases: %s\n' "$blocked_cases"
    printf -- '- good: %s\n' "$good_cases"
    printf -- '- over: %s\n' "$over_cases"
    printf -- '- missing: %s\n' "$missing_cases"

    printf '\n### Failure Cases\n\n'
    if [ "${#failure_lines[@]}" -gt 0 ]; then
      printf '%s\n' "${failure_lines[@]}"
    else
      printf -- '- none\n'
    fi
  } > "$summary_file"

  echo "Created $(relative_to_root "$summary_file")"
}
