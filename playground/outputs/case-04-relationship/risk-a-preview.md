# Risk A Request Preview

- Request file: `playground/outputs/case-04-relationship/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-04-relationship.json`
- Previous result: `playground/outputs/case-04-relationship/planner-result.json`
- Previous result: `playground/outputs/case-04-relationship/scenario-a-result.json`

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
  "optionLabel": "A",
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
  "selectedOption": "현재 연애를 계속 이어간다",
  "decisionContext": "상대와 애정은 있지만 장거리와 반복되는 갈등으로 미래 계획이 자주 흔들린다. 혼자가 되는 불안도 있지만, 계속 버티는 것이 더 건강한지 확신이 서지 않는다.",
  "factors": [
    "정서적 안정성",
    "신뢰 수준",
    "장기적 관계 적합성",
    "장거리 관계의 지속 가능성",
    "반복되는 갈등의 해결 가능성"
  ],
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
  "scenario": {
    "three_months": "현재 연애를 이어가기로 한 뒤, 처음 몇 달은 관계를 잃지 않았다는 안도감이 크게 느껴진다. 혼자가 되는 불안을 당장 마주하지 않아도 된다는 점에서 정서적으로 잠시 안정되는 순간도 있지만, 장거리 특성상 연락 빈도와 만남 일정이 어긋날 때마다 같은 주제로 서운함이 반복된다. 서로 애정은 확인하지만, 갈등이 생길 때마다 해소 방식이 비슷하게 되풀이되면 신뢰 수준은 완전히 무너지지 않으면서도 조금씩 예민해진다. 이 시기에는 큰 결론이 나기보다, 이 관계가 버틸 수는 있지만 장거리 관계의 지속 가능성과 반복되는 갈등의 해결 가능성에 대해 더 구체적인 기준이 필요하다는 현실을 체감하게 된다.",
    "one_year": "1년 정도 지나면 관계를 유지하기 위해 들인 노력의 무게가 분명해진다. 정기적으로 만나거나 대화 규칙을 맞추려는 시도가 어느 정도 자리를 잡으면 초반보다 불안이 줄어들 수 있지만, 한편으로는 미래 계획을 이야기할 때마다 실제로 누가 어떤 조정을 할 수 있는지에서 다시 긴장이 생긴다. 낮은 위험 선호 성향 때문에 성급한 이별보다는 조심스럽게 관계를 붙잡는 선택을 계속할 가능성이 크고, 그 덕분에 trust는 완전히 끊어지지 않지만 감정 소모가 누적되면 emotional_stability는 관계의 질에 따라 크게 흔들린다. 결국 이 시점에는 서로 좋아하는지보다, 장기적 관계 적합성과 생활 방식의 합치 여부가 더 중요해진다. 관계는 유지될 수 있으나, 문제를 미루는 형태라면 안정감보다는 애매한 긴장 상태가 길어질 가능성이 높다.",
    "three_years": "3년 후에도 연애를 계속 이어간다면, 관계는 감정만으로 유지되기보다 현실적 합의에 의해 평가된다. 장거리를 끝낼 구체적인 계획이 실행되어 함께 사는 방향이나 같은 지역에서의 생활 기반이 만들어졌다면, 반복 갈등은 완전히 사라지지 않아도 다루는 방식이 성숙해져 정서적 안정성과 신뢰 수준이 눈에 띄게 나아질 수 있다. 반대로 여전히 거리와 일정, 우선순위 문제를 조정하지 못한 채 같은 다툼이 이어진다면, 겉으로는 관계를 유지해도 내면에서는 지치고 조심스러워지며 장기적 관계 적합성에 대한 의문이 커진다. 즉 이 선택의 3년 후 모습은 극적인 해피엔딩이나 파국보다는, 서로가 현실을 함께 조정할 수 있는 사람인지가 분명해지는 방향에 가깝다. 계속 이어간 선택은 외로움을 늦춰 주지만, 건강한 관계로 남으려면 장거리의 지속 가능성과 갈등 해결 방식에 실제 변화가 있었는지가 핵심 결과를 만든다."
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
  "output_file": "playground/outputs/case-04-relationship/risk-a-result.json"
}
```
