# Advisor Request Preview

- Request file: `playground/outputs/advisor-request.json`
- Prompt file: `prompts/advisor.md`
- Input source: `playground/inputs/sample-input.json`
- Previous result: `playground/outputs/planner-result.json`
- Previous result: `playground/outputs/scenario-a-result.json`
- Previous result: `playground/outputs/scenario-b-result.json`
- Previous result: `playground/outputs/risk-a-result.json`
- Previous result: `playground/outputs/risk-b-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Advisor Agent다.

목표:
- scenarioA, scenarioB, riskA, riskB를 비교해 A/B 중 하나만 추천한다.
- 사용자의 `risk_tolerance`와 `priority`를 최우선 판단 기준으로 사용한다.
- 결론은 분명해야 하며, 양비론이나 회피 답변은 금지한다.

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
  }
}
```

판단 규칙:
- 반드시 `recommended_option`에 `A` 또는 `B` 중 하나만 넣는다.
- 추천 사유는 사용자의 우선순위와 리스크 허용도에 직접 연결해야 한다.
- 두 선택지를 공정하게 비교하되 결론은 하나로 수렴시킨다.
- 입력에 없는 새로운 사실을 추가하지 않는다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "recommended_option": "A | B",
  "reason": ""
}
```
```

## Input JSON

