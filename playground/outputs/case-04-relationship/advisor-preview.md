# Advisor Request Preview

- Request file: `playground/outputs/case-04-relationship/advisor-request.json`
- Prompt file: `prompts/advisor.md`
- Input source: `playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-a-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-b-result.json`
- Previous result: `playground/outputs/case-04-relationship/risk-a-result.json`
- Previous result: `playground/outputs/case-04-relationship/risk-b-result.json`

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
      "정서적 안정성",
      "신뢰 수준",
      "장기적 관계 적합성",
      "장거리 관계의 지속 가능성",
      "반복되는 갈등의 해결 가능성"
    ]
  },
  "scenarioA": {
    "three_months": "현재 연애를 이어가기로 한 뒤, 처음 몇 달은 관계를 잃지 않았다는 안도감이 크게 느껴진다. 혼자가 되는 불안을 당장 마주하지 않아도 된다는 점에서 정서적으로 잠시 안정되는 순간도 있지만, 장거리 특성상 연락 빈도와 만남 일정이 어긋날 때마다 같은 주제로 서운함이 반복된다. 서로 애정은 확인하지만, 갈등이 생길 때마다 해소 방식이 비슷하게 되풀이되면 신뢰 수준은 완전히 무너지지 않으면서도 조금씩 예민해진다. 이 시기에는 큰 결론이 나기보다, 이 관계가 버틸 수는 있지만 장거리 관계의 지속 가능성과 반복되는 갈등의 해결 가능성에 대해 더 구체적인 기준이 필요하다는 현실을 체감하게 된다.",
    "one_year": "1년 정도 지나면 관계를 유지하기 위해 들인 노력의 무게가 분명해진다. 정기적으로 만나거나 대화 규칙을 맞추려는 시도가 어느 정도 자리를 잡으면 초반보다 불안이 줄어들 수 있지만, 한편으로는 미래 계획을 이야기할 때마다 실제로 누가 어떤 조정을 할 수 있는지에서 다시 긴장이 생긴다. 낮은 위험 선호 성향 때문에 성급한 이별보다는 조심스럽게 관계를 붙잡는 선택을 계속할 가능성이 크고, 그 덕분에 trust는 완전히 끊어지지 않지만 감정 소모가 누적되면 emotional_stability는 관계의 질에 따라 크게 흔들린다. 결국 이 시점에는 서로 좋아하는지보다, 장기적 관계 적합성과 생활 방식의 합치 여부가 더 중요해진다. 관계는 유지될 수 있으나, 문제를 미루는 형태라면 안정감보다는 애매한 긴장 상태가 길어질 가능성이 높다.",
    "three_years": "3년 후에도 연애를 계속 이어간다면, 관계는 감정만으로 유지되기보다 현실적 합의에 의해 평가된다. 장거리를 끝낼 구체적인 계획이 실행되어 함께 사는 방향이나 같은 지역에서의 생활 기반이 만들어졌다면, 반복 갈등은 완전히 사라지지 않아도 다루는 방식이 성숙해져 정서적 안정성과 신뢰 수준이 눈에 띄게 나아질 수 있다. 반대로 여전히 거리와 일정, 우선순위 문제를 조정하지 못한 채 같은 다툼이 이어진다면, 겉으로는 관계를 유지해도 내면에서는 지치고 조심스러워지며 장기적 관계 적합성에 대한 의문이 커진다. 즉 이 선택의 3년 후 모습은 극적인 해피엔딩이나 파국보다는, 서로가 현실을 함께 조정할 수 있는 사람인지가 분명해지는 방향에 가깝다. 계속 이어간 선택은 외로움을 늦춰 주지만, 건강한 관계로 남으려면 장거리의 지속 가능성과 갈등 해결 방식에 실제 변화가 있었는지가 핵심 결과를 만든다."
  },
  "scenarioB": {
    "three_months": "관계를 정리한 직후 3개월은 허전함과 불안이 꽤 크게 느껴진다. 애정이 있었던 만큼 혼자가 된 감정이 쉽게 사라지지 않고, 위험을 크게 감수하지 않는 성향 때문에 내가 너무 성급했나 하는 생각도 몇 번씩 든다. 하지만 장거리로 인한 일정 조율 스트레스와 반복되는 갈등은 눈에 띄게 줄어들어 일상 리듬은 오히려 안정된다. 감정 기복은 남아 있어도, 신뢰가 흔들릴 때마다 관계 전체가 불안정해졌던 패턴을 돌아보면서 정서적 안정성과 장거리 지속 가능성이 생각보다 중요한 문제였다는 점을 점점 받아들이게 된다.",
    "one_year": "1년쯤 지나면 이별의 충격보다는 생활의 안정감이 더 크게 체감된다. 연락을 이어가며 애매하게 붙잡고 있지 않았기 때문에 감정이 반복해서 흔들리는 일은 줄고, 일과 인간관계에도 집중이 돌아온다. 가끔은 좋은 기억이 떠올라 아쉽지만, 장기적으로 봤을 때 서로 원하는 삶의 방향과 갈등을 해결하는 방식이 충분히 맞지 않았다는 점을 더 차분하게 이해하게 된다. 특히 신뢰와 장기적 관계 적합성을 중요하게 여기는 본인에게는, 애정만으로 버티는 관계보다 예측 가능하고 안정적인 관계가 더 필요하다는 기준이 분명해진다.",
    "three_years": "3년 뒤에는 이 선택을 감정적인 단절이라기보다 삶의 방향을 정리한 결정으로 보게 될 가능성이 크다. 당시에는 외로움이 컸지만, 반복되는 갈등과 장거리의 불확실성 속에서 계속 흔들리는 상태보다 혼자서 안정된 기반을 만드는 쪽이 본인 성향에는 더 맞았다는 점이 분명해진다. 이후 새로운 관계를 시작하더라도 신뢰가 쌓이는 속도, 갈등 해결 방식, 함께 그릴 수 있는 장기 계획을 더 현실적으로 살피게 되고, 감정이 있어도 지속 가능성이 낮으면 무리해서 끌고 가지 않게 된다. 완전히 미련이 사라지지는 않아도, 이별이 삶을 망친 사건으로 남기보다는 정서적 안정성과 장기적 호환성을 우선하게 만든 경험으로 정리될 가능성이 높다."
  },
  "riskA": {
    "risk_level": "medium",
    "reasons": [
      "초기 몇 달은 혼자가 되는 불안을 피하면서 안도감을 얻을 수 있지만, 장거리로 인한 연락·만남 불일치가 반복되어 사용자가 중요하게 보는 정서적 안정성이 다시 흔들릴 가능성이 크다.",
      "1년 시점에도 관계는 유지될 수 있으나 미래 계획과 생활 조정 방식이 합의되지 않으면 신뢰가 완전히 무너지지 않더라도 예민함과 감정 소모가 누적되어 낮은 위험 선호 성향과 충돌한다.",
      "3년 후 결과가 장거리 해소 계획과 갈등 해결 방식의 실제 변화에 크게 좌우되므로, 장기적 관계 적합성을 빨리 확인하기 어렵고 애매한 긴장 상태가 길어질 위험이 있다."
    ]
  },
  "riskB": {
    "risk_level": "medium",
    "reasons": [
      "관계를 정리한 직후 3개월 동안 허전함·불안·자책이 반복될 가능성이 커서, 위험을 크게 감수하지 않는 성향에는 단기 정서 부담이 작지 않다.",
      "다만 시나리오상 장거리로 인한 일정 조율 스트레스와 반복 갈등이 빠르게 줄어들어, 사용자의 최우선 항목인 정서적 안정성에는 중기적으로 오히려 유리하다.",
      "1년 이후에는 신뢰 흔들림과 장기 계획 불일치가 더 분명하게 정리되어, 사용자가 중시하는 신뢰와 장기적 관계 적합성 기준에 맞지 않는 관계를 계속 유지할 위험은 낮아진다.",
      "즉 단기 외로움과 감정 공백의 위험은 분명하지만, 장기적으로는 불확실한 관계를 버티며 계속 흔들리는 위험보다 관리 가능성이 높은 선택으로 해석된다."
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
  "output_file": "playground/outputs/case-04-relationship/advisor-result.json"
}
```
