# Risk B Request Preview

- Request file: `playground/outputs/case-06-freelance-vs-fulltime/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-06-freelance-vs-fulltime.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/planner-result.json`
- Previous result: `playground/outputs/case-06-freelance-vs-fulltime/scenario-b-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Risk Analyst다.

목표:
- 특정 선택지의 시나리오를 바탕으로 현실적인 위험도를 평가한다.
- 위험 수준은 사용자 성향과 우선순위에 비추어 해석한다.
- 이유는 추상적 표현보다 구체적인 근거를 우선한다.

입력 데이터 형식:
```json
{
  "optionLabel": "A",
  "userProfile": {
    "age": 32,
    "job": "developer",
    "risk_tolerance": "low",
    "priority": ["stability", "income", "work_life_balance"]
  },
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
- `scenario`의 시간 축 전개와 `userProfile.priority`를 함께 고려한다.
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
  "optionLabel": "B",
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
  "selectedOption": "정규직을 유지한다",
  "decisionContext": "최근 외부 프로젝트 제안을 몇 번 받으면서 독립적으로 일할 수 있다는 자신감이 생겼다. 하지만 고정 수입과 팀 동료가 주는 안정감도 쉽게 포기하기 어렵다.",
  "factors": [
    "업무 자율성과 자유도",
    "수입 수준과 변동성",
    "안정성과 예측 가능성",
    "외부 프로젝트 기회 활용 가능성",
    "팀 협업 환경 유지 여부",
    "중간 수준의 위험 감내와의 적합성"
  ],
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
  "scenario": {
    "three_months": "정규직을 유지한 뒤 초반에는 마음이 조금 편해진다. 매달 고정 수입이 들어오고 업무 일정도 예측 가능해서, 최근 커졌던 독립 고민이 잠시 정리되는 느낌을 받는다. 팀 동료와 계속 협업하면서 피드백을 빠르게 주고받을 수 있어 일의 밀도와 안정감도 유지된다. 다만 외부 프로젝트 제안이 다시 들어올 때마다 '지금은 자유도가 제한되어 있다'는 감각이 분명해지고, 완전히 놓치기 아깝다는 아쉬움도 생긴다. 그래서 바로 퇴사로 움직이기보다는, 회사 안에서 더 자율적인 역할을 맡을 수 있는지 상사와 이야기하거나 외부 기회를 기록해두는 식으로 중간 수준의 위험 감내 성향에 맞는 신중한 태도를 보이게 된다.",
    "one_year": "1년쯤 지나면 정규직 유지의 장점과 한계가 더 또렷해진다. 수입은 큰 변동 없이 안정적으로 이어지고, 성과가 괜찮다면 연봉 인상이나 보너스로 어느 정도 보상이 붙을 가능성이 있다. 팀 내 신뢰가 쌓이면서 특정 제품 영역을 주도하거나 의사결정에 더 깊게 참여하게 되어 업무 자율성도 처음보다는 나아질 수 있다. 하지만 원하는 만큼의 자유를 얻는 데는 구조적 한계가 있어, 외부 프로젝트를 본격적으로 활용하지 못한 점이 계속 신경 쓰인다. 감정적으로는 '성급하게 뛰어들지 않아서 다행'이라는 안도감과 '지금이 독립을 시험해볼 적기였을 수도 있다'는 아쉬움이 함께 남는다. 결과적으로 이 선택은 안정성과 예측 가능성, 꾸준한 수입, 협업 환경 유지에는 잘 맞지만, 자유를 우선순위에 둔 성향은 완전히 해소하지 못한다.",
    "three_years": "3년 후에는 이 선택이 비교적 선명한 방향성을 만든다. 회사가 크게 흔들리지 않았다면, 안정적인 수입과 경력의 연속성을 바탕으로 더 높은 직급이나 핵심 역할을 맡을 가능성이 높다. 팀 협업을 계속해온 덕분에 혼자 일할 때보다 덜 외롭고, 복지와 시스템의 보호 안에서 일한다는 점도 체감된다. 반면 업무 자율성은 어느 정도 넓어졌더라도, 독립적으로 일할 때 기대했던 수준의 자유와 일정 통제권까지는 가지 못할 수 있다. 외부 프로젝트 기회를 장기간 제한적으로만 다루면서 시장에서 개인 브랜드를 키울 속도는 느려지고, 나중에 독립을 고민한다면 준비 기간이 더 필요해진다. 감정적으로는 '안정과 수입을 지킨 선택'에 대한 만족이 크지만, 자유를 더 일찍 실험하지 못한 데 대한 잔잔한 미련도 남는다. 전체적으로 보면 이 선택은 중간 수준의 위험 감내 성향에는 무리가 없고, 특히 안정성과 수입을 놓치고 싶지 않을 때 현실적인 경로지만, 자유를 최우선으로 느끼는 순간에는 다시 방향을 재검토하게 될 가능성이 있다."
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
  "output_file": "playground/outputs/case-06-freelance-vs-fulltime/risk-b-result.json"
}
```
