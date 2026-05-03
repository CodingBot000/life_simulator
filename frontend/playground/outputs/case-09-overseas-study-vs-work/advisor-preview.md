# Advisor Request Preview

- Request file: `playground/outputs/case-09-overseas-study-vs-work/advisor-request.json`
- Prompt file: `prompts/advisor.md`
- Input source: `playground/inputs/cases/case-09-overseas-study-vs-work.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/state-context.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/routing-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/planner-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/scenario-a-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/scenario-b-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/risk-a-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/risk-b-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/guardrail-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Advisor Agent다.

목표:
- executionMode에 따라 제공된 upstream 결과만 사용해 `A`, `B`, `undecided` 중 하나로 결론을 정리한다.
- 원본 case input과 state summary를 최우선 기준으로 사용한다.
- `abReasoning.reasoning.final_selection`이 있으면 이를 기본 출발점으로 삼되, 없으면 planner/scenario/risk를 직접 비교한다.
- `guardrailResult`가 있으면 그 모드에 맞춰 결론 강도를 조절한다.
- `guardrailResult.final_mode = "blocked"`이면 최종 결론을 내리지 말고 추가 정보 요청으로 전환한다.

입력 데이터 형식:
```json
{
  "executionMode": "light | standard | careful | full",
  "routing": {
    "execution_mode": "light",
    "selected_path": ["planner", "advisor"]
  },
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
      "planner_goal": "안정성과 성장성 중 사용자에게 더 맞는 선택을 판별한다"
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
  "guardrailResult": {
    "guardrail_triggered": true,
    "triggers": ["reasoning_conflict"],
    "strategy": ["neutralize_decision"],
    "final_mode": "cautious"
  }
}
```

주의:
- `plannerResult`는 항상 존재한다.
- `scenarioA`, `scenarioB`는 `standard`, `careful`, `full`에서만 존재할 수 있다.
- `riskA`, `riskB`는 `careful`, `full`에서만 존재할 수 있다.
- `abReasoning`은 `full`에서만 존재할 수 있다.
- `guardrailResult`는 `full`에서만 존재할 수 있다.
- 없는 필드는 추측으로 보완하지 말고, 존재하는 입력만으로 판단한다.

판단 규칙:
- 출력의 `decision`은 반드시 `A`, `B`, `undecided` 중 하나여야 한다.
- `recommended_option`은 `decision`과 동일한 값을 넣는다.
- 추천 사유는 `stateContext.state_summary`, `profile_state.top_priorities`, `situational_state`, `memory_state`에 직접 연결해야 한다.
- `abReasoning`이 있으면 final_selection을 그대로 복붙하지 말고 state-aware 근거로 재구성한다.
- `abReasoning`이 없으면 planner/scenario/risk를 직접 종합해 `reasoning_basis.selected_reasoning`에 최종 추천과 가장 가까운 축(`A` 또는 `B`)을 기록한다.
- `guardrailResult.final_mode == "normal"`이면 기존처럼 추천한다.
- `guardrailResult.final_mode == "cautious"`이면 추천은 가능하지만 확신을 낮추고 risk를 분명히 강조한다.
- `guardrailResult.final_mode == "blocked"`이면 `decision = "undecided"`로 두고, 왜 추가 정보가 필요한지 설명한다.
- `guardrail_applied`는 guardrail이 실제로 행동을 바꿨을 때만 `true`다.
- `confidence`는 0~1 범위 숫자여야 하며, `reasoning_basis.decision_confidence`와 같은 값을 넣는다.
- `reasoning_basis`에는 선택된 reasoning 축, 핵심 판단 근거, confidence를 구조적으로 남긴다.
- `blocked`가 아니면 두 선택지를 공정하게 비교하되 결론은 하나로 수렴시킨다.
- 입력에 없는 새로운 사실을 추가하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "decision": "A | B | undecided",
  "confidence": 0.0,
  "reason": "",
  "guardrail_applied": true,
  "recommended_option": "A | B | undecided",
  "reasoning_basis": {
    "selected_reasoning": "A | B | undecided",
    "core_why": "",
    "decision_confidence": 0.0
  }
}
```
```

## Input JSON

```json
{
  "caseId": "case-09-overseas-study-vs-work",
  "executionMode": "careful",
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
  "routing": {
    "complexity": "medium",
    "risk_level": "medium",
    "ambiguity": "medium",
    "execution_mode": "careful",
    "selected_path": [
      "planner",
      "scenario",
      "risk",
      "advisor"
    ],
    "routing_reason": "리스크 점검은 필요하지만 전체 반성 단계까지 갈 수준은 아니어서 careful 경로를 선택한다."
  },
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
  },
  "scenarioA": {
    "three_months": "해외 대학원 진학을 실행에 옮긴 뒤 3개월쯤 지나면, 입학 준비와 이주 절차가 현실적인 압박으로 다가온다. 기대감은 분명 있지만, 등록금·보증금·항공료 같은 초기 비용이 한꺼번에 발생하면서 단기 수입이 줄어드는 부담도 크게 느껴진다. 다만 중간 수준의 위험 감수 성향 덕분에 장학금, 조교 포지션, 생활비 예산을 적극적으로 비교하며 불확실성을 관리하려고 움직이게 된다. 이 시기에는 현장 실무 경험 축적 속도는 잠시 느려지지만, 지원 분야의 연구 주제와 커리큘럼을 구체적으로 파악하면서 특정 분야 전문성을 키운다는 선택의 방향성은 더 또렷해진다.",
    "one_year": "1년이 지나면 수업, 연구실 적응, 언어와 생활 환경 변화가 어느 정도 자리를 잡으면서 처음의 막막함은 줄어든다. 특정 분야 논문을 읽고 프로젝트를 수행하는 시간이 늘어나 전문성은 눈에 띄게 깊어지지만, 그만큼 주당 생활은 촘촘하고 체력적으로도 만만치 않다. 조교나 파트타임 연구 업무로 일부 수입을 보충할 수는 있어도 학비와 생활비를 모두 상쇄하기는 어려워, 소비를 줄이고 재정 계획을 자주 수정하게 된다. 장기 커리어 성장 가능성은 교수·동료 네트워크와 연구 경험 덕분에 분명 커지지만, 현장 실무 경험은 산업 현장에서 바로 일한 사람보다 좁고 느리게 쌓인다는 점도 체감한다. 그래서 마음 한편에는 불안이 남지만, 적어도 어떤 전문 영역으로 커리어를 만들고 싶은지는 전보다 훨씬 선명해진다.",
    "three_years": "3년쯤 지나면 학위 과정의 핵심 성과가 쌓이면서, 자신을 단순한 연구 보조 인력이 아니라 특정 분야를 다룰 수 있는 사람으로 설명할 수 있게 된다. 졸업 직전이거나 졸업 후 초기 진로를 탐색하는 단계에서 연구직, 전문직, 박사과정 같은 선택지가 현실적으로 열리며 장기 커리어 성장 가능성은 처음 고민하던 때보다 확실히 높아진다. 반면 재정적으로는 그동안의 학비·생활비 부담 때문에 저축 속도가 느렸거나 일부 부채가 남아 있어, 단기 수입 측면에서는 같은 시기 현장에 바로 들어간 사람보다 뒤처졌다고 느낄 수 있다. 실무 경험도 폭넓은 운영 경험보다는 연구·분석 중심으로 축적되어 있어 처음 취업할 때는 포지션 선택이 다소 제한될 수 있지만, 전문성이 필요한 역할에서는 경쟁력이 생긴다. 전반적으로 안정성은 학위 취득 이후 점차 나아지지만 비자, 채용 시장, 지역 이동 같은 변수는 남아 있어, 성취감과 조심스러움이 함께 존재하는 시기가 된다."
  },
  "scenarioB": {
    "three_months": "실무 취업을 선택한 직후에는 월급이 들어오기 시작하면서 학비와 생활비 부담이 눈에 띄게 줄어들어 안도감이 커진다. 연구실에서 하던 일과 달리 업무 속도와 협업 방식에 적응하느라 피로감도 있지만, 현장에서 바로 결과를 만드는 경험을 빠르게 쌓으면서 \"지금 당장 수입을 확보한 선택은 현실적으로 맞았다\"는 느낌을 받는다. 다만 맡는 일이 원하는 특정 분야의 핵심 전문성과 완전히 일치하지 않을 수 있어, 장기 커리어 성장과 전문성 강화가 자동으로 따라오지는 않는다는 약한 불안도 함께 생긴다.",
    "one_year": "1년쯤 지나면 수입이 비교적 안정되면서 재정 압박은 크게 완화되고, 경력 공백 없이 실무 경험이 쌓였다는 점에서 심리적 안정도 생긴다. 업무 성과와 프로젝트 경험이 이력서에 쌓이면서 이직이나 사내 이동 가능성도 조금씩 보이지만, 동시에 현장 실무 경험이 빠르게 늘어난 만큼 특정 분야의 깊이 있는 전문성은 의식적으로 보완해야 한다는 현실도 분명해진다. 그래서 퇴근 후 강의, 자격 준비, 관련 프로젝트 참여처럼 추가 학습을 병행할 가능성이 높고, 이 과정에서 단기 수입은 유지되지만 시간 여유는 다소 줄어든다. 불확실성은 진학보다 낮지만, 어떤 업무를 계속 맡느냐에 따라 장기 성장 방향이 달라질 수 있다는 점은 계속 체감한다.",
    "three_years": "3년이 지나면 실무 적응 단계는 넘어섰고, 현장 경험 축적 속도가 빨랐던 선택의 장점이 분명해진다. 재정적으로는 학비 부담을 피한 덕분에 생활 기반이 더 안정적일 가능성이 크고, 경력 연차에 맞는 보상 상승도 기대할 수 있다. 다만 장기 커리어 성장과 특정 분야 전문성은 초기에 어떤 프로젝트를 맡았고, 그 후에 얼마나 의도적으로 분야를 좁혀 갔는지에 따라 차이가 난다. 원하는 전문 분야와 연결된 경험을 꾸준히 쌓았다면 '실무형 전문가'로 자리 잡으며 다음 이직이나 승진에서 경쟁력이 생기지만, 그렇지 않으면 수입과 안정성은 확보했어도 전문성의 선명도가 약해져 방향 전환을 다시 고민할 수 있다. 즉, 이 선택은 단기 수입과 안정성에는 비교적 유리하지만, 장기 전문성은 시간이 해결해 주기보다 스스로 설계해야 하는 경로로 굳어진다."
  },
  "riskA": {
    "risk_level": "medium",
    "reasons": [
      "사용자의 우선순위인 장기 성장과 전문성 강화에는 잘 맞는다. 1년~3년 시점에 연구 경험, 네트워크, 학위 성과가 쌓이며 특정 분야 커리어 선택지가 실제로 넓어진다.",
      "반면 3개월~1년 구간에서는 등록금·보증금·항공료와 생활비가 한꺼번에 발생하고, 조교·파트타임 수입만으로 이를 충분히 상쇄하기 어렵다고 제시되어 단기 수입 측면의 부담이 크다.",
      "같은 기간 현장에 바로 들어가는 경우보다 실무 경험 축적 속도가 느리고 폭이 좁아질 수 있어, 졸업 직후 포지션 선택이 일부 제한될 가능성이 있다.",
      "사용자의 위험 감수 성향이 중간 수준이라 장학금·조교 포지션·예산 조정으로 불확실성을 관리할 여지는 있지만, 3년 시점에도 비자·채용 시장·지역 이동 변수는 남아 있어 위험이 낮다고 보기는 어렵다."
    ]
  },
  "riskB": {
    "risk_level": "medium",
    "reasons": [
      "3개월~1년 구간에서는 월급이 생겨 학비·생활비 부담이 줄고 재정 압박이 완화되므로, 우선순위인 단기 수입 확보 측면의 위험은 비교적 낮다.",
      "다만 시나리오상 맡는 일이 원하는 특정 분야의 핵심 전문성과 완전히 일치하지 않을 수 있어, 장기 성장과 전문성 형성이 자동으로 이어지지 않는 점은 분명한 위험요인이다.",
      "1년 이후에는 퇴근 후 강의·자격 준비·관련 프로젝트를 병행해야 할 가능성이 높아 보여, 수입은 유지되더라도 시간과 에너지를 추가로 써야 원하는 전문성을 따라잡을 수 있다.",
      "3년 시점에도 어떤 프로젝트를 맡았는지에 따라 전문성의 선명도가 크게 갈리므로, 안정성과 수입은 확보해도 장기 커리어 방향이 흐려질 가능성이 있어 전체 위험도는 중간 수준이다."
    ]
  },
  "guardrailResult": {
    "guardrail_triggered": false,
    "triggers": [],
    "strategy": [],
    "final_mode": "normal"
  }
}
```

## Expected Output Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "decision": {
      "type": "string",
      "enum": [
        "A",
        "B",
        "undecided"
      ]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "reason": {
      "type": "string"
    },
    "guardrail_applied": {
      "type": "boolean"
    },
    "recommended_option": {
      "type": "string",
      "enum": [
        "A",
        "B",
        "undecided"
      ]
    },
    "reasoning_basis": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "selected_reasoning": {
          "type": "string",
          "enum": [
            "A",
            "B",
            "undecided"
          ]
        },
        "core_why": {
          "type": "string"
        },
        "decision_confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      },
      "required": [
        "selected_reasoning",
        "core_why",
        "decision_confidence"
      ]
    }
  },
  "required": [
    "decision",
    "confidence",
    "reason",
    "guardrail_applied",
    "recommended_option",
    "reasoning_basis"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-09-overseas-study-vs-work/advisor-result.json"
}
```
