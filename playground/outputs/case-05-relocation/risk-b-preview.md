# Risk B Request Preview

- Request file: `playground/outputs/case-05-relocation/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-05-relocation.json`
- Previous result: `playground/outputs/case-05-relocation/state-context.json`
- Previous result: `playground/outputs/case-05-relocation/planner-result.json`
- Previous result: `playground/outputs/case-05-relocation/scenario-b-result.json`

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
  "optionLabel": "B",
  "selectedOption": "일본으로 이주해 새 직장을 찾는다",
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
    "three_months": "일본으로 이주한 뒤 첫 3개월은 기대와 긴장이 함께 간다. 한국에서의 안정적인 급여가 끊기거나 줄어드는 시점이라 생활비와 보증금, 비자 관련 비용이 생각보다 크게 느껴지고, 수입의 안정성에 대한 불안이 자주 올라온다. 동시에 새로운 도시와 업무 문화, 생활 방식은 분명 신선한 자극이 되어 해외 생활 경험의 실질적 가치를 체감하게 만든다. 다만 언어 장벽 때문에 면접에서 자신 있게 답하지 못하거나, 비자 조건에 맞는 채용 공고가 제한적이라 준비 기간이 길어질 수 있다. 백엔드 개발 경력 자체는 경쟁력이 있지만, 현재 커리어의 연속성이 잠시 끊긴 느낌이 들어 조급함도 생긴다. 이 시기에는 눈에 띄는 성과보다도 생활 적응, 일본어 보완, 이력서 현지화, 채용 시장 이해가 중심이 되며, 감정적으로는 불안과 기대가 번갈아 나타난다.",
    "one_year": "1년 정도 지나면 초기 혼란은 다소 정리되고, 현실적인 자리가 잡히기 시작한다. 일본 현지 기업이나 외국인 채용에 열려 있는 회사에 합류했다면 연봉은 한국 대비 비슷하거나 약간 낮을 수 있지만, 고용과 체류가 안정되면서 심리적 부담은 초반보다 줄어든다. 업무에서는 기술 역량 자체보다 커뮤니케이션 방식, 문서 문화, 회의 참여 방식에 적응하는 데 시간이 들고, 그 과정에서 스스로 성장하고 있다는 감각도 생긴다. 새로운 경험은 분명 쌓이지만, 생활 전반을 혼자 관리해야 해서 피로감도 적지 않다. 그래도 중간 수준의 위험 감수 성향에 맞게 무리한 이직이나 창업 대신, 현재 자리에서 경험을 축적하며 다음 기회를 보는 쪽으로 판단할 가능성이 크다. 이 시점의 핵심 결과는 수입과 고용의 안정성을 완전히 회복하지는 못해도, 해외 경력과 실무 적응 경험이 생기면서 장기적인 커리어 확장 가능성이 현실적인 형태로 열리기 시작한다는 점이다.",
    "three_years": "3년 후에는 이 선택의 의미가 단기 모험이 아니라 경력의 방향 전환으로 남을 가능성이 높다. 일본에서 계속 일하고 있다면 언어와 비자 문제는 완전히 사라지지 않아도 관리 가능한 수준이 되고, 현지 실무 경험과 다국적 환경 적응력이 이력서에서 분명한 강점으로 자리 잡는다. 수입은 초기에 기대했던 만큼 빠르게 오르지 않을 수 있지만, 고용 지속성과 역할의 안정성은 점차 개선되고, 한국에 머물렀을 때보다 선택 가능한 미래 기회는 넓어진다. 예를 들어 일본 내 더 나은 팀으로 옮기거나, 아시아 지역 원격 포지션, 글로벌 기업 지원 같은 경로가 현실적인 옵션이 된다. 반면 생활 기반을 해외에 둔 부담, 관계망 재구성, 문화적 피로는 계속 비용으로 남아 있어 마냥 낭만적인 결과는 아니다. 감정적으로는 초반의 불안 대신 ‘쉽지는 않았지만 경험과 기회를 바꿔 얻었다’는 차분한 만족에 가까우며, 안정성을 최우선으로 두면서도 미래 기회를 넓히고 싶었던 우선순위와는 대체로 맞는 결과가 된다."
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
  "output_file": "playground/outputs/case-05-relocation/risk-b-result.json"
}
```
