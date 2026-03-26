# Risk B Request Preview

- Request file: `playground/outputs/case-01-career-stability/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-01-career-stability.json`
- Previous result: `playground/outputs/case-01-career-stability/state-context.json`
- Previous result: `playground/outputs/case-01-career-stability/planner-result.json`
- Previous result: `playground/outputs/case-01-career-stability/scenario-b-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Risk Analyst다.

목표:
- 특정 선택지의 시나리오를 바탕으로 현실적인 위험도를 평가한다.
- 객관적 위험뿐 아니라 이 사용자에게 더 크게 작용하는 위험을 반영한다.
- 이유는 추상적 표현보다 구체적인 근거를 우선한다.

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
  },
  "scenario": {
    "three_months": "",
    "one_year": "",
    "three_years": ""
  }
}
```

판단 규칙:
- `risk_level`은 반드시 `low`, `medium`, `high` 중 하나만 사용한다.
- `reasons`는 2~4개 정도의 구체적인 문자열 배열로 작성한다.
- `scenario`의 시간 축 전개와 `stateContext.user_state`, `state_summary`를 함께 고려한다.
- `profile_state.top_priorities`, `risk_preference`, `situational_state` 때문에 더 커지는 위험이 있으면 명시한다.
- `memory_state.repeated_patterns`가 현재 선택에서 다시 반복될 가능성이 있으면 반영한다.
- 막연한 공포 조장은 금지한다.
- 입력에 없는 사실을 만들어 단정하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "risk_level": "low | medium | high",
  "reasons": []
}
```
```

## Input JSON

```json
{
  "caseId": "case-01-career-stability",
  "caseInput": {
    "userProfile": {
      "age": 32,
      "job": "developer",
      "risk_tolerance": "low",
      "priority": [
        "stability",
        "income",
        "work_life_balance"
      ]
    },
    "decision": {
      "optionA": "현재 회사에 남는다",
      "optionB": "스타트업으로 이직한다",
      "context": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다."
    }
  },
  "stateContext": {
    "case_id": "case-01-career-stability",
    "user_state": {
      "profile_state": {
        "risk_preference": "low",
        "decision_style": "deliberate",
        "top_priorities": [
          "stability",
          "income",
          "work_life_balance"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "medium",
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
      "current_constraint": "financial pressure is medium",
      "agent_guidance": "explain tradeoffs around stability, income, work_life_balance while respecting financial pressure is medium"
    }
  },
  "optionLabel": "B",
  "selectedOption": "스타트업으로 이직한다",
  "decisionContext": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다.",
  "factors": [
    "고용 및 생활 안정성",
    "연봉 및 복지 수준",
    "역할 변화와 커리어 성장 가능성",
    "새로운 기술을 가까이서 다룰 기회",
    "워라밸 유지 가능성"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "고용 및 생활 안정성",
      "연봉 및 복지 수준",
      "역할 변화와 커리어 성장 가능성",
      "새로운 기술을 가까이서 다룰 기회",
      "워라밸 유지 가능성"
    ]
  },
  "scenario": {
    "three_months": "스타트업으로 옮긴 직후 3개월은 기대감과 긴장감이 함께 간다. 개발자로서 더 가까이에서 새로운 기술 스택과 제품 의사결정을 접하면서 역할 범위가 넓어져, 이전 회사에서 느끼던 정체감은 다소 줄어든다. 다만 낮은 위험 감수 성향 때문에 고용 및 생활 안정성에 대한 불안은 쉽게 사라지지 않고, 연봉이나 복지 조건이 이전보다 조금 낮거나 불확실하게 느껴질 수 있다. 초기에는 업무 구조가 빠르게 바뀌고 책임이 넓어져 퇴근 후에도 머리가 바쁜 날이 많아 워라밸은 일시적으로 흔들리지만, 동시에 배우는 속도와 성장 체감은 분명히 커진다.",
    "one_year": "1년쯤 지나면 업무 흐름과 팀 문화에 익숙해지면서 감정의 기복은 줄고, 이직이 완전히 무모한 선택은 아니었다는 안도감이 생길 가능성이 크다. 새로운 기술을 실제 서비스에 적용한 경험이 쌓여 역할 변화와 커리어 성장 가능성은 이전보다 뚜렷해지고, 작은 조직에서 주도적으로 문제를 푼 경험이 이력에도 남는다. 반면 안정성과 워라밸은 회사 상황에 따라 편차가 커서, 제품 일정이나 투자 환경이 좋지 않으면 야근이 잦아지고 생활 리듬이 흔들릴 수 있다. 연봉은 기본급만 보면 큰 차이가 없더라도 성과 보상이나 스톡옵션 기대가 포함돼 체감이 복합적이며, 복지는 이전 직장보다 단순해져 아쉬움이 남을 수 있다.",
    "three_years": "3년 후에는 이직의 의미가 더 현실적으로 정리된다. 회사가 일정 수준 이상 자리를 잡았다면, 당신은 새로운 기술과 빠른 실행 환경을 경험한 개발자로서 시장가치가 높아지고 다음 커리어 선택지도 넓어진다. 그 경우 초반의 불안은 줄고, 성장 측면에서는 분명한 성과를 느끼지만, 안정성과 워라밸은 여전히 대기업이나 안정적인 조직보다 덜 예측 가능하다고 받아들이게 된다. 반대로 회사가 기대만큼 성장하지 못하더라도, 극단적 실패라기보다 연봉·복지·고용 안정성의 한계를 체감하며 다시 더 안정적인 회사로 이동할 준비를 하게 될 가능성이 높다. 즉, 이 선택은 낮은 위험 선호를 가진 사람에게 마음 편한 길은 아니지만, 생활 안정성을 일부 감수하는 대신 역할 변화, 기술 경험, 커리어 성장의 폭을 실제로 넓히는 방향으로 작동할 가능성이 크다."
  }
}
```

## Expected Output Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "risk_level": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high"
      ]
    },
    "reasons": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": [
    "risk_level",
    "reasons"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-01-career-stability/risk-b-result.json"
}
```
