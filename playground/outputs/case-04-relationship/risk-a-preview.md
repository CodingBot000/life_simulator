# Risk A Request Preview

- Request file: `playground/outputs/case-04-relationship/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/state-context.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-a-result.json`

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
  },
  "scenario": {
    "three_months": "현재 연애를 계속 이어가면, 당장은 헤어진 뒤 혼자가 되는 불안을 피했다는 안도감이 커서 감정이 조금 가라앉는다. 다만 장거리와 반복된 갈등의 패턴은 바로 사라지지 않아, 연락 빈도나 만남 계획을 정해도 작은 일정 변경에 다시 예민해질 가능성이 높다. 상대를 믿고 싶다는 마음 때문에 관계를 지키려는 노력이 늘지만, 신뢰는 말보다 지켜지는 행동에 따라 조금씩만 회복된다. 그래서 정서적 안정감은 완전히 편해졌다기보다, 관계를 유지하고 있다는 사실에서 오는 안심과 미래가 또 흔들릴 수 있다는 긴장이 함께 존재하는 상태에 가깝다.",
    "one_year": "1년 정도 지나면 두 사람은 갈등을 줄이기 위한 나름의 방식, 예를 들어 싸움의 기준선이나 방문 주기, 중요한 일정 공유 같은 규칙을 어느 정도 갖추게 된다. 이 덕분에 초반보다 감정 소모는 줄고 관계를 유지하는 기술은 늘지만, 장거리의 피로와 반복 갈등의 기억이 완전히 없어지지는 않는다. 특히 신뢰를 중시하는 성향 때문에 약속이 몇 번만 어긋나도 실망이 이전보다 더 크게 쌓일 수 있다. 미래 계획에 대해 이사, 거리 축소, 함께 살 시점 같은 구체적 이야기가 나오기 시작하면 안정감이 생기지만, 계속 논의만 있고 실행이 없다면 '사랑은 있지만 장기적으로 맞는 관계인가'라는 의문이 더 자주 떠오른다.",
    "three_years": "3년이 지나도 관계를 이어간다면, 단순히 애정만으로 버티기보다 현실적인 구조를 만들었는지가 관계의 질을 좌우한다. 보통은 장거리를 줄이기 위한 생활권 조정이나 중장기 계획을 어느 정도 합의하면서 겉보기에는 이전보다 차분해지지만, 그 안정은 자연스럽게 생긴 것이 아니라 계속 관리해서 유지하는 성격에 가깝다. 혼자가 되는 불안은 초반보다 줄어들고 익숙함에서 오는 편안함도 생기지만, 동시에 관계 안에서의 외로움이나 피로를 더 분명히 인식하게 된다. 결국 이 선택은 극적인 해답이라기보다, 신뢰를 꾸준히 쌓고 미래 계획을 실제 행동으로 옮길 수 있을 때만 장기적 궁합이 확인되는 방향으로 흘러가며, 그렇지 않다면 '헤어지지 않았기 때문에 유지되는 관계'라는 느낌이 남을 가능성이 있다."
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
  "output_file": "playground/outputs/case-04-relationship/risk-a-result.json"
}
```
