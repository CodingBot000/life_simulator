# Risk B Request Preview

- Request file: `playground/outputs/case-08-smallbiz-vs-employment/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-08-smallbiz-vs-employment.json`
- Previous result: `playground/outputs/case-08-smallbiz-vs-employment/state-context.json`
- Previous result: `playground/outputs/case-08-smallbiz-vs-employment/planner-result.json`
- Previous result: `playground/outputs/case-08-smallbiz-vs-employment/scenario-b-result.json`

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
  },
  "optionLabel": "B",
  "selectedOption": "회사를 취업해 안정적으로 일한다",
  "decisionContext": "오랫동안 카페 운영을 꿈꿔왔고 어느 정도 모아둔 자금도 있다. 다만 자영업 경험은 없고, 최근 경기 변동성이 커져 창업 타이밍이 맞는지 고민하고 있다.",
  "factors": [
    "독립성과 자율성 확보 가능성",
    "수입 안정성과 기대 수익",
    "직업 안정성과 경기 변동 리스크",
    "창업 경험 부족에 따른 실행 난이도",
    "오랜 창업 희망을 실현하는 만족도"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "독립성과 자율성 확보 가능성",
      "수입 안정성과 기대 수익",
      "직업 안정성과 경기 변동 리스크",
      "창업 경험 부족에 따른 실행 난이도",
      "오랜 창업 희망을 실현하는 만족도"
    ]
  },
  "scenario": {
    "three_months": "회사를 선택해 입사하거나 이직을 마친 뒤 3개월쯤 지나면, 월급이 규칙적으로 들어오고 생활 리듬이 안정되면서 경기 변동에 대한 불안은 예상보다 빨리 줄어든다. 수입 안정성과 직업 안정성 면에서는 안도감이 크지만, 독립성과 자율성을 중시하는 성향 때문에 조직의 보고 체계와 정해진 역할에 답답함도 함께 느낀다. 카페 창업을 바로 밀어붙이지 않은 덕분에 자영업 경험 부족에서 오는 시행착오는 피했지만, 오래 품어온 꿈을 당장 실현하지 못했다는 아쉬움이 은근히 남아 마음이 완전히 편하지만은 않다.",
    "one_year": "1년이 지나면 회사 일은 익숙해지고 성과를 내는 방식도 파악해, 처음보다 자율적으로 일할 여지는 조금 늘어난다. 큰 변동 없이 급여가 들어오고 저축도 다시 쌓이면서 기대 수익은 창업보다 낮더라도 예측 가능하다는 장점이 분명해진다. 특히 경기 상황이 흔들릴 때는 안정적으로 일한다는 선택이 실용적이었다는 확신이 생긴다. 다만 위험 감수 성향이 높은 편이라 마음 한쪽에서는 '지금 너무 안전한 길만 가는 건 아닌가'라는 생각이 반복되고, 창업 경험 부족을 메우기 위해 주말에 상권 분석이나 카페 운영 관련 공부를 시작할 가능성이 크다. 만족감은 생활 안정에서 오지만, 창업 희망 자체는 미뤄진 과제로 남는다.",
    "three_years": "3년쯤 지나면 회사 안에서 책임이 늘거나 더 조건이 나은 자리로 옮길 기회가 생기면서, 수입과 안정성은 처음보다 한층 강화될 가능성이 높다. 모아둔 자금도 더 두터워져 예전보다 훨씬 현실적인 판단이 가능해지고, 창업을 바로 하지 않은 시간 덕분에 운영 지식과 준비 수준은 분명 나아진다. 반면 독립성과 자율성을 최우선으로 두는 성향은 쉽게 사라지지 않아, 회사 생활이 안정될수록 오히려 '언제까지 남을까'라는 질문이 더 선명해질 수 있다. 오래된 창업 희망을 아직 실행하지 못한 데서 오는 아쉬움은 남지만, 그 감정이 조급함보다는 준비된 다음 선택을 고민하는 형태로 바뀐다. 결과적으로 이 선택은 큰 실패를 피하고 기반을 다지는 데는 유리하지만, 장기적으로는 안정과 독립 욕구 사이의 긴장을 계속 관리해야 하는 현실적인 경로가 된다."
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
  "output_file": "playground/outputs/case-08-smallbiz-vs-employment/risk-b-result.json"
}
```
