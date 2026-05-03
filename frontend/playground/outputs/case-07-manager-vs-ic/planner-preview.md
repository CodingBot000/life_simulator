# Planner Request Preview

- Request file: `playground/outputs/case-07-manager-vs-ic/planner-request.json`
- Prompt file: `prompts/planner.md`
- Input source: `playground/inputs/cases/case-07-manager-vs-ic.json`
- Previous result: `playground/outputs/case-07-manager-vs-ic/state-context.json`

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
  "caseId": "case-07-manager-vs-ic",
  "caseInput": {
    "userProfile": {
      "age": 37,
      "job": "senior developer",
      "risk_tolerance": "low",
      "priority": [
        "growth",
        "stress_management",
        "compensation"
      ]
    },
    "decision": {
      "optionA": "매니저 트랙으로 전환한다",
      "optionB": "IC 트랙에 남는다",
      "context": "조직이 커지면서 팀을 맡아 달라는 제안을 받았지만, 사람 관리와 조율에서 오는 스트레스를 걱정하고 있다. 반대로 기술적인 깊이를 더 쌓고 싶은 욕구도 여전히 강하다."
    }
  },
  "stateContext": {
    "case_id": "case-07-manager-vs-ic",
    "user_state": {
      "profile_state": {
        "risk_preference": "low",
        "decision_style": "deliberate",
        "top_priorities": [
          "growth",
          "stress_management",
          "compensation"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "unknown",
        "time_pressure": "unknown",
        "emotional_state": "unknown"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "leans conservative under uncertainty",
      "current_constraint": "none",
      "agent_guidance": "tie the recommendation directly to growth, stress_management, compensation and make the tradeoff explicit"
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
  "output_file": "playground/outputs/case-07-manager-vs-ic/planner-result.json"
}
```
