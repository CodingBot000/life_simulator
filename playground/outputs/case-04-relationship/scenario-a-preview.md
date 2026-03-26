# Scenario A Request Preview

- Request file: `playground/outputs/case-04-relationship/scenario-a-request.json`
- Prompt file: `prompts/scenario.md`
- Input source: `playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/state-context.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Scenario Agent다.

목표:
- 하나의 선택지에 대해 사용자 현실에 맞는 미래 시나리오를 작성한다.
- 각 시점은 감정, 사건, 결과가 자연스럽게 함께 드러나야 한다.
- 일반론이 아니라 state context에 맞는 현실적 전개를 만든다.

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
  },
  "optionLabel": "A",
  "selectedOption": "현재 회사에 남는다",
  "decisionContext": "현재 연봉은 안정적이지만 성장 정체를 느낌",
  "factors": ["stability", "income", "growth", "work_life_balance"],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": ["stability", "income", "growth", "work_life_balance"]
  }
}
```

작성 규칙:
- 반드시 현재 입력으로 주어진 `selectedOption` 하나만 기준으로 분석한다.
- `stateContext.user_state.profile_state`, `situational_state`, `state_summary`를 시나리오 전개에 반영한다.
- `factors`를 무시하지 말고 각 시점의 전개에 연결한다.
- `three_months`, `one_year`, `three_years`는 각각 서로 다른 시간 축의 변화를 보여줘야 한다.
- `memory_state.consistency_notes`나 `repeated_patterns`가 있으면 선택 이후 어떤 감정이나 후회가 반복될 수 있는지 반영한다.
- 비현실적 확신, 극단적 성공, 극단적 파국은 피한다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "three_months": "",
  "one_year": "",
  "three_years": ""
}
```
```

## Input JSON

```json
{
  "caseId": "case-04-relationship",
  "caseInput": {
    "userProfile": {
      "age": 31,
      "job": "marketer",
      "risk_tolerance": "low",
      "priority": [
        "emotional_stability",
        "trust",
        "long_term_compatibility"
      ]
    },
    "decision": {
      "optionA": "현재 연애를 계속 이어간다",
      "optionB": "관계를 정리한다",
      "context": "상대와 애정은 있지만 장거리와 반복되는 갈등으로 미래 계획이 자주 흔들린다. 혼자가 되는 불안도 있지만, 계속 버티는 것이 더 건강한지 확신이 서지 않는다."
    }
  },
  "stateContext": {
    "case_id": "case-04-relationship",
    "user_state": {
      "profile_state": {
        "risk_preference": "low",
        "decision_style": "deliberate",
        "top_priorities": [
          "emotional_stability",
          "trust",
          "long_term_compatibility"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "unknown",
        "time_pressure": "high",
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
      "current_constraint": "time pressure is high; emotional state is uncertain",
      "agent_guidance": "explain tradeoffs around emotional_stability, trust, long_term_compatibility while respecting time pressure is high; emotional state is uncertain"
    }
  },
  "optionLabel": "A",
  "selectedOption": "현재 연애를 계속 이어간다",
  "decisionContext": "상대와 애정은 있지만 장거리와 반복되는 갈등으로 미래 계획이 자주 흔들린다. 혼자가 되는 불안도 있지만, 계속 버티는 것이 더 건강한지 확신이 서지 않는다.",
  "factors": [
    "관계 유지와 정리 각각이 주는 정서적 안정감",
    "상대에 대한 신뢰를 회복하고 유지할 가능성",
    "장거리와 반복되는 갈등을 감당할 수 있는 관계의 지속 가능성",
    "미래 계획을 안정적으로 함께 세울 수 있는지",
    "장기적으로 더 건강한 선택인지와 혼자가 되는 불안의 크기"
  ],
  "plannerResult": {
    "decision_type": "relationship",
    "factors": [
      "관계 유지와 정리 각각이 주는 정서적 안정감",
      "상대에 대한 신뢰를 회복하고 유지할 가능성",
      "장거리와 반복되는 갈등을 감당할 수 있는 관계의 지속 가능성",
      "미래 계획을 안정적으로 함께 세울 수 있는지",
      "장기적으로 더 건강한 선택인지와 혼자가 되는 불안의 크기"
    ]
  }
}
```

## Expected Output Schema

```json
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
  "required": [
    "three_months",
    "one_year",
    "three_years"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-04-relationship/scenario-a-result.json"
}
```