```json
{
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
    "context": "현재 연봉은 안정적이지만 성장 정체를 느낌"
  },
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "안정성 및 리스크",
      "현재 및 향후 소득",
      "업무-삶 균형",
      "커리어 성장 가능성"
    ]
  },
  "scenarioA": {
    "three_months": "현재 회사에 남은 뒤 첫 3개월은 큰 변동 없이 지나간다. 익숙한 팀과 업무 흐름 덕분에 심리적으로는 안도감이 크고, 낮은 위험 선호와 안정성 우선이라는 성향에도 잘 맞는다. 월급과 복지, 근무 리듬이 그대로 유지되어 소득과 업무-삶 균형은 당장 흔들리지 않는다. 다만 프로젝트를 반복적으로 처리하면서 성장 정체감은 더 분명해지고, 마음 한편에는 '편하지만 이대로 괜찮을까'라는 답답함이 남는다. 대신 이 시기에는 외부 이직 스트레스 없이 사내에서 맡을 수 있는 작은 개선 과제나 기술 학습 기회를 찾기 시작할 가능성이 높다.",
    "one_year": "1년이 지나면 선택의 장단점이 더 또렷해진다. 회사에 남은 덕분에 고용 안정성과 꾸준한 소득은 유지되고, 큰 생활 변화 없이 일상은 비교적 안정적이다. 연봉 인상은 있더라도 물가나 시장 기대를 크게 앞서지 않는 수준일 가능성이 높아, 소득 면에서는 '안정적이지만 크게 뛰지는 않는' 느낌을 받는다. 업무-삶 균형은 대체로 지켜지지만, 회사 상황에 따라 특정 시기에는 익숙한 사람에게 일이 몰리면서 피로감이 생길 수 있다. 커리어 성장 측면에서는 직급이나 책임 범위가 조금 넓어질 수 있으나, 새로운 환경에서 얻는 급격한 학습보다는 완만한 성장에 가깝다. 그래서 마음은 한결 편하지만, 성장 욕구는 완전히 해소되지 않아 사내 이동이나 외부 학습을 진지하게 고민하게 된다.",
    "three_years": "3년 후에는 이 선택이 '안정적인 대신 변화 속도는 느린 경로'였다는 점이 분명해진다. 꾸준한 소득과 비교적 예측 가능한 생활 패턴 덕분에 재정 계획과 개인 생활은 안정적으로 굴러갈 가능성이 크고, 업무-삶 균형도 크게 무너지지 않는다. 회사 안에서 신뢰를 얻어 핵심 실무자나 중간 리더 역할을 맡을 수 있어 내부 안정성은 오히려 높아질 수 있다. 그러나 커리어 성장 가능성은 회사의 사업 방향과 기술 환경에 강하게 묶이기 때문에, 별도 노력이 없다면 시장에서의 경쟁력은 천천히 정체될 수 있다. 이 시점의 감정은 완전한 만족이나 후회보다는 '생활은 안정됐지만 더 일찍 성장 전략을 세웠어야 했나'에 가까울 가능성이 높다. 결국 현재 회사에 남는 선택은 리스크를 낮추고 기반을 지키는 데는 유리하지만, 성장과 향후 소득 확대를 위해서는 내부 역할 확장이나 지속적인 자기계발이 함께 있어야 의미가 커진다."
  },
  "scenarioB": {
    "three_months": "스타트업으로 옮긴 직후 3개월은 성장 기대감과 동시에 불안감이 함께 커진다. 개발자로서 맡는 범위가 넓어져 기획, 배포, 장애 대응까지 빠르게 익히게 되며 커리어 성장 가능성은 분명히 체감된다. 다만 리스크를 낮게 감수하는 성향이라 회사의 자금 상황, 조직 변화 속도, 불명확한 프로세스가 심리적으로 자주 걸린다. 연봉은 이전보다 아주 크게 나빠지지 않더라도 성과보상이나 스톡옵션 비중이 있어 현재 소득의 확실성은 다소 낮아지고, 초반 적응과 잦은 커뮤니케이션 때문에 업무-삶 균형도 예전보다 흔들리기 쉽다.",
    "one_year": "1년쯤 지나면 제품과 팀의 흐름을 이해하면서 초반의 혼란은 줄고, 문제를 빠르게 해결하는 핵심 인력으로 자리잡을 가능성이 크다. 정체감은 확실히 줄어들고 기술적·사업적 시야가 넓어져 성장 측면의 만족감은 이전 회사보다 높다. 반면 안정성을 중시하는 성향 때문에 투자 유치, 매출, 인력 변동 같은 뉴스에 예민해지고, '내 선택이 장기적으로 안전한가'를 계속 점검하게 된다. 소득은 기본급 기준으로 큰 폭의 상승이 없을 수 있지만, 역할 확대에 따라 협상 여지가 생기고 향후 이직 시장 가치도 올라간다. 업무-삶 균형은 스스로 선을 긋기 시작하면 어느 정도 회복되지만, 출시 전후나 이슈가 큰 시기에는 다시 길게 일하는 구간이 반복된다.",
    "three_years": "3년 후에는 한 회사 안에서 짧은 시간에 여러 역할을 경험한 덕분에 커리어 성장의 폭은 꽤 커져 있다. 특정 도메인과 제품 전반을 이해하는 개발자로 인정받으며, 시니어나 리드에 가까운 책임을 맡을 가능성이 높다. 현재 및 향후 소득도 초기에 느꼈던 불확실성에 비해 개선될 수 있지만, 대기업처럼 예측 가능한 보상 구조는 아니어서 안정감은 완전히 같아지지 않는다. 회사가 크게 흔들리지 않고 버틴다면 이전보다 높은 연봉과 더 넓은 선택지를 얻겠지만, 그 과정 내내 낮은 리스크 성향 때문에 마음 한편의 긴장은 남아 있을 수 있다. 업무-삶 균형은 팀 문화와 개인의 경계 설정에 따라 관리 가능한 수준이 되지만, 안정성과 균형을 최우선으로 두는 사람에게는 '성장은 얻었지만 편안함은 줄었다'는 현실적인 평가가 남을 가능성이 크다."
  },
  "riskA": {
    "risk_level": "low",
    "reasons": [
      "사용자의 최우선 가치인 안정성에 가장 잘 맞는 선택으로, 3개월~1년 구간에서 고용·월급·복지·근무 리듬의 큰 변동 가능성이 낮다.",
      "소득과 업무-삶 균형도 당분간 유지되는 시나리오라, 낮은 위험 선호 성향의 사용자에게는 생활 기반이 흔들릴 가능성이 작다.",
      "다만 1~3년 시점에는 연봉 상승 폭이 제한적이고 성장 정체가 이어질 수 있어, 장기적으로는 시장 경쟁력과 소득 확대 측면의 위험이 남는다."
    ]
  },
  "riskB": {
    "risk_level": "high",
    "reasons": [
      "사용자는 리스크 감수 성향이 낮고 우선순위가 안정성인데, 시나리오 전반에서 자금 상황·투자 유치·인력 변동 같은 요소에 계속 예민해질 가능성이 제시되어 심리적 부담이 크다.",
      "초기 3개월에는 성과보상·스톡옵션 비중으로 현재 소득의 확실성이 낮아지고, 1년 시점에도 기본급의 큰 폭 상승이 보장되지 않아 소득 안정성이 우선인 성향과 충돌한다.",
      "업무 범위 확대와 잦은 커뮤니케이션, 출시 전후 장시간 근무 가능성 때문에 초반뿐 아니라 1년 이후에도 업무-삶 균형이 반복적으로 흔들릴 수 있다.",
      "3년 후 성장과 시장가치 상승 가능성은 크지만, 시나리오 자체가 예측 가능한 보상 구조와 안정감은 끝까지 완전히 회복되지 않는다고 보여 주어 사용자의 핵심 우선순위 기준에서는 위험도가 높다."
    ]
  }
}
```

## Expected Output Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "recommended_option": {
      "type": "string",
      "enum": [
        "A",
        "B"
      ]
    },
    "reason": {
      "type": "string"
    }
  },
  "required": [
    "recommended_option",
    "reason"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/advisor-result.json"
}
```
