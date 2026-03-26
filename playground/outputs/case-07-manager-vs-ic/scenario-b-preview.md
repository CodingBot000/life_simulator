# Scenario B Request Preview

- Request file: `playground/outputs/case-07-manager-vs-ic/scenario-b-request.json`
- Prompt file: `prompts/scenario.md`
- Input source: `playground/inputs/cases/case-07-manager-vs-ic.json`
- Previous result: `playground/outputs/case-07-manager-vs-ic/state-context.json`
- Previous result: `playground/outputs/case-07-manager-vs-ic/planner-result.json`

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
  },
  "optionLabel": "B",
  "selectedOption": "IC 트랙에 남는다",
  "decisionContext": "조직이 커지면서 팀을 맡아 달라는 제안을 받았지만, 사람 관리와 조율에서 오는 스트레스를 걱정하고 있다. 반대로 기술적인 깊이를 더 쌓고 싶은 욕구도 여전히 강하다.",
  "factors": [
    "성장 경로 적합성",
    "스트레스 관리 가능성",
    "보상 수준과 보상 성장성",
    "역할 변화의 안정성과 불확실성",
    "기술적 깊이 유지 가능성"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "성장 경로 적합성",
      "스트레스 관리 가능성",
      "보상 수준과 보상 성장성",
      "역할 변화의 안정성과 불확실성",
      "기술적 깊이 유지 가능성"
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
  "output_file": "playground/outputs/case-07-manager-vs-ic/scenario-b-result.json"
}
```
