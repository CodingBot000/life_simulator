# Planner Request Preview

- Request file: `playground/outputs/case-08-smallbiz-vs-employment/planner-request.json`
- Prompt file: `prompts/planner.md`
- Input source: `playground/inputs/cases/case-08-smallbiz-vs-employment.json`
- Previous result: `playground/outputs/case-08-smallbiz-vs-employment/state-context.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Planner Agent다.

목표:
- 원본 case input과 state context를 읽고 의사결정 유형을 분류한다.
- 이후 단계에서 재사용할 핵심 비교 요소 factors를 3~6개 도출한다.
- factors는 profile_state, situational_state를 반영한 실제 비교 기준이어야 한다.

입력 데이터 형식:
```json
{
  "caseId": "case-001",
  "caseInput": {
    "userProfile": {
      "age": 32,
      "job": "developer",
      "risk_tolerance": "low",
      "priority": ["stability", "income", "work_life_balance"]
    },
    "decision": {
      "optionA": "현재 회사에 남는다",
      "optionB": "스타트업으로 이직한다",
      "context": "현재 연봉은 안정적이지만 성장 정체를 느낌"
    }
  },
  "stateContext": {
    "user_state": {
      "profile_state": {
        "risk_preference": "low",
        "decision_style": "deliberate",
        "top_priorities": ["stability", "income", "work_life_balance"]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "medium",
        "time_pressure": "unknown",
        "emotional_state": "uncertain"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "leans conservative under uncertainty",
      "current_constraint": "financial pressure is medium",
      "agent_guidance": "explain stability-growth tradeoffs explicitly"
    }
  }
}
```

판단 규칙:
- `decision_type`은 `career_change`, `relationship`, `financial`, `living`, `education`처럼 짧고 재사용 가능한 범주형 문자열로 작성한다.
- `factors`는 실제 비교 기준이 되는 문자열 배열이어야 한다.
- `caseInput.userProfile.priority`, `risk_tolerance`, `decision.context`를 반드시 반영한다.
- `stateContext.user_state.profile_state`, `stateContext.user_state.situational_state`를 반드시 반영한다.
- `memory_state.consistency_notes`가 있으면 factors 또는 decision_type 해석에 반영한다.
- 입력에 없는 사실을 추가로 만들지 않는다.
- 응답은 반드시 한국어 기반의 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "decision_type": "",
  "factors": []
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
  },
  "stateContext": {
    "case_id": "case-08-smallbiz-vs-employment",
    "user_state": {
      "profile_state": {
        "risk_preference": "high",
        "decision_style": "deliberate",
        "top_priorities": [
          "independence",
          "income",
          "stability"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "medium",
        "time_pressure": "unknown",
        "emotional_state": "uncertain"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "accepts volatility for upside",
      "current_constraint": "financial pressure is medium; emotional state is uncertain",
      "agent_guidance": "explain tradeoffs around independence, income, stability while respecting financial pressure is medium; emotional state is uncertain"
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
  "required": [
    "decision_type",
    "factors"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-08-smallbiz-vs-employment/planner-result.json"
}
```
