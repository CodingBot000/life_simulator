# Risk B Request Preview

- Request file: `playground/outputs/case-04-relationship/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `./playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-b-result.json`

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
    "age": 31,
    "job": "marketer",
    "risk_tolerance": "low",
    "priority": [
      "emotional_stability",
      "trust",
      "long_term_compatibility"
    ]
  },
  "selectedOption": "관계를 정리한다",
  "decisionContext": "상대와 애정은 있지만 장거리와 반복되는 갈등으로 미래 계획이 자주 흔들린다. 혼자가 되는 불안도 있지만, 계속 버티는 것이 더 건강한지 확신이 서지 않는다.",
  "factors": [
    "관계 유지와 정리 각각이 주는 정서적 안정감",
    "상대에 대한 신뢰를 회복하고 유지할 가능성",
    "장거리와 반복되는 갈등을 감당할 수 있는 관계의 지속 가능성",
    "미래 계획을 안정적으로 함께 세울 수 있는지",
    "장기적으로 더 건강한 선택인지와 혼자가 되는 불안의 크기"
  ],
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
  "scenario": {
    "three_months": "관계를 정리한 직후부터 몇 주간은 허전함과 불안이 크게 올라온다. 익숙한 사람에게 연락하지 못하는 공백 때문에 혼자가 된 감각이 선명해지고, 장거리 상황에서도 이어져 있던 일상이 끊기며 감정 기복이 생긴다. 다만 반복되던 갈등의 직접적인 자극이 사라지면서 마음이 급격히 흔들리는 빈도는 조금씩 줄어든다. 신뢰가 회복될지 계속 점검하던 피로감에서도 벗어나면서, 감정적으로는 아프지만 예측 가능한 일상을 되찾는 느낌이 생긴다. 미래 계획을 상대와 조율하다 번복되던 일이 없어져 생활 리듬은 오히려 안정되고, 위험을 크게 감수하기보다 정서적 안정을 우선하는 본인 성향에는 단기적으로 더 맞는 선택이었다는 생각이 조심스럽게 든다.",
    "one_year": "1년쯤 지나면 외로움은 완전히 사라지지 않지만, 관계를 유지했을 때 반복됐을 갈등과 불확실성을 이상화하지 않게 된다. 상대를 그리워하는 순간은 있어도, 신뢰를 다시 쌓을 수 있었을지에 대해서는 보다 현실적으로 보게 된다. 장거리와 잦은 충돌 속에서 미래 계획을 안정적으로 맞추기 어려웠다는 점을 받아들이면서, 장기적 궁합에 대한 판단도 선명해진다. 감정적으로는 초반보다 훨씬 차분해지고, 일과 생활 패턴이 정돈되면서 자기 컨디션 관리가 쉬워진다. 새로운 사람을 서두르기보다 신뢰와 안정감을 기준으로 인간관계를 다시 세우게 되고, 혼자가 되는 불안은 남아 있어도 그것이 곧 잘못된 선택이었다는 뜻은 아니라는 감각이 자리 잡는다.",
    "three_years": "3년이 지나면 이 선택은 '힘들었지만 필요했던 정리'로 기억될 가능성이 크다. 당시의 애정은 의미 있었지만, 신뢰를 안정적으로 유지하고 장거리와 반복 갈등을 함께 감당할 지속 가능성은 낮았다는 판단이 삶의 경험으로 굳어진다. 혼자 지내는 시간에 익숙해지면서 정서적 안정의 기준이 상대의 반응이 아니라 자신의 생활 구조와 관계의 질로 옮겨간다. 이후 새로운 관계를 시작하더라도 감정의 강도보다 신뢰, 장기적 호환성, 함께 세울 수 있는 현실적인 미래 계획을 더 중요하게 보게 된다. 가끔은 그때 버텼다면 어땠을지 떠올릴 수 있지만, 계속 흔들리는 관계를 붙잡는 대신 자신에게 더 건강한 기준을 만든 선택이었다는 쪽으로 마음이 정리될 가능성이 높다."
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
  "output_file": "playground/outputs/case-04-relationship/risk-b-result.json"
}
```
