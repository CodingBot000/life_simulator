# Scenario A Request Preview

- Request file: `playground/outputs/case-09-overseas-study-vs-work/scenario-a-request.json`
- Prompt file: `prompts/scenario.md`
- Input source: `playground/inputs/cases/case-09-overseas-study-vs-work.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/state-context.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/planner-result.json`

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
  },
  "optionLabel": "A",
  "selectedOption": "해외 대학원에 진학한다",
  "decisionContext": "장기적으로는 특정 분야 전문성을 갖춘 커리어를 만들고 싶지만, 학비와 생활비 부담 때문에 단기 수입도 무시하기 어렵다. 현장 경험을 먼저 쌓는 편이 나을지 계속 고민 중이다.",
  "factors": [
    "장기 커리어 성장 가능성",
    "단기 수입 확보 가능성",
    "특정 분야 전문성 강화 정도",
    "학비·생활비에 따른 재정 부담",
    "현장 실무 경험 축적 속도",
    "선택지별 불확실성과 안정성"
  ],
  "plannerResult": {
    "decision_type": "education",
    "factors": [
      "장기 커리어 성장 가능성",
      "단기 수입 확보 가능성",
      "특정 분야 전문성 강화 정도",
      "학비·생활비에 따른 재정 부담",
      "현장 실무 경험 축적 속도",
      "선택지별 불확실성과 안정성"
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
  "output_file": "playground/outputs/case-09-overseas-study-vs-work/scenario-a-result.json"
}
```
