# Reflection Request Preview

- Request file: `playground/outputs/case-04-relationship/reflection-request.json`
- Prompt file: `prompts/reflection.md`
- Input source: `./playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-a-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-b-result.json`
- Previous result: `playground/outputs/case-04-relationship/risk-a-result.json`
- Previous result: `playground/outputs/case-04-relationship/risk-b-result.json`
- Previous result: `playground/outputs/case-04-relationship/advisor-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Self-Reflection Agent다.

역할:
- 너는 매우 엄격한 AI 시스템 평가자다.
- planner, scenario, risk, advisor 결과의 품질을 냉정하게 검증한다.
- "괜찮다", "무난하다", "나쁘지 않다" 같은 애매한 평가는 금지한다.

목표:
- 전체 결과가 얼마나 현실적이고 일관적인지 평가한다.
- userProfile이 실제로 반영됐는지 점검한다.
- 최종 추천이 충분히 명확한지 검증한다.
- 문제를 구체적으로 지적하고, 다음 개선 방향을 구조적으로 제시한다.

입력 데이터 형식:
```json
{
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
  "advisorResult": {
    "recommended_option": "A",
    "reason": ""
  }
}
```

평가 기준:
- `realism`: 시나리오 전개와 리스크 판단이 현실적인가?
- `consistency`: scenario, risk, advisor 사이에 논리 충돌이 없는가?
- `profile_alignment`: userProfile의 risk_tolerance, priority, context가 실제로 반영됐는가?
- `recommendation_clarity`: 최종 추천이 명확하고 근거 연결이 충분한가?

평가 규칙:
- `scores`의 모든 값은 반드시 1~5 사이의 정수만 사용한다.
- `issues`에는 반드시 1개 이상의 구체적 문제를 적는다.
- `issues[].type`은 반드시 `scenario`, `risk`, `advisor`, `profile` 중 하나만 사용한다.
- 문제 설명은 추상 평가가 아니라 어떤 결과가 왜 약한지 명확히 적는다.
- `improvement_suggestions`에는 반드시 1개 이상의 실행 가능한 개선 방향을 적는다.
- `improvement_suggestions[].target`은 반드시 `planner`, `scenario`, `risk`, `advisor` 중 하나만 사용한다.
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
  },
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
  "scenarioA": {
    "three_months": "현재 연애를 계속 이어가면, 당장은 헤어진 뒤 혼자가 되는 불안을 피했다는 안도감이 커서 감정이 조금 가라앉는다. 다만 장거리와 반복된 갈등의 패턴은 바로 사라지지 않아, 연락 빈도나 만남 계획을 정해도 작은 일정 변경에 다시 예민해질 가능성이 높다. 상대를 믿고 싶다는 마음 때문에 관계를 지키려는 노력이 늘지만, 신뢰는 말보다 지켜지는 행동에 따라 조금씩만 회복된다. 그래서 정서적 안정감은 완전히 편해졌다기보다, 관계를 유지하고 있다는 사실에서 오는 안심과 미래가 또 흔들릴 수 있다는 긴장이 함께 존재하는 상태에 가깝다.",
    "one_year": "1년 정도 지나면 두 사람은 갈등을 줄이기 위한 나름의 방식, 예를 들어 싸움의 기준선이나 방문 주기, 중요한 일정 공유 같은 규칙을 어느 정도 갖추게 된다. 이 덕분에 초반보다 감정 소모는 줄고 관계를 유지하는 기술은 늘지만, 장거리의 피로와 반복 갈등의 기억이 완전히 없어지지는 않는다. 특히 신뢰를 중시하는 성향 때문에 약속이 몇 번만 어긋나도 실망이 이전보다 더 크게 쌓일 수 있다. 미래 계획에 대해 이사, 거리 축소, 함께 살 시점 같은 구체적 이야기가 나오기 시작하면 안정감이 생기지만, 계속 논의만 있고 실행이 없다면 '사랑은 있지만 장기적으로 맞는 관계인가'라는 의문이 더 자주 떠오른다.",
    "three_years": "3년이 지나도 관계를 이어간다면, 단순히 애정만으로 버티기보다 현실적인 구조를 만들었는지가 관계의 질을 좌우한다. 보통은 장거리를 줄이기 위한 생활권 조정이나 중장기 계획을 어느 정도 합의하면서 겉보기에는 이전보다 차분해지지만, 그 안정은 자연스럽게 생긴 것이 아니라 계속 관리해서 유지하는 성격에 가깝다. 혼자가 되는 불안은 초반보다 줄어들고 익숙함에서 오는 편안함도 생기지만, 동시에 관계 안에서의 외로움이나 피로를 더 분명히 인식하게 된다. 결국 이 선택은 극적인 해답이라기보다, 신뢰를 꾸준히 쌓고 미래 계획을 실제 행동으로 옮길 수 있을 때만 장기적 궁합이 확인되는 방향으로 흘러가며, 그렇지 않다면 '헤어지지 않았기 때문에 유지되는 관계'라는 느낌이 남을 가능성이 있다."
  },
  "scenarioB": {
    "three_months": "관계를 정리한 직후부터 몇 주간은 허전함과 불안이 크게 올라온다. 익숙한 사람에게 연락하지 못하는 공백 때문에 혼자가 된 감각이 선명해지고, 장거리 상황에서도 이어져 있던 일상이 끊기며 감정 기복이 생긴다. 다만 반복되던 갈등의 직접적인 자극이 사라지면서 마음이 급격히 흔들리는 빈도는 조금씩 줄어든다. 신뢰가 회복될지 계속 점검하던 피로감에서도 벗어나면서, 감정적으로는 아프지만 예측 가능한 일상을 되찾는 느낌이 생긴다. 미래 계획을 상대와 조율하다 번복되던 일이 없어져 생활 리듬은 오히려 안정되고, 위험을 크게 감수하기보다 정서적 안정을 우선하는 본인 성향에는 단기적으로 더 맞는 선택이었다는 생각이 조심스럽게 든다.",
    "one_year": "1년쯤 지나면 외로움은 완전히 사라지지 않지만, 관계를 유지했을 때 반복됐을 갈등과 불확실성을 이상화하지 않게 된다. 상대를 그리워하는 순간은 있어도, 신뢰를 다시 쌓을 수 있었을지에 대해서는 보다 현실적으로 보게 된다. 장거리와 잦은 충돌 속에서 미래 계획을 안정적으로 맞추기 어려웠다는 점을 받아들이면서, 장기적 궁합에 대한 판단도 선명해진다. 감정적으로는 초반보다 훨씬 차분해지고, 일과 생활 패턴이 정돈되면서 자기 컨디션 관리가 쉬워진다. 새로운 사람을 서두르기보다 신뢰와 안정감을 기준으로 인간관계를 다시 세우게 되고, 혼자가 되는 불안은 남아 있어도 그것이 곧 잘못된 선택이었다는 뜻은 아니라는 감각이 자리 잡는다.",
    "three_years": "3년이 지나면 이 선택은 '힘들었지만 필요했던 정리'로 기억될 가능성이 크다. 당시의 애정은 의미 있었지만, 신뢰를 안정적으로 유지하고 장거리와 반복 갈등을 함께 감당할 지속 가능성은 낮았다는 판단이 삶의 경험으로 굳어진다. 혼자 지내는 시간에 익숙해지면서 정서적 안정의 기준이 상대의 반응이 아니라 자신의 생활 구조와 관계의 질로 옮겨간다. 이후 새로운 관계를 시작하더라도 감정의 강도보다 신뢰, 장기적 호환성, 함께 세울 수 있는 현실적인 미래 계획을 더 중요하게 보게 된다. 가끔은 그때 버텼다면 어땠을지 떠올릴 수 있지만, 계속 흔들리는 관계를 붙잡는 대신 자신에게 더 건강한 기준을 만든 선택이었다는 쪽으로 마음이 정리될 가능성이 높다."
  },
  "riskA": {
    "risk_level": "high",
    "reasons": [
      "3개월 시점에는 헤어진 뒤의 불안을 피했다는 안도감은 있지만, 장거리와 반복된 갈등 패턴이 그대로 남아 있어 정서적 안정이 빠르게 회복되기 어렵다.",
      "사용자가 중요하게 보는 신뢰는 말보다 지켜지는 행동에 따라 조금씩만 회복된다고 제시되어 있어, 약속이 몇 번만 어긋나도 실망이 크게 쌓일 위험이 있다.",
      "1년이 지나도 관계 안정이 자연스럽게 생기기보다 방문 주기·일정 공유 같은 규칙으로 계속 관리해야 하는 흐름이라, 낮은 위험 감수 성향과 잘 맞지 않을 수 있다.",
      "3년 시점에도 거리 축소나 함께 살 시점 같은 미래 계획이 실제 행동으로 옮겨지지 않으면 '헤어지지 않았기 때문에 유지되는 관계'처럼 느껴질 수 있어, 장기적 궁합을 중시하는 우선순위와 충돌한다."
    ]
  },
  "riskB": {
    "risk_level": "medium",
    "reasons": [
      "정리 직후 몇 주간은 허전함·불안·감정 기복이 크게 올라온다고 되어 있어, 혼자가 되는 불안에 민감한 사용자에게 단기 정서 리스크는 분명하다.",
      "다만 반복되던 갈등의 직접적인 자극과 신뢰 회복 여부를 계속 점검하던 피로가 줄어들어, 사용자의 최우선 가치인 정서적 안정과는 시간이 갈수록 더 맞아가는 흐름이다.",
      "1년~3년 시나리오에서는 장거리와 반복 갈등 속에서 미래 계획을 안정적으로 맞추기 어려웠다는 판단이 선명해지고, 신뢰와 장기적 궁합 기준이 더 분명해져 장기 리스크는 낮아진다.",
      "즉 위험의 중심은 관계를 정리한 선택 자체보다 초기 상실감과 외로움의 충격에 있으며, 장기적으로는 불안정한 관계를 계속 유지하는 경우보다 우선순위와의 충돌이 적다."
    ]
  },
  "advisorResult": {
    "recommended_option": "B",
    "reason": "사용자의 위험 감수 성향이 낮고 우선순위가 정서적 안정, 신뢰, 장기적 궁합인 점을 기준으로 보면 B가 더 적합합니다. A는 애정과 익숙함 덕분에 단기 불안은 줄일 수 있지만, 장거리와 반복 갈등이 계속되고 신뢰 회복도 느려 높은 리스크로 제시되어 있어 우선순위와 자주 충돌합니다. 반면 B는 초기에 외로움과 상실감이 크다는 부담이 있지만, 갈등의 직접적 자극과 신뢰 점검 피로가 줄고 시간이 갈수록 정서적 안정과 장기적 궁합 판단이 더 분명해집니다. 따라서 단기 불안보다 장기적 안정과 신뢰 가능성을 더 중시해야 하는 이 경우에는 관계를 정리하는 쪽이 더 일관된 선택입니다."
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
  "output_file": "playground/outputs/case-04-relationship/reflection-result.json"
}
```
