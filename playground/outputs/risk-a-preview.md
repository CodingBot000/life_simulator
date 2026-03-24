# Risk A Request Preview

- Request file: `playground/outputs/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/sample-input.json`
- Previous result: `playground/outputs/planner-result.json`
- Previous result: `playground/outputs/scenario-a-result.json`

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
  "decisionContext": "현재 연봉은 안정적이지만 성장 정체를 느낌",
  "factors": [
    "안정성 및 리스크",
    "현재 및 향후 소득",
    "업무-삶 균형",
    "커리어 성장 가능성"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "안정성 및 리스크",
      "현재 및 향후 소득",
      "업무-삶 균형",
      "커리어 성장 가능성"
    ]
  },
  "scenario": {
    "three_months": "현재 회사에 남은 뒤 첫 3개월은 큰 변동 없이 지나간다. 익숙한 팀과 업무 흐름 덕분에 심리적으로는 안도감이 크고, 낮은 위험 선호와 안정성 우선이라는 성향에도 잘 맞는다. 월급과 복지, 근무 리듬이 그대로 유지되어 소득과 업무-삶 균형은 당장 흔들리지 않는다. 다만 프로젝트를 반복적으로 처리하면서 성장 정체감은 더 분명해지고, 마음 한편에는 '편하지만 이대로 괜찮을까'라는 답답함이 남는다. 대신 이 시기에는 외부 이직 스트레스 없이 사내에서 맡을 수 있는 작은 개선 과제나 기술 학습 기회를 찾기 시작할 가능성이 높다.",
    "one_year": "1년이 지나면 선택의 장단점이 더 또렷해진다. 회사에 남은 덕분에 고용 안정성과 꾸준한 소득은 유지되고, 큰 생활 변화 없이 일상은 비교적 안정적이다. 연봉 인상은 있더라도 물가나 시장 기대를 크게 앞서지 않는 수준일 가능성이 높아, 소득 면에서는 '안정적이지만 크게 뛰지는 않는' 느낌을 받는다. 업무-삶 균형은 대체로 지켜지지만, 회사 상황에 따라 특정 시기에는 익숙한 사람에게 일이 몰리면서 피로감이 생길 수 있다. 커리어 성장 측면에서는 직급이나 책임 범위가 조금 넓어질 수 있으나, 새로운 환경에서 얻는 급격한 학습보다는 완만한 성장에 가깝다. 그래서 마음은 한결 편하지만, 성장 욕구는 완전히 해소되지 않아 사내 이동이나 외부 학습을 진지하게 고민하게 된다.",
    "three_years": "3년 후에는 이 선택이 '안정적인 대신 변화 속도는 느린 경로'였다는 점이 분명해진다. 꾸준한 소득과 비교적 예측 가능한 생활 패턴 덕분에 재정 계획과 개인 생활은 안정적으로 굴러갈 가능성이 크고, 업무-삶 균형도 크게 무너지지 않는다. 회사 안에서 신뢰를 얻어 핵심 실무자나 중간 리더 역할을 맡을 수 있어 내부 안정성은 오히려 높아질 수 있다. 그러나 커리어 성장 가능성은 회사의 사업 방향과 기술 환경에 강하게 묶이기 때문에, 별도 노력이 없다면 시장에서의 경쟁력은 천천히 정체될 수 있다. 이 시점의 감정은 완전한 만족이나 후회보다는 '생활은 안정됐지만 더 일찍 성장 전략을 세웠어야 했나'에 가까울 가능성이 높다. 결국 현재 회사에 남는 선택은 리스크를 낮추고 기반을 지키는 데는 유리하지만, 성장과 향후 소득 확대를 위해서는 내부 역할 확장이나 지속적인 자기계발이 함께 있어야 의미가 커진다."
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
  "output_file": "playground/outputs/risk-a-result.json"
}
```
