# Risk A Request Preview

- Request file: `playground/outputs/case-05-relocation/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-05-relocation.json`
- Previous result: `playground/outputs/case-05-relocation/state-context.json`
- Previous result: `playground/outputs/case-05-relocation/planner-result.json`
- Previous result: `playground/outputs/case-05-relocation/scenario-a-result.json`

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
  "caseId": "case-05-relocation",
  "caseInput": {
    "userProfile": {
      "age": 30,
      "job": "backend developer",
      "risk_tolerance": "medium",
      "priority": [
        "stability",
        "experience",
        "future_opportunity"
      ]
    },
    "decision": {
      "optionA": "한국에 남아 현재 커리어를 이어간다",
      "optionB": "일본으로 이주해 새 직장을 찾는다",
      "context": "해외 생활 경험과 장기적인 커리어 확장을 원하지만, 언어와 비자 문제 때문에 초기 적응 실패 가능성도 현실적으로 크다. 현재 한국에서는 무난한 팀과 안정적인 연봉을 유지하고 있다."
    }
  },
  "stateContext": {
    "case_id": "case-05-relocation",
    "user_state": {
      "profile_state": {
        "risk_preference": "medium",
        "decision_style": "exploratory",
        "top_priorities": [
          "stability",
          "experience",
          "future_opportunity"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "medium",
        "time_pressure": "unknown",
        "emotional_state": "cautiously_optimistic"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "balances stability and upside",
      "current_constraint": "financial pressure is medium; emotional state is cautiously_optimistic",
      "agent_guidance": "explain tradeoffs around stability, experience, future_opportunity while respecting financial pressure is medium; emotional state is cautiously_optimistic"
    }
  },
  "optionLabel": "A",
  "selectedOption": "한국에 남아 현재 커리어를 이어간다",
  "decisionContext": "해외 생활 경험과 장기적인 커리어 확장을 원하지만, 언어와 비자 문제 때문에 초기 적응 실패 가능성도 현실적으로 크다. 현재 한국에서는 무난한 팀과 안정적인 연봉을 유지하고 있다.",
  "factors": [
    "안정적인 수입과 고용 지속성",
    "해외 생활 및 새로운 경험의 실질적 가치",
    "장기적인 커리어 확장성과 미래 기회",
    "언어·비자 문제로 인한 초기 적응 리스크",
    "현재 커리어 연속성 대비 환경 변화 부담"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "안정적인 수입과 고용 지속성",
      "해외 생활 및 새로운 경험의 실질적 가치",
      "장기적인 커리어 확장성과 미래 기회",
      "언어·비자 문제로 인한 초기 적응 리스크",
      "현재 커리어 연속성 대비 환경 변화 부담"
    ]
  },
  "scenario": {
    "three_months": "한국에 남기로 한 직후에는 큰 생활 변화가 없어 마음이 비교적 안정된다. 월급과 고용이 계속 유지되고 현재 팀의 업무 흐름도 익숙해 불안은 크지 않지만, 해외로 나가지 않았다는 선택 때문에 가끔은 아쉬움과 정체감이 함께 올라온다. 대신 언어와 비자 문제로 인한 초기 적응 리스크를 피했다는 점에서 스스로 납득하게 되고, 현재 커리어의 연속성을 살려 프로젝트 책임 범위를 조금 넓히거나 영어 공부, 해외 협업이 있는 업무를 찾아보려는 현실적인 움직임이 시작된다.",
    "one_year": "1년쯤 지나면 안정적인 수입과 무난한 팀 환경 덕분에 생활은 한층 단단해진다. 이직이나 해외 정착 실패에 대한 부담 없이 실무 경험은 분명히 쌓이고, 백엔드 개발자로서 시스템 운영이나 협업 역량도 더 선명해진다. 다만 새로운 환경에서 얻을 수 있었던 생활 경험은 직접 체감하지 못해, 성장의 폭이 생각보다 비슷한 패턴 안에 머문다는 답답함이 생길 수 있다. 그래서 중간 정도의 위험 감수 성향에 맞게 당장 크게 판을 바꾸기보다, 외국계 기업 지원 준비, 영어 실무 능력 강화, 원격 협업 경험 확보 같은 방식으로 미래 기회를 넓히려는 방향으로 관심이 옮겨간다.",
    "three_years": "3년 후에는 한국에서 커리어를 이어온 선택의 장단점이 더 분명해진다. 안정적인 고용과 수입을 바탕으로 경력의 연속성은 잘 유지되고, 한두 번의 승진이나 더 나은 조건의 국내 이직 기회가 생길 가능성도 있다. 반면 해외 생활 자체에서 얻는 경험은 여전히 간접적이어서, 별도의 준비를 하지 않았다면 장기적인 커리어 확장성은 기대만큼 크게 넓어지지 않았다고 느낄 수 있다. 그래도 초기에 걱정했던 언어·비자 적응 리스크를 피한 덕분에 경력이 끊기지 않았고, 꾸준히 영어, 글로벌 협업, 기술 전문성을 쌓아왔다면 그때는 해외 이직이나 외국계 전환을 더 현실적인 다음 선택지로 바라보게 된다. 전체적으로는 큰 실패 없이 기반을 지키는 대신, 미래 기회를 넓히려면 의도적인 추가 행동이 꼭 필요하다는 결론에 가까워진다."
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
  "output_file": "playground/outputs/case-05-relocation/risk-a-result.json"
}
```
