# Planner Request Preview

- Request file: `playground/outputs/case-09-overseas-study-vs-work/planner-request.json`
- Prompt file: `prompts/planner.md`
- Input source: `playground/inputs/cases/case-09-overseas-study-vs-work.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/state-context.json`

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
  "caseId": "case-09-overseas-study-vs-work",
  "caseInput": {
    "userProfile": {
      "age": 28,
      "job": "research assistant",
      "risk_tolerance": "medium",
      "priority": [
        "long_term_growth",
        "short_term_income",
        "expertise"
      ]
    },
    "decision": {
      "optionA": "해외 대학원에 진학한다",
      "optionB": "바로 실무 취업한다",
      "context": "장기적으로는 특정 분야 전문성을 갖춘 커리어를 만들고 싶지만, 학비와 생활비 부담 때문에 단기 수입도 무시하기 어렵다. 현장 경험을 먼저 쌓는 편이 나을지 계속 고민 중이다."
    }
  },
  "stateContext": {
    "case_id": "case-09-overseas-study-vs-work",
    "user_state": {
      "profile_state": {
        "risk_preference": "medium",
        "decision_style": "deliberate",
        "top_priorities": [
          "long_term_growth",
          "short_term_income",
          "expertise"
        ]
      },
      "situational_state": {
        "career_stage": "early",
        "financial_pressure": "high",
        "time_pressure": "medium",
        "emotional_state": "uncertain"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "balances stability and upside",
      "current_constraint": "financial pressure is high; time pressure is medium; emotional state is uncertain",
      "agent_guidance": "explain tradeoffs around long_term_growth, short_term_income, expertise while respecting financial pressure is high; time pressure is medium; emotional state is uncertain"
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
  "output_file": "playground/outputs/case-09-overseas-study-vs-work/planner-result.json"
}
```
