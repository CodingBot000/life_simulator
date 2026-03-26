# Reflection Request Preview

- Request file: `playground/outputs/case-01-career-stability/reflection-request.json`
- Prompt file: `prompts/reflection.md`
- Input source: `playground/inputs/cases/case-01-career-stability.json`
- Previous result: `playground/outputs/case-01-career-stability/state-context.json`
- Previous result: `playground/outputs/case-01-career-stability/planner-result.json`
- Previous result: `playground/outputs/case-01-career-stability/scenario-a-result.json`
- Previous result: `playground/outputs/case-01-career-stability/scenario-b-result.json`
- Previous result: `playground/outputs/case-01-career-stability/risk-a-result.json`
- Previous result: `playground/outputs/case-01-career-stability/risk-b-result.json`
- Previous result: `playground/outputs/case-01-career-stability/reasoning-result.json`
- Previous result: `playground/outputs/case-01-career-stability/advisor-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Self-Reflection Agent다.

역할:
- 너는 매우 엄격한 AI 시스템 평가자다.
- planner, scenario, risk, ab_reasoning, advisor 결과의 품질을 냉정하게 검증한다.
- "괜찮다", "무난하다", "나쁘지 않다" 같은 애매한 평가는 금지한다.

목표:
- 전체 결과가 얼마나 현실적이고 일관적인지 평가한다.
- stateContext가 실제로 반영됐는지 점검한다.
- A/B reasoning이 실제로 다른 관점을 형성했는지 확인한다.
- comparison이 형식적 요약이 아니라 의미 있는 충돌 정리를 했는지 확인한다.
- final_selection이 앞선 reasoning 내용과 일관적인지 확인한다.
- advisor가 reasoning 결과와 state summary를 실제 추천 논리로 흡수했는지 확인한다.
- 최종 추천이 충분히 명확한지 검증한다.
- 문제를 구체적으로 지적하고, 다음 개선 방향을 구조적으로 제시한다.

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
    "case_id": "case-001",
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
  "plannerResult": {
    "decision_type": "career_change",
    "factors": ["stability", "income", "growth", "work_life_balance"]
  },
  "scenarioA": {
    "three_months": "",
    "one_year": "",
    "three_years": ""
  },
  "scenarioB": {
    "three_months": "",
    "one_year": "",
    "three_years": ""
  },
  "riskA": {
    "risk_level": "low",
    "reasons": []
  },
  "riskB": {
    "risk_level": "high",
    "reasons": []
  },
  "abReasoning": {
    "case_id": "case-001",
    "input_summary": {
      "user_profile": {
        "age": 32,
        "job": "developer",
        "risk_tolerance": "low",
        "priority": ["stability", "income", "work_life_balance"]
      },
      "decision_options": {
        "optionA": "현재 회사에 남는다",
        "optionB": "스타트업으로 이직한다",
        "context": "현재 연봉은 안정적이지만 성장 정체를 느낌"
      },
      "planner_goal": ""
    },
    "reasoning": {
      "a_reasoning": {
        "stance": "conservative",
        "summary": "",
        "key_assumptions": [],
        "pros": [],
        "cons": [],
        "recommended_option": "A",
        "confidence": 0.74
      },
      "b_reasoning": {
        "stance": "opportunity_seeking",
        "summary": "",
        "key_assumptions": [],
        "pros": [],
        "cons": [],
        "recommended_option": "B",
        "confidence": 0.61
      },
      "comparison": {
        "agreements": [],
        "conflicts": [],
        "which_fits_user_better": "A",
        "reason": ""
      },
      "final_selection": {
        "selected_reasoning": "A",
        "selected_option": "A",
        "why_selected": "",
        "decision_confidence": 0.72
      }
    }
  },
  "advisorResult": {
    "recommended_option": "A",
    "reason": "",
    "reasoning_basis": {
      "selected_reasoning": "A",
      "core_why": "",
      "decision_confidence": 0.72
    }
  }
}
```

평가 기준:
- `realism`: 시나리오 전개와 리스크 판단이 현실적인가?
- `consistency`: scenario, risk, advisor 사이에 논리 충돌이 없는가?
- `profile_alignment`: stateContext와 case input이 실제로 반영됐는가?
- `recommendation_clarity`: 최종 추천이 명확하고 근거 연결이 충분한가?

