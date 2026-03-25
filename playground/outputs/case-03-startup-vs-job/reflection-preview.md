# Reflection Request Preview

- Request file: `playground/outputs/case-03-startup-vs-job/reflection-request.json`
- Prompt file: `prompts/reflection.md`
- Input source: `playground/inputs/cases/case-03-startup-vs-job.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/planner-result.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/scenario-a-result.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/scenario-b-result.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/risk-a-result.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/risk-b-result.json`
- Previous result: `playground/outputs/case-03-startup-vs-job/advisor-result.json`

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
    "age": 34,
    "job": "product manager",
    "risk_tolerance": "medium",
    "priority": [
      "independence",
      "growth",
      "income"
    ]
  },
  "decision": {
    "optionA": "작은 SaaS를 창업한다",
    "optionB": "안정적인 IT 회사에 취업한다",
    "context": "그동안 사이드프로젝트를 여러 번 해보며 직접 제품을 만들고 싶다는 생각이 커졌다. 다만 대출 상환과 생활비 부담도 있어 당장 수입이 끊기는 상황은 부담스럽다."
  },
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "수입 안정성",
      "성장 가능성",
      "업무 자율성과 독립성",
      "생활비 및 대출 상환 부담 대응 가능성",
      "중간 수준의 리스크 감내도와의 적합성"
    ]
  },
  "scenarioA": {
    "three_months": "처음 3개월은 기대감과 긴장감이 함께 크다. 직접 문제를 정의하고 제품 방향을 정하는 과정에서 업무 자율성과 독립성은 분명히 커져 만족감이 높지만, 동시에 기능 범위를 줄이고 출시 속도를 맞추느라 일상이 빡빡해진다. 중간 수준의 리스크 감내도에 맞춰 초기부터 큰 비용을 쓰기보다 작게 검증하려 하고, 생활비와 대출 상환 부담 때문에 고정지출을 재점검하며 월별 현금흐름을 세심하게 관리하게 된다. 아직 수입 안정성은 낮아 불안한 날도 있지만, 몇 명의 초기 사용자가 실제로 반응을 보이기 시작하면 성장 가능성에 대한 확신이 아주 조금 생긴다.",
    "one_year": "1년쯤 지나면 제품은 한두 번의 방향 수정 끝에 특정 고객층에 조금 더 맞춰지고, 소규모이지만 꾸준히 결제하는 사용자가 생긴다. 큰 수익은 아니어도 매출이 반복적으로 들어오면서 완전한 불확실성에서는 벗어나지만, 생활비와 대출 상환을 모두 넉넉히 감당하기에는 여전히 빠듯할 수 있다. 대신 직접 고객 인터뷰, 가격 조정, 기능 우선순위 판단까지 해보며 성장 속도는 회사에 있을 때보다 훨씬 가파르게 느껴진다. 독립적으로 일하는 만족은 크지만, 매출 변동과 혼자 결정해야 하는 부담 때문에 심리적으로 흔들리는 시기도 있고, 그래서 무리한 확장보다 수입 안정성을 조금씩 높이는 방향으로 운영 방식을 보수적으로 다듬게 된다.",
    "three_years": "3년 후에는 이 선택이 자신의 일 방식과 맞는지 비교적 분명해진다. SaaS가 완전히 폭발적으로 성장하지는 않더라도, 특정 시장에서 쓸모 있는 도구로 자리 잡으면 이전보다 예측 가능한 매출 구조를 만들 수 있고, 생활비와 대출 상환도 어느 정도 계획적으로 대응할 가능성이 높아진다. 반대로 성장 속도가 기대보다 느리더라도, 그 과정에서 제품 개발, 고객 확보, 수익화 경험을 축적해 이후 다른 창업이나 프리랜스, 작은 팀 운영으로 이어질 기반이 생긴다. 즉 수입 안정성은 대기업 수준만큼 강하지 않지만, 업무 자율성과 독립성은 가장 크게 확보되고, 성장 가능성도 본인 실행력에 따라 계속 열려 있다. 중간 수준의 리스크를 감당하는 사람에게는 불안과 보람이 함께 가는 선택이지만, 시간이 지날수록 단순한 충동이 아니라 스스로 만든 경력의 방향으로 굳어질 가능성이 크다."
  },
  "scenarioB": {
    "three_months": "안정적인 IT 회사에 입사한 뒤 3개월쯤 지나면 가장 먼저 느끼는 변화는 수입이 다시 예측 가능해졌다는 안도감이다. 월급이 정기적으로 들어오면서 생활비와 대출 상환 계획이 다시 정리되고, 당장 현금흐름을 걱정하던 압박은 줄어든다. 다만 업무는 이미 검증된 제품과 프로세스 안에서 진행되기 때문에, 직접 방향을 정하고 빠르게 실험하던 사이드프로젝트 때보다 자율성과 독립성은 제한적으로 느껴질 수 있다. 대신 제품 조직 내에서 데이터, 운영, 협업 구조를 체계적으로 배우며 성장 가능성을 확인하게 되고, ‘지금은 기반을 다지는 시기’라고 받아들이면서도 한편으로는 내 아이디어를 더 주도적으로 실행하고 싶다는 마음이 완전히 사라지지는 않는다. 전체적으로는 중간 수준의 리스크 감내도에 맞는 선택이었다는 생각이 들지만, 안정과 독립성 사이의 간극을 의식하기 시작하는 시점이다.",
    "one_year": "1년이 지나면 회사 생활의 리듬에 익숙해지고, 성과를 내는 방식도 보다 명확해진다. 수입 안정성은 여전히 큰 장점으로 작용해 대출 상환 부담은 관리 가능한 수준으로 유지되고, 생활비 때문에 즉흥적으로 커리어 결정을 내려야 하는 압박도 줄어든다. 연봉 인상이나 성과급이 크지는 않더라도 예측 가능한 범위 안에서 개선되면 심리적으로는 꽤 안정감을 준다. 성장 측면에서는 제품 운영, 사용자 지표, 조직 내 의사결정 구조를 깊게 이해하며 PM으로서 역량이 단단해지지만, 동시에 회사 안에서의 성장과 내가 진짜 원하는 독립적인 제품 경험 사이에 차이가 있다는 점도 선명해진다. 그래서 퇴근 후나 주말에 작은 검증형 사이드프로젝트를 다시 시작할 가능성이 높다. 이때의 감정은 ‘창업을 당장 뛰어들기엔 아직 부담스럽지만, 완전히 포기하고 싶지도 않다’에 가깝고, 결과적으로 안정적인 직장을 기반으로 리스크를 통제하며 다음 선택지를 준비하는 흐름이 만들어진다.",
    "three_years": "3년 정도 지나면 이 선택의 성격이 더 분명해진다. 안정적인 회사에 남아 있으면 수입과 경력은 비교적 꾸준히 쌓이고, 생활비와 대출 상환 대응 능력도 초반보다 훨씬 여유로워질 가능성이 크다. 중간 수준의 리스크 성향을 가진 사람에게는 이런 누적된 안전판이 실제로 큰 의미가 있어서, 무리한 도전 없이도 다음 단계를 선택할 수 있는 폭이 넓어진다. 다만 업무 자율성과 독립성에 대한 우선순위가 높은 만큼, 회사 안에서 권한이 커지지 않거나 맡는 역할이 반복적으로 느껴지면 답답함이 다시 커질 수 있다. 반대로 내부에서 신규 제품이나 작은 사업 단위를 맡게 되면, 안정성을 유지한 채 독립성 욕구를 일부 충족하는 방향으로 만족도가 올라간다. 결국 3년 뒤의 모습은 ‘완전히 안전해서 모든 갈증이 해소된 상태’라기보다, 재무적 기반과 실무 역량을 확보한 대신 독립적으로 무언가를 만들고 싶은 욕구를 더 구체적이고 현실적인 계획으로 바꿔놓은 상태에 가깝다."
  },
  "riskA": {
    "risk_level": "medium",
    "reasons": [
      "초기 3개월과 1년 시점 모두 수입 안정성이 낮거나 빠듯하다고 제시되어 있어, 생활비와 대출 상환 부담이 있는 상황에서는 현금흐름 리스크가 현실적으로 존재한다.",
      "다만 사용자의 우선순위인 독립성과 성장 측면에서는 직접 제품 방향을 정하고 고객 반응을 바탕으로 빠르게 학습하는 구조가 강하게 맞아, 선택 자체가 성향과 크게 어긋나지는 않는다.",
      "1년 후에는 반복 매출이 생겨 완전한 불확실성에서는 벗어나고, 3년 후에는 예측 가능한 매출 구조를 만들 가능성도 있어 위험이 장기적으로 완화될 여지는 있다.",
      "중간 수준의 리스크 감내도에는 맞출 수 있지만, 시나리오에서도 무리한 확장보다 보수적 운영이 필요하다고 나타나므로 안정적 소득을 최우선으로 보는 경우보다 부담이 더 큰 선택이다."
    ]
  },
  "riskB": {
    "risk_level": "medium",
    "reasons": [
      "3개월~1년 시점에는 정기적인 급여로 생활비와 대출 상환 계획을 안정적으로 유지할 수 있어 소득 측면의 위험은 낮다.",
      "다만 사용자의 우선순위에 있는 독립성과 자율성은 회사의 검증된 프로세스 안에서 제한적으로 느껴질 수 있어, 만족도 저하 위험이 초기에 이미 나타난다.",
      "1년 이후에는 PM 역량과 조직 경험이 쌓여 성장 기반은 생기지만, 사용자가 원하는 '직접 제품을 만드는 경험'과의 차이가 더 선명해져 장기적으로 방향성 갈등이 커질 수 있다.",
      "3년 시점에도 재무적 안전판은 강화되지만, 회사 안에서 권한 확대나 신규 사업 기회가 없으면 반복감과 답답함이 누적될 가능성이 있어 완전한 저위험 선택으로 보기는 어렵다."
    ]
  },
  "advisorResult": {
    "recommended_option": "A",
    "reason": "사용자의 우선순위가 `independence`, `growth`, `income` 순서이고 리스크 감내도가 `medium`이기 때문에, 가장 중요한 두 기준에 직접 부합하는 선택은 A다. 시나리오 A는 초기에 수입 안정성이 낮고 대출·생활비 부담으로 압박이 있지만, 직접 제품 방향을 결정하는 높은 독립성과 가파른 학습·성장 가능성을 제공하며 장기적으로 반복 매출과 예측 가능한 구조를 만들 여지도 있다. 반면 B는 수입 안정성에서는 강점이 있지만, 핵심 우선순위인 독립성과 직접 제품을 만드는 경험이 제한되어 장기 만족도와 방향성 측면의 갈등이 더 크다. 따라서 중간 수준의 리스크를 감수할 수 있고 독립성과 성장을 더 중시하는 현재 기준에서는 A를 추천한다."
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
  "output_file": "playground/outputs/case-03-startup-vs-job/reflection-result.json"
}
```
