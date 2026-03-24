# Advisor Request Preview

- Request file: `playground/outputs/case-06-freelance-vs-fulltime/advisor-request.json`
- Prompt file: `prompts/advisor.md`
- Input source: `playground/inputs/cases/case-06-freelance-vs-fulltime.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/planner-result.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/scenario-a-result.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/scenario-b-result.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/risk-a-result.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/risk-b-result.json`

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
    "age": 33,
    "job": "product designer",
    "risk_tolerance": "medium",
    "priority": [
      "freedom",
      "income",
      "stability"
    ]
  },
  "decision": {
    "optionA": "프리랜서로 전환한다",
    "optionB": "정규직을 유지한다",
    "context": "최근 외부 프로젝트 제안을 몇 번 받으면서 독립적으로 일할 수 있다는 자신감이 생겼다. 하지만 고정 수입과 팀 동료가 주는 안정감도 쉽게 포기하기 어렵다."
  },
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "업무 자율성과 자유도",
      "수입 수준과 변동성",
      "안정성과 예측 가능성",
      "외부 프로젝트 기회 활용 가능성",
      "팀 협업 환경 유지 여부",
      "중간 수준의 위험 감내와의 적합성"
    ]
  },
  "scenarioA": {
    "three_months": "프리랜서로 전환한 직후에는 출퇴근과 내부 보고에서 벗어나 일정과 작업 방식을 스스로 정할 수 있다는 해방감이 크다. 최근 연락이 닿아 있던 외부 프로젝트 제안 중 1~2건을 실제 계약으로 연결하면서 자신감도 생기지만, 월별 수입이 회사 급여처럼 고정되지 않다 보니 예상보다 견적 조율과 세금, 계약서 검토에 신경을 많이 쓰게 된다. 혼자 결정하는 비중이 커져 자유도는 높아졌지만, 팀원과 즉시 아이디어를 주고받던 환경이 사라져 가끔은 판단이 무겁고 외롭다고 느낀다. 그래서 무리하게 일을 늘리기보다 자신의 중간 수준 위험 감내에 맞춰 작업량을 조절하고, 생활비 기준으로 몇 개월치 안전자금을 따로 관리하려는 습관이 자리 잡기 시작한다.",
    "one_year": "1년 정도 지나면 프리랜서 생활의 장단점이 꽤 선명해진다. 반복적으로 의뢰를 주는 고객이 생기면서 외부 프로젝트 기회를 활용하는 능력은 좋아지고, 잘 맞는 분야에서는 회사에 다닐 때보다 수입이 높은 달도 생긴다. 다만 수입 편차가 여전히 있어서 바쁜 달과 한가한 달의 차이가 심하고, 이를 메우기 위해 단가 협상과 일정 관리가 중요한 업무가 된다. 자유를 우선시했던 선택은 대체로 만족스럽지만, 안정성을 중시하는 마음도 남아 있어 장기 계약 비중을 늘리거나 협업하는 프리랜서 네트워크에 들어가 팀형 프로젝트를 일부 유지하려고 한다. 감정적으로는 독립에 대한 자부심과 미래에 대한 경계심이 함께 가며, 완전히 불안정하지도 그렇다고 완전히 편안하지도 않은 현실적인 균형 상태에 가까워진다.",
    "three_years": "3년이 지나면 프리랜서 전환은 일시적 실험이 아니라 하나의 일 방식으로 굳어진다. 자신의 강점이 드러나는 프로젝트 유형과 고객군이 정리되면서 업무 자율성과 자유도는 회사 시절보다 확실히 높아지고, 원하면 일정에 여유를 두거나 반대로 특정 시즌에 집중적으로 일하는 식의 선택도 가능해진다. 수입은 초기에 비해 예측 가능성이 다소 높아지지만 여전히 고정급처럼 안정적이지는 않아, 안정성을 위해 장기 고객 몇 곳과 꾸준한 관계를 유지하는 것이 중요해진다. 팀 협업 환경은 예전처럼 한 조직 안에서 매일 이어지지는 않지만, 익숙한 개발자나 다른 디자이너와 반복 협업하면서 느슨한 팀의 형태로 보완된다. 전반적으로 이 선택은 자유와 외부 기회 활용 면에서는 잘 맞지만, 안정성을 완전히 대체하지는 못하므로 중간 수준의 위험 감내를 가진 사람에게는 지속 가능한 구조를 스스로 만들어 갈 때 가장 만족도가 높다는 결론에 가까워진다."
  },
  "scenarioB": {
    "three_months": "정규직을 유지한 뒤 초반에는 마음이 조금 편해진다. 매달 고정 수입이 들어오고 업무 일정도 예측 가능해서, 최근 커졌던 독립 고민이 잠시 정리되는 느낌을 받는다. 팀 동료와 계속 협업하면서 피드백을 빠르게 주고받을 수 있어 일의 밀도와 안정감도 유지된다. 다만 외부 프로젝트 제안이 다시 들어올 때마다 '지금은 자유도가 제한되어 있다'는 감각이 분명해지고, 완전히 놓치기 아깝다는 아쉬움도 생긴다. 그래서 바로 퇴사로 움직이기보다는, 회사 안에서 더 자율적인 역할을 맡을 수 있는지 상사와 이야기하거나 외부 기회를 기록해두는 식으로 중간 수준의 위험 감내 성향에 맞는 신중한 태도를 보이게 된다.",
    "one_year": "1년쯤 지나면 정규직 유지의 장점과 한계가 더 또렷해진다. 수입은 큰 변동 없이 안정적으로 이어지고, 성과가 괜찮다면 연봉 인상이나 보너스로 어느 정도 보상이 붙을 가능성이 있다. 팀 내 신뢰가 쌓이면서 특정 제품 영역을 주도하거나 의사결정에 더 깊게 참여하게 되어 업무 자율성도 처음보다는 나아질 수 있다. 하지만 원하는 만큼의 자유를 얻는 데는 구조적 한계가 있어, 외부 프로젝트를 본격적으로 활용하지 못한 점이 계속 신경 쓰인다. 감정적으로는 '성급하게 뛰어들지 않아서 다행'이라는 안도감과 '지금이 독립을 시험해볼 적기였을 수도 있다'는 아쉬움이 함께 남는다. 결과적으로 이 선택은 안정성과 예측 가능성, 꾸준한 수입, 협업 환경 유지에는 잘 맞지만, 자유를 우선순위에 둔 성향은 완전히 해소하지 못한다.",
    "three_years": "3년 후에는 이 선택이 비교적 선명한 방향성을 만든다. 회사가 크게 흔들리지 않았다면, 안정적인 수입과 경력의 연속성을 바탕으로 더 높은 직급이나 핵심 역할을 맡을 가능성이 높다. 팀 협업을 계속해온 덕분에 혼자 일할 때보다 덜 외롭고, 복지와 시스템의 보호 안에서 일한다는 점도 체감된다. 반면 업무 자율성은 어느 정도 넓어졌더라도, 독립적으로 일할 때 기대했던 수준의 자유와 일정 통제권까지는 가지 못할 수 있다. 외부 프로젝트 기회를 장기간 제한적으로만 다루면서 시장에서 개인 브랜드를 키울 속도는 느려지고, 나중에 독립을 고민한다면 준비 기간이 더 필요해진다. 감정적으로는 '안정과 수입을 지킨 선택'에 대한 만족이 크지만, 자유를 더 일찍 실험하지 못한 데 대한 잔잔한 미련도 남는다. 전체적으로 보면 이 선택은 중간 수준의 위험 감내 성향에는 무리가 없고, 특히 안정성과 수입을 놓치고 싶지 않을 때 현실적인 경로지만, 자유를 최우선으로 느끼는 순간에는 다시 방향을 재검토하게 될 가능성이 있다."
  },
  "riskA": {
    "risk_level": "medium",
    "reasons": [
      "초기 3개월에는 외부 프로젝트 1~2건을 계약으로 연결할 가능성이 있지만, 월별 수입이 고정되지 않고 견적 조율·세금·계약 검토까지 직접 맡아야 해 수입과 운영 부담이 함께 커진다.",
      "1년 시점에도 반복 고객이 생겨 수입이 높아지는 달이 있더라도 바쁜 달과 한가한 달의 차이가 크다고 제시되어 있어, 사용자의 우선순위인 income과 stability를 동시에 안정적으로 충족시키기 어렵다.",
      "자유도와 업무 자율성은 3개월, 1년, 3년 모두에서 뚜렷하게 높아져 freedom 우선순위와는 잘 맞지만, 팀 협업이 즉시 사라지고 느슨한 네트워크로 대체되어 안정감 측면의 손실이 남는다.",
      "3년 후에는 장기 고객과 반복 협업으로 예측 가능성이 다소 높아지지만 고정급 수준의 안정성은 대체되지 않는다고 되어 있어, 중간 수준의 위험 감내 성향에는 감당 가능하지만 낮은 위험 선택으로 보기는 어렵다."
    ]
  },
  "riskB": {
    "risk_level": "medium",
    "reasons": [
      "고정 수입과 예측 가능한 일정, 팀 협업 환경은 유지되어 소득과 안정성 측면의 위험은 낮지만, 사용자의 1순위인 자유는 장기적으로 충분히 충족되지 않는다.",
      "시나리오상 1년 후에도 외부 프로젝트를 본격적으로 활용하지 못한 아쉬움이 남고, 3년 후에는 개인 브랜드 축적과 독립 준비 속도가 느려질 수 있어 기회비용이 누적된다.",
      "정규직 유지 선택은 중간 수준의 위험 감내 성향에는 무리가 없지만, 자유를 우선시하는 성향과 구조적으로 완전히 맞지 않아 시간이 지날수록 방향 재검토 압력이 커질 수 있다."
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
  "output_file": "playground/outputs/case-06-freelance-vs-fulltime/advisor-result.json"
}
```
