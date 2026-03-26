# State Loader Request Preview

- Request file: `playground/outputs/case-08-smallbiz-vs-employment/state-loader-request.json`
- Prompt file: `prompts/state_loader.md`
- Input source: `playground/inputs/cases/case-08-smallbiz-vs-employment.json`
- Previous result: `(none)`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 State Loader다.

역할:
- 판단이나 추천을 하지 않는다.
- 입력 케이스에 있는 사용자 정보, 현재 상황 힌트, prior_memory를 구조화해 공통 상태 컨텍스트만 만든다.
- downstream agent가 그대로 재사용할 수 있게 일관된 기본값을 채운다.

입력 데이터 형식:
```json
{
  "caseId": "case-001",
  "caseInput": {
    "userProfile": {
      "age": 32,
      "job": "developer",
      "risk_tolerance": "low",
      "priority": ["stability", "income", "health"]
    },
    "decision": {
      "optionA": "현재 회사에 남는다",
      "optionB": "스타트업으로 이직한다",
      "context": "현재 연봉은 안정적이지만 성장 정체를 느낌"
    },
    "prior_memory": {
      "recent_similar_decisions": [
        {
          "topic": "job_change",
          "selected_option": "stay",
          "outcome_note": "felt safe but regretted slow growth"
        }
      ],
      "repeated_patterns": [
        "tends to avoid risk under uncertainty"
      ],
      "consistency_notes": [
        "current recommendation should explain stability-growth tradeoff"
      ]
    },
    "state_hints": {
      "profile_state": {
        "decision_style": "deliberate"
      },
      "situational_state": {
        "financial_pressure": "medium",
        "time_pressure": "high",
        "emotional_state": "uncertain"
      }
    }
  }
}
```

구성 규칙:
- `profile_state`는 잘 변하지 않는 장기 성향만 정리한다.
- `situational_state`는 현재 제약과 상황 중심으로 정리한다.
- `memory_state`는 이전 판단 패턴, 후회 패턴, 반복 행동만 정리한다.
- 입력에 `prior_memory`, `state_hints`가 있으면 우선 반영한다.
- 입력에 값이 없으면 안전한 기본값을 사용한다.
- 문자열 기본값은 가능한 한 `unknown` 또는 `none`을 사용한다.
- 배열 기본값은 `[]`를 사용한다.
- `top_priorities`는 비어 있지 않다면 입력 우선순위를 보존한다.
- `recent_similar_decisions`의 각 항목은 `topic`, `selected_option`, `outcome_note`를 모두 채운다.
- `state_summary`는 새 사실을 만들어내지 말고, 주어진 정보와 명시적 상태를 요약한 문장만 작성한다.
- `agent_guidance`는 downstream agent가 어떤 tradeoff를 설명해야 하는지 한 문장으로 적는다.
- 추천, 결론, 정답 선택은 절대 하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "case_id": "case-001",
  "user_state": {
    "profile_state": {
      "risk_preference": "low",
      "decision_style": "deliberate",
      "top_priorities": ["stability", "income", "health"]
    },
    "situational_state": {
      "career_stage": "mid",
      "financial_pressure": "high",
      "time_pressure": "medium",
      "emotional_state": "uncertain"
    },
    "memory_state": {
      "recent_similar_decisions": [
        {
          "topic": "job_change",
          "selected_option": "stay",
          "outcome_note": "felt safe but regretted slow growth"
        }
      ],
      "repeated_patterns": [
        "tends to avoid risk under uncertainty"
      ],
      "consistency_notes": [
        "current recommendation should explain stability-growth tradeoff"
      ]
    }
  },
  "state_summary": {
    "decision_bias": "leans conservative but regrets missed growth",
    "current_constraint": "financial pressure limits aggressive decisions",
    "agent_guidance": "prefer low-regret recommendations with explicit tradeoff explanation"
  }
}
```
```

## Input JSON

```json
{
  "caseId": "case-08-smallbiz-vs-employment",
  "caseInput": {
    "userProfile": {
      "age": 35,
      "job": "office worker",
      "risk_tolerance": "high",
      "priority": [
        "independence",
        "income",
        "stability"
      ]
    },
    "decision": {
      "optionA": "소규모 카페를 창업한다",
      "optionB": "회사를 취업해 안정적으로 일한다",
      "context": "오랫동안 카페 운영을 꿈꿔왔고 어느 정도 모아둔 자금도 있다. 다만 자영업 경험은 없고, 최근 경기 변동성이 커져 창업 타이밍이 맞는지 고민하고 있다."
    }
  }
}
```

## Expected Output Schema

```json
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
          "required": [
            "risk_preference",
            "decision_style",
            "top_priorities"
          ]
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
          "required": [
            "career_stage",
            "financial_pressure",
            "time_pressure",
            "emotional_state"
          ]
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
                "required": [
                  "topic",
                  "selected_option",
                  "outcome_note"
                ]
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
          "required": [
            "recent_similar_decisions",
            "repeated_patterns",
            "consistency_notes"
          ]
        }
      },
      "required": [
        "profile_state",
        "situational_state",
        "memory_state"
      ]
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
      "required": [
        "decision_bias",
        "current_constraint",
        "agent_guidance"
      ]
    }
  },
  "required": [
    "case_id",
    "user_state",
    "state_summary"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-08-smallbiz-vs-employment/state-context.json"
}
```
