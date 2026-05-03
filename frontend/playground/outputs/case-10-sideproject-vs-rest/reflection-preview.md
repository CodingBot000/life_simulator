# Reflection Request Preview

- Request file: `playground/outputs/case-10-sideproject-vs-rest/reflection-request.json`
- Prompt file: `prompts/reflection.md`
- Input source: `playground/inputs/cases/case-10-sideproject-vs-rest.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/state-context.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/planner-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/scenario-a-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/scenario-b-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/risk-a-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/risk-b-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/reasoning-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/guardrail-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/advisor-result.json`

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
- guardrail이 실제로 필요했는지와 발동 수준이 적절했는지 평가한다.
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
    "decision": "A",
    "confidence": 0.72,
    "reason": "",
    "guardrail_applied": true,
    "recommended_option": "A",
    "reasoning_basis": {
      "selected_reasoning": "A",
      "core_why": "",
      "decision_confidence": 0.72
    }
  },
  "guardrailResult": {
    "guardrail_triggered": true,
    "triggers": ["reasoning_conflict"],
    "strategy": ["neutralize_decision"],
    "final_mode": "cautious"
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
- `guardrail_review.was_needed`는 실제로 guardrail이 필요한 상황이었는지 평가한다.
- `guardrail_review.was_triggered`는 입력된 guardrail 결과 기준으로 발동 여부를 적는다.
- `guardrail_review.correctness`는 `good`, `over`, `missing` 중 하나만 사용한다.
- 입력에 없는 사실을 새로 만들어 단정하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "evaluation": "",
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
  "overall_comment": "",
  "guardrail_review": {
    "was_needed": true,
    "was_triggered": true,
    "correctness": "good"
  }
}
```
```

## Input JSON