평가 규칙:
- `scores`의 모든 값은 반드시 1~5 사이의 정수만 사용한다.
- `issues`에는 반드시 1개 이상의 구체적 문제를 적는다.
- `issues[].type`은 반드시 `scenario`, `risk`, `reasoning`, `advisor`, `profile` 중 하나만 사용한다.
- 문제 설명은 추상 평가가 아니라 어떤 결과가 왜 약한지 명확히 적는다.
- `stateContext.user_state`와 `state_summary`가 실제 문장 수준에서 반영됐는지 별도로 본다.
- `improvement_suggestions`에는 반드시 1개 이상의 실행 가능한 개선 방향을 적는다.
- `improvement_suggestions[].target`은 반드시 `planner`, `scenario`, `risk`, `reasoning`, `advisor` 중 하나만 사용한다.
- 개선 방향은 "더 잘 써라" 같은 모호한 문장이 아니라, 무엇을 어떻게 보강해야 하는지 적는다.
- 입력에 없는 사실을 새로 만들어 단정하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "scores": {
    "realism": 1,
    "consistency": 1,
    "profile_alignment": 1,
    "recommendation_clarity": 1
  },
  "issues": [
    {
      "type": "scenario",
      "description": ""
    }
  ],
  "improvement_suggestions": [
    {
      "target": "advisor",
      "suggestion": ""
    }
  ],
  "overall_comment": ""
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
  "scenarioA": {
    "three_months": "현재 회사에 남은 지 3개월쯤 지나면, 당장의 이직 부담이 사라졌다는 점에서 마음은 한결 안정된다. 연봉과 복지, 익숙한 업무 환경이 유지되어 생활 계획을 흔들지 않아도 된다는 안도감이 크고, 워라밸도 지금 수준에서 크게 무너지지 않는다. 다만 역할 자체는 크게 달라지지 않아 일상 업무는 무난하지만 다소 반복적으로 느껴지고, 새로운 기술을 직접 다룰 기회가 생각보다 제한적이라는 점에서 약한 답답함이 남는다. 대신 리스크를 크게 지지 않는 선에서 사내 스터디나 작은 개선 과제를 자발적으로 맡아 보며 성장 가능성을 시험해 보려는 움직임이 생긴다.",
    "one_year": "1년이 지나면 안정성 측면에서는 선택의 장점이 더 분명해진다. 고용과 생활은 대체로 안정적으로 유지되고, 연봉은 큰 폭은 아니더라도 정기 인상이나 성과급 수준에서 무난하게 관리될 가능성이 높다. 워라밸 역시 급격히 나빠지지 않아 일과 생활의 균형은 비교적 잘 지켜진다. 그러나 커리어 성장과 역할 변화에서는 복합적인 감정이 생긴다. 스스로 작은 프로젝트나 협업 범위를 넓혀 보지 않았다면 정체감이 더 선명해지고, 반대로 내부에서 기술 개선이나 자동화, 신규 도입 검토 같은 기회를 꾸준히 찾았다면 제한적이지만 의미 있는 변화가 생긴다. 새로운 기술을 가까이서 다루는 경험은 외부 이직만큼 빠르지는 않지만, 현재 회사를 기반으로 천천히 넓혀 가는 형태가 된다. 만족감은 안정에서 오고, 아쉬움은 성장 속도에서 온다.",
    "three_years": "3년 후에는 이 선택의 성격이 더 뚜렷해진다. 생활 안정성, 꾸준한 소득, 복지, 예측 가능한 워라밸을 중시한 결정은 전반적으로 사용자 성향과 맞아 심리적 피로를 크게 줄여 준다. 경제적으로는 큰 도약은 아니어도 급격한 하락 없이 안정적인 흐름을 만들 가능성이 높다. 다만 역할 변화와 커리어 성장 가능성은 본인의 추가 행동 여부에 따라 차이가 커진다. 회사 안에서 점진적으로 책임 범위를 넓히고 새로운 기술을 일부라도 실무에 연결해 왔다면, 전문성은 느리지만 단단하게 쌓여 팀 내 신뢰와 안정적인 입지를 얻는다. 반대로 기존 업무에만 머물렀다면, 안정은 유지되지만 기술적 시장 경쟁력이나 성장 만족도에 대한 아쉬움이 커질 수 있다. 즉 이 선택은 파격적인 변화보다 안정적 기반을 지키는 데 강점이 있고, 성장의 폭은 회사를 바꾸느냐보다 회사 안에서 얼마나 의도적으로 기회를 만들었느냐에 달려 있게 된다."
  },
  "scenarioB": {
    "three_months": "스타트업으로 옮긴 직후 3개월은 기대감과 긴장감이 함께 간다. 개발자로서 더 가까이에서 새로운 기술 스택과 제품 의사결정을 접하면서 역할 범위가 넓어져, 이전 회사에서 느끼던 정체감은 다소 줄어든다. 다만 낮은 위험 감수 성향 때문에 고용 및 생활 안정성에 대한 불안은 쉽게 사라지지 않고, 연봉이나 복지 조건이 이전보다 조금 낮거나 불확실하게 느껴질 수 있다. 초기에는 업무 구조가 빠르게 바뀌고 책임이 넓어져 퇴근 후에도 머리가 바쁜 날이 많아 워라밸은 일시적으로 흔들리지만, 동시에 배우는 속도와 성장 체감은 분명히 커진다.",
    "one_year": "1년쯤 지나면 업무 흐름과 팀 문화에 익숙해지면서 감정의 기복은 줄고, 이직이 완전히 무모한 선택은 아니었다는 안도감이 생길 가능성이 크다. 새로운 기술을 실제 서비스에 적용한 경험이 쌓여 역할 변화와 커리어 성장 가능성은 이전보다 뚜렷해지고, 작은 조직에서 주도적으로 문제를 푼 경험이 이력에도 남는다. 반면 안정성과 워라밸은 회사 상황에 따라 편차가 커서, 제품 일정이나 투자 환경이 좋지 않으면 야근이 잦아지고 생활 리듬이 흔들릴 수 있다. 연봉은 기본급만 보면 큰 차이가 없더라도 성과 보상이나 스톡옵션 기대가 포함돼 체감이 복합적이며, 복지는 이전 직장보다 단순해져 아쉬움이 남을 수 있다.",
    "three_years": "3년 후에는 이직의 의미가 더 현실적으로 정리된다. 회사가 일정 수준 이상 자리를 잡았다면, 당신은 새로운 기술과 빠른 실행 환경을 경험한 개발자로서 시장가치가 높아지고 다음 커리어 선택지도 넓어진다. 그 경우 초반의 불안은 줄고, 성장 측면에서는 분명한 성과를 느끼지만, 안정성과 워라밸은 여전히 대기업이나 안정적인 조직보다 덜 예측 가능하다고 받아들이게 된다. 반대로 회사가 기대만큼 성장하지 못하더라도, 극단적 실패라기보다 연봉·복지·고용 안정성의 한계를 체감하며 다시 더 안정적인 회사로 이동할 준비를 하게 될 가능성이 높다. 즉, 이 선택은 낮은 위험 선호를 가진 사람에게 마음 편한 길은 아니지만, 생활 안정성을 일부 감수하는 대신 역할 변화, 기술 경험, 커리어 성장의 폭을 실제로 넓히는 방향으로 작동할 가능성이 크다."
  },
  "riskA": {
    "risk_level": "low",
    "reasons": [
      "사용자의 최우선 순위인 안정성·소득·워라밸이 3개월, 1년, 3년 시나리오 전반에서 크게 흔들리지 않고 유지되는 흐름이라 저위험 성향과 잘 맞는다.",
      "3개월과 1년 시점에서 이직 부담이 없고 연봉·복지·익숙한 업무 환경이 유지되어 생활 계획이 깨질 가능성이 낮다.",
      "1년 이후에도 소득은 큰 도약은 아니어도 정기 인상이나 성과급 수준에서 무난하게 관리될 가능성이 제시되어, 급격한 수입 하락 위험은 작다.",
      "주된 위험은 역할 변화와 새로운 기술 경험이 제한되어 3년 뒤 성장 정체감이나 시장 경쟁력 아쉬움이 커질 수 있다는 점이지만, 이는 생활 기반을 흔드는 직접적 위험보다는 기회비용에 가깝다."
    ]
  },
  "riskB": {
    "risk_level": "high",
    "reasons": [
      "사용자의 최우선 순위가 안정성인데, 시나리오 전반에서 스타트업의 고용 및 생활 안정성이 이전보다 덜 예측 가능하고 초반 3개월에도 불안이 쉽게 사라지지 않는다고 제시된다.",
      "연봉과 복지 역시 현재보다 조금 낮거나 불확실하게 느껴질 수 있고, 1년 시점에도 복지가 더 단순해져 아쉬움이 남을 수 있어 소득·보상 안정성을 중시하는 성향과 충돌한다.",
      "워라밸은 초기 적응기부터 흔들리고, 1년 후에도 제품 일정이나 투자 환경에 따라 야근이 잦아질 수 있어 우선순위인 생활 균형 측면의 리스크가 크다.",
      "3년 후 성장과 기술 경험의 이점은 크지만, 사용자 성향이 낮은 위험 감수인 만큼 장기적으로도 안정성과 예측 가능성을 일부 포기해야 한다는 점이 현실적인 부담으로 남는다."
    ]
  },
  "abReasoning": {
    "case_id": "case-01-career-stability",
    "input_summary": {
      "user_profile": {
        "age": 32,
        "job": "developer",
        "risk_tolerance": "low",
        "priority": [
          "stability",
          "income",
          "work_life_balance"
        ]
      },
      "decision_options": {
        "optionA": "현재 회사에 남는다",
        "optionB": "스타트업으로 이직한다",
        "context": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다."
      },
      "planner_goal": "career_change decision에서 고용 및 생활 안정성, 연봉 및 복지 수준, 역할 변화와 커리어 성장 가능성, 새로운 기술을 가까이서 다룰 기회, 워라밸 유지 가능성 기준으로 사용자에게 더 맞는 선택을 판별한다."
    },
    "reasoning": {
      "a_reasoning": {
        "stance": "conservative",
        "summary": "보수적 reasoning은 사용자의 risk_tolerance가 low이고 최우선 priority가 stability라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.",
        "key_assumptions": [
          "사용자는 stability 기준의 손실을 성장 기회보다 더 크게 체감한다.",
          "riskA=low, riskB=high 차이는 실제 선택 만족도에 직접 영향을 준다."
        ],
        "pros": [
          "선택지 A(현재 회사에 남는다)는 안정성, 예측 가능성, 회복 비용 측면에서 방어력이 높다.",
          "현재 시나리오 흐름에서는 급격한 생활 리듬 훼손 가능성이 상대적으로 낮다."
        ],
        "cons": [
          "성장 속도나 기회 폭이 제한될 수 있다.",
          "장기적으로는 기회비용을 더 크게 느낄 수 있다."
        ],
        "recommended_option": "A",
        "confidence": 0.76
      },
      "b_reasoning": {
        "stance": "opportunity_seeking",
        "summary": "기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.",
        "key_assumptions": [
          "사용자가 단기 불확실성을 감당할 수 있다면 장기 성장 체감은 더 커질 수 있다.",
          "decision context인 현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다.에서 정체 해소가 중요한 만족 요인이 될 수 있다."
        ],
        "pros": [
          "선택지 B(스타트업으로 이직한다)는 역할 변화와 성장 기회를 더 크게 열 수 있다.",
          "장기적으로는 기술 경험과 선택지 확장에 유리할 수 있다."
        ],
        "cons": [
          "riskB=high라면 사용자의 현재 성향과 직접 충돌할 수 있다.",
          "초기 적응 비용과 생활 변동성을 더 크게 감수해야 할 수 있다."
        ],
        "recommended_option": "B",
        "confidence": 0.64
      },
      "comparison": {
        "agreements": [
          "두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.",
          "두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다."
        ],
        "conflicts": [
          "A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.",
          "A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다."
        ],
        "which_fits_user_better": "A",
        "reason": "현재 입력에서는 risk_tolerance=low, primary_priority=stability, riskA=low, riskB=high 조합 때문에 A 쪽이 사용자 성향과 더 직접적으로 맞는다."
      },
      "final_selection": {
        "selected_reasoning": "A",
        "selected_option": "A",
        "why_selected": "최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 A reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.",
        "decision_confidence": 0.77
      }
    }
  },
  "advisorResult": {
    "recommended_option": "A",
    "reason": "사용자의 risk_tolerance가 low이고 최우선 기준이 stability이므로, full 경로에서 생성된 A/B reasoning의 최종 선택을 기본값으로 채택한다. 실행 모드는 full이며 riskA=low, riskB=high 조합을 함께 고려했을 때 현재는 A를 추천한다.",
    "reasoning_basis": {
      "selected_reasoning": "A",
      "core_why": "최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 A reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.",
      "decision_confidence": 0.77
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
    "scores": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "realism": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "consistency": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "profile_alignment": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "recommendation_clarity": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        }
      },
      "required": [
        "realism",
        "consistency",
        "profile_alignment",
        "recommendation_clarity"
      ]
    },
    "issues": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "scenario",
              "risk",
              "reasoning",
              "advisor",
              "profile"
            ]
          },
          "description": {
            "type": "string"
          }
        },
        "required": [
          "type",
          "description"
        ]
      }
    },
    "improvement_suggestions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "target": {
            "type": "string",
            "enum": [
              "planner",
              "scenario",
              "risk",
              "reasoning",
              "advisor"
            ]
          },
          "suggestion": {
            "type": "string"
          }
        },
        "required": [
          "target",
          "suggestion"
        ]
      }
    },
    "overall_comment": {
      "type": "string"
    }
  },
  "required": [
    "scores",
    "issues",
    "improvement_suggestions",
    "overall_comment"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-01-career-stability/reflection-result.json"
}
```
