# Risk A Request Preview

- Request file: `playground/outputs/case-01-career-stability/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `./playground/inputs/cases/case-01-career-stability.json`
- Previous result: `playground/outputs/case-01-career-stability/planner-result.json`
- Previous result: `playground/outputs/case-01-career-stability/scenario-a-result.json`

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
    "age": 32,
    "job": "developer",
    "risk_tolerance": "low",
    "priority": [
      "stability",
      "income",
      "work_life_balance"
    ]
  },
  "selectedOption": "현재 회사에 남는다",
  "decisionContext": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다.",
  "factors": [
    "고용 및 생활 안정성",
    "연봉 및 복지 수준",
    "역할 변화와 커리어 성장 가능성",
    "새로운 기술을 가까이서 다룰 기회",
    "워라밸 유지 가능성"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "고용 및 생활 안정성",
      "연봉 및 복지 수준",
      "역할 변화와 커리어 성장 가능성",
      "새로운 기술을 가까이서 다룰 기회",
      "워라밸 유지 가능성"
    ]
  },
  "scenario": {
    "three_months": "현재 회사에 남은 지 3개월쯤 지나면, 당장의 이직 부담이 사라졌다는 점에서 마음은 한결 안정된다. 연봉과 복지, 익숙한 업무 환경이 유지되어 생활 계획을 흔들지 않아도 된다는 안도감이 크고, 워라밸도 지금 수준에서 크게 무너지지 않는다. 다만 역할 자체는 크게 달라지지 않아 일상 업무는 무난하지만 다소 반복적으로 느껴지고, 새로운 기술을 직접 다룰 기회가 생각보다 제한적이라는 점에서 약한 답답함이 남는다. 대신 리스크를 크게 지지 않는 선에서 사내 스터디나 작은 개선 과제를 자발적으로 맡아 보며 성장 가능성을 시험해 보려는 움직임이 생긴다.",
    "one_year": "1년이 지나면 안정성 측면에서는 선택의 장점이 더 분명해진다. 고용과 생활은 대체로 안정적으로 유지되고, 연봉은 큰 폭은 아니더라도 정기 인상이나 성과급 수준에서 무난하게 관리될 가능성이 높다. 워라밸 역시 급격히 나빠지지 않아 일과 생활의 균형은 비교적 잘 지켜진다. 그러나 커리어 성장과 역할 변화에서는 복합적인 감정이 생긴다. 스스로 작은 프로젝트나 협업 범위를 넓혀 보지 않았다면 정체감이 더 선명해지고, 반대로 내부에서 기술 개선이나 자동화, 신규 도입 검토 같은 기회를 꾸준히 찾았다면 제한적이지만 의미 있는 변화가 생긴다. 새로운 기술을 가까이서 다루는 경험은 외부 이직만큼 빠르지는 않지만, 현재 회사를 기반으로 천천히 넓혀 가는 형태가 된다. 만족감은 안정에서 오고, 아쉬움은 성장 속도에서 온다.",
    "three_years": "3년 후에는 이 선택의 성격이 더 뚜렷해진다. 생활 안정성, 꾸준한 소득, 복지, 예측 가능한 워라밸을 중시한 결정은 전반적으로 사용자 성향과 맞아 심리적 피로를 크게 줄여 준다. 경제적으로는 큰 도약은 아니어도 급격한 하락 없이 안정적인 흐름을 만들 가능성이 높다. 다만 역할 변화와 커리어 성장 가능성은 본인의 추가 행동 여부에 따라 차이가 커진다. 회사 안에서 점진적으로 책임 범위를 넓히고 새로운 기술을 일부라도 실무에 연결해 왔다면, 전문성은 느리지만 단단하게 쌓여 팀 내 신뢰와 안정적인 입지를 얻는다. 반대로 기존 업무에만 머물렀다면, 안정은 유지되지만 기술적 시장 경쟁력이나 성장 만족도에 대한 아쉬움이 커질 수 있다. 즉 이 선택은 파격적인 변화보다 안정적 기반을 지키는 데 강점이 있고, 성장의 폭은 회사를 바꾸느냐보다 회사 안에서 얼마나 의도적으로 기회를 만들었느냐에 달려 있게 된다."
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
  "output_file": "playground/outputs/case-01-career-stability/risk-a-result.json"
}
```