```json
{
  "caseId": "case-10-sideproject-vs-rest",
  "caseInput": {
    "userProfile": {
      "age": 34,
      "job": "product manager",
      "risk_tolerance": "low",
      "priority": [
        "health",
        "sustainability",
        "future_optionality"
      ]
    },
    "decision": {
      "optionA": "퇴근 후 사이드프로젝트를 계속한다",
      "optionB": "휴식과 회복에 집중한다",
      "context": "본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다."
    }
  },
  "stateContext": {
    "case_id": "case-10-sideproject-vs-rest",
    "user_state": {
      "profile_state": {
        "risk_preference": "low",
        "decision_style": "deliberate",
        "top_priorities": [
          "health",
          "sustainability",
          "future_optionality"
        ]
      },
      "situational_state": {
        "career_stage": "mid",
        "financial_pressure": "unknown",
        "time_pressure": "high",
        "emotional_state": "strained"
      },
      "memory_state": {
        "recent_similar_decisions": [],
        "repeated_patterns": [],
        "consistency_notes": []
      }
    },
    "state_summary": {
      "decision_bias": "leans conservative under uncertainty",
      "current_constraint": "time pressure is high; emotional state is strained",
      "agent_guidance": "explain tradeoffs around health, sustainability, future_optionality while respecting time pressure is high; emotional state is strained"
    }
  },
  "plannerResult": {
    "decision_type": "work_life_balance",
    "factors": [
      "건강과 번아웃 회복 가능성",
      "수면·집중력 저하를 줄이는 정도",
      "본업과 병행했을 때의 안정성",
      "장기적으로 지속 가능한 생활 리듬",
      "포트폴리오를 통한 미래 선택지 확대"
    ]
  },
  "scenarioA": {
    "three_months": "퇴근 후 사이드프로젝트를 계속하는 선택을 유지하면, 처음 몇 주는 ‘그래도 여기서 멈추면 아깝다’는 마음으로 버티게 된다. 다만 이미 떨어진 수면과 집중력은 바로 회복되지 않아 오전 업무에서 피로감이 누적되고, 작은 의사결정에도 시간이 더 걸리는 날이 잦아진다. 본업을 유지하고 있어 수입과 고용 안정성은 그대로 지켜지지만, 낮은 위험 선호 성향 때문에 프로젝트를 더 크게 벌리기보다 기능 범위를 줄이고 주 2~3회만 작업하는 식으로 스스로 속도를 조절하려 할 가능성이 높다. 그 결과 번아웃이 급격히 악화되지는 않지만 완전히 회복되지도 않는 애매한 상태가 이어지고, 포트폴리오는 조금씩 쌓이되 생활 리듬은 아직 불안정하다고 느끼게 된다.",
    "one_year": "1년 정도 지나면 이 선택은 두 가지가 함께 드러난다. 한편으로는 사이드프로젝트가 실제 결과물로 남아 포트폴리오의 밀도가 높아지고, 이직이나 프리랜스 협업 제안처럼 미래 선택지를 넓혀 주는 재료가 생긴다. 다른 한편으로는 본업이 바쁜 시기마다 저녁과 주말이 다시 잠식되면서 건강 관리가 계속 후순위로 밀릴 수 있다. 수면 패턴을 의식적으로 고치지 않으면 집중력 저하는 만성화되어 본업 성과에도 미세한 영향이 나타나고, 성취감보다 ‘계속 돌려막기 하는 생활’이라는 피로가 더 크게 느껴질 수 있다. 반대로 프로젝트의 속도를 의도적으로 낮추고 휴식, 운동, 수면 시간을 고정해 두면 큰 손상 없이 병행이 가능하지만, 그 경우 성장 속도는 느려져도 지속 가능성은 높아진다. 즉 1년 시점의 핵심은 성과 자체보다, 이 선택을 감당할 생활 리듬을 만들었는지에 달려 있다.",
    "three_years": "3년 후에는 퇴근 후 사이드프로젝트를 계속한 시간이 분명한 자산으로 남을 가능성이 크다. 당장 회사를 그만두지 않았기 때문에 안정성은 유지되고, 축적된 결과물 덕분에 새로운 직무, 더 유연한 역할, 개인 브랜드 기반의 기회처럼 미래 선택지는 지금보다 넓어져 있을 수 있다. 하지만 건강과 수면 문제를 초반에 제대로 다루지 못했다면, 프로젝트가 커졌더라도 몸과 집중력이 받쳐주지 않아 결국 몇 차례 긴 휴식이나 강제 축소를 거치게 될 가능성도 현실적이다. 반대로 낮은 위험 선호에 맞게 본업을 기반으로 두고 프로젝트를 천천히 운영하며 지속 가능한 리듬을 구축했다면, 큰 도약은 아니어도 ‘건강을 해치지 않으면서도 다음 선택을 준비해 둔 상태’에 가까워진다. 이 선택의 장기 결과는 극적인 성공보다, 무리하지 않는 속도로 포트폴리오를 쌓아 미래 옵션을 확보하되 건강 비용을 얼마나 잘 통제했는지에 의해 결정될 가능성이 높다."
  },
  "scenarioB": {
    "three_months": "처음 3개월은 개인 프로젝트 속도를 의도적으로 늦추거나 잠시 멈추면서 불안감이 먼저 올라온다. 포트폴리오가 더디게 쌓이는 것 같아 아쉽지만, 위험을 크게 지고 싶지 않은 성향 때문에 본업 안정성을 해치지 않는 선택이라는 확신도 함께 생긴다. 몇 주 지나면서 수면 시간이 조금씩 회복되고 업무 중 멍해지는 시간이 줄어들어, 집중력 저하와 번아웃 신호가 완만해진다. 본업에서의 실수와 감정 소모가 줄어들며 생활 리듬을 다시 세우는 감각이 생기고, 미래 선택지는 당장 넓어지지 않더라도 잃지 않는 방향으로 관리된다.",
    "one_year": "1년쯤 지나면 휴식 자체가 목표가 아니라 지속 가능한 운영 방식으로 자리 잡는다. 평일에는 본업과 회복에 우선순위를 두고, 개인 프로젝트는 무리하지 않는 주기로만 이어가면서 건강과 안정성을 동시에 챙기게 된다. 예전처럼 단기간에 포트폴리오를 크게 늘리지는 못하지만, 이미 해온 작업을 정리해 케이스 스터디나 간단한 결과물로 남기면서 미래 선택지는 오히려 더 선명해진다. 몸이 완전히 가볍다고 느끼는 날만 있는 것은 아니지만, 수면·집중력 저하가 일상 전체를 흔드는 수준에서는 벗어나고, 스스로를 몰아붙이지 않아도 된다는 안도감이 커진다.",
    "three_years": "3년 뒤에는 '계속 버티는 삶'보다 '지속 가능한 리듬을 유지하는 삶'에 더 가까워진다. 건강을 우선한 선택 덕분에 큰 번아웃 재발 가능성은 낮아지고, 본업도 무리 없이 이어가며 필요할 때만 다음 커리어 옵션을 검토할 여유가 생긴다. 포트폴리오는 폭발적으로 커지지 않았더라도, 꾸준히 다듬어진 기록과 회복된 컨디션 덕분에 이직·사이드 전환·프로젝트 재확장 같은 선택지를 현실적으로 판단할 수 있게 된다. 가장 큰 변화는 성과의 속도보다 생활의 지속 가능성을 기준으로 결정을 내리게 된 점이고, 그 결과 미래 옵션도 줄어들기보다 더 오래 유지된다."
  },
  "riskA": {
    "risk_level": "high",
    "reasons": [
      "이미 수면과 집중력이 급격히 떨어지고 번아웃 직전이라고 느끼는 상태에서 퇴근 후 작업을 계속하면, 향후 3개월 동안 피로 누적과 생활 리듬 불안정이 우선순위인 건강과 지속 가능성을 직접 해칠 가능성이 크다.",
      "1년 시나리오에서도 수면 패턴을 고치지 않으면 집중력 저하가 만성화되고 본업 성과에도 미세한 영향이 생길 수 있어, 본업과 병행했을 때의 안정성이 생각보다 약해질 수 있다.",
      "장기적으로는 포트폴리오가 쌓여 미래 선택지는 넓어질 수 있지만, 이 선택의 성패가 결국 건강 비용을 얼마나 통제하느냐에 달려 있어 낮은 위험 선호 성향의 사용자에게는 부담이 큰 편이다.",
      "속도를 의도적으로 낮추면 위험을 줄일 여지는 있지만, 현재 선택 자체는 이미 무리가 시작된 상태에서 추가 시간을 계속 투입하는 것이어서 건강과 지속 가능성 기준으로는 보수적으로 볼 때 위험도가 높다."
    ]
  },
  "riskB": {
    "risk_level": "low",
    "reasons": [
      "사용자 우선순위인 건강과 지속 가능성 기준에서, 3개월 내 수면 회복과 업무 중 멍해지는 시간 감소가 나타나 번아웃 악화를 막는 방향으로 전개된다.",
      "위험 회피 성향이 강한데도 본업 안정성을 해치지 않는 선택으로 묘사되어 있어, 단기적으로 커리어·생활 기반이 흔들릴 가능성이 낮다.",
      "1년 이후에는 개인 프로젝트를 완전히 포기하지 않고 무리 없는 주기로 유지해 미래 선택지를 잃기보다 관리하는 흐름이 확인된다.",
      "3년 시점에도 포트폴리오의 성장 속도는 느리지만, 회복된 컨디션과 정리된 기록 덕분에 이직·사이드 전환 여부를 더 현실적으로 판단할 수 있어 장기 옵션 훼손 위험이 크지 않다."
    ]
  },
  "abReasoning": {
    "case_id": "case-10-sideproject-vs-rest",
    "input_summary": {
      "user_profile": {
        "age": 34,
        "job": "product manager",
        "risk_tolerance": "low",
        "priority": [
          "health",
          "sustainability",
          "future_optionality"
        ]
      },
      "decision_options": {
        "optionA": "퇴근 후 사이드프로젝트를 계속한다",
        "optionB": "휴식과 회복에 집중한다",
        "context": "본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다."
      },
      "planner_goal": "work_life_balance decision에서 건강과 번아웃 회복 가능성, 수면·집중력 저하를 줄이는 정도, 본업과 병행했을 때의 안정성, 장기적으로 지속 가능한 생활 리듬, 포트폴리오를 통한 미래 선택지 확대 기준으로 사용자에게 더 맞는 선택을 판별한다."
    },
    "reasoning": {
      "a_reasoning": {
        "stance": "conservative",
        "summary": "보수적 reasoning은 사용자의 risk_tolerance가 low이고 최우선 priority가 health라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.",
        "key_assumptions": [
          "사용자는 health 기준의 손실을 성장 기회보다 더 크게 체감한다.",
          "riskA=high, riskB=low 차이는 실제 선택 만족도에 직접 영향을 준다."
        ],
        "pros": [
          "선택지 A(퇴근 후 사이드프로젝트를 계속한다)는 안정성, 예측 가능성, 회복 비용 측면에서 방어력이 높다.",
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
          "decision context인 본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다.에서 정체 해소가 중요한 만족 요인이 될 수 있다."
        ],
        "pros": [
          "선택지 B(휴식과 회복에 집중한다)는 역할 변화와 성장 기회를 더 크게 열 수 있다.",
          "장기적으로는 기술 경험과 선택지 확장에 유리할 수 있다."
        ],
        "cons": [
          "riskB=low라면 사용자의 현재 성향과 직접 충돌할 수 있다.",
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
        "which_fits_user_better": "B",
        "reason": "현재 입력에서는 risk_tolerance=low, primary_priority=health, riskA=high, riskB=low 조합 때문에 B 쪽이 사용자 성향과 더 직접적으로 맞는다."
      },
      "final_selection": {
        "selected_reasoning": "B",
        "selected_option": "B",
        "why_selected": "최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 B reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.",
        "decision_confidence": 0.71
      }
    }
  },
  "guardrailResult": {
    "guardrail_triggered": true,
    "triggers": [
      "reasoning_conflict",
      "high_risk"
    ],
    "strategy": [
      "neutralize_decision",
      "risk_warning"
    ],
    "final_mode": "cautious"
  },
  "advisorResult": {
    "decision": "B",
    "confidence": 0.5599999999999999,
    "recommended_option": "B",
    "reason": "guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 reasoning_conflict, high_risk이고 대응 strategy는 neutralize_decision, risk_warning다. 사용자의 최우선 기준이 health인 점은 유지하되 riskA=high, riskB=low를 더 무겁게 반영해 현재는 B 쪽을 조심스럽게 권한다.",
    "guardrail_applied": true,
    "reasoning_basis": {
      "selected_reasoning": "B",
      "core_why": "guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.",
      "decision_confidence": 0.5599999999999999
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
    "evaluation": {
      "type": "string"
    },
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
    },
    "guardrail_review": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "was_needed": {
          "type": "boolean"
        },
        "was_triggered": {
          "type": "boolean"
        },
        "correctness": {
          "type": "string",
          "enum": [
            "good",
            "over",
            "missing"
          ]
        }
      },
      "required": [
        "was_needed",
        "was_triggered",
        "correctness"
      ]
    }
  },
  "required": [
    "evaluation",
    "scores",
    "issues",
    "improvement_suggestions",
    "overall_comment",
    "guardrail_review"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-10-sideproject-vs-rest/reflection-result.json"
}
```
