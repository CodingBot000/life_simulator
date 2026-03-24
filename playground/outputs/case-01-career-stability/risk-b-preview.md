# Risk B Request Preview

- Request file: `playground/outputs/case-01-career-stability/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-01-career-stability.json`
- Previous result: `playground/outputs/case-01-career-stability/planner-result.json`
- Previous result: `playground/outputs/case-01-career-stability/scenario-b-result.json`

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
    "age": 32,
    "job": "developer",
    "risk_tolerance": "low",
    "priority": [
      "stability",
      "income",
      "work_life_balance"
    ]
  },
  "selectedOption": "스타트업으로 이직한다",
  "decisionContext": "현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다.",
  "factors": [
    "고용 안정성",
    "연봉 및 복지 수준",
    "역할 변화와 커리어 성장 가능성",
    "새로운 기술을 가까이에서 다룰 기회",
    "일과 삶의 균형 및 생활 안정성"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "고용 안정성",
      "연봉 및 복지 수준",
      "역할 변화와 커리어 성장 가능성",
      "새로운 기술을 가까이에서 다룰 기회",
      "일과 삶의 균형 및 생활 안정성"
    ]
  },
  "scenario": {
    "three_months": "이직 후 3개월에는 배포 주기와 의사결정 속도가 빨라 처음엔 긴장과 동시에 오랜만의 자극을 느낀다. 새로운 기술 스택을 실제 서비스에 바로 적용해보는 경험은 분명 만족스럽고, 역할도 이전보다 넓어져 개발 외 협업과 우선순위 조정까지 맡게 될 가능성이 크다. 다만 저위험 성향인 만큼 회사의 자금 상황, 조직 구조, 복지 체계가 아직 낯설어 고용 안정성과 생활 안정성에 대한 불안이 간헐적으로 따라온다. 연봉은 소폭 상승하거나 비슷할 수 있지만 복지와 제도의 차이를 체감하면서, 총보상 면에서는 이전 회사보다 신중하게 비교하게 된다. 초반에는 성장감은 크지만 업무 경계가 넓어져 일과 삶의 균형은 잠시 흔들릴 수 있다.",
    "one_year": "1년쯤 지나면 회사와 역할에 어느 정도 적응해, 새로운 기술을 가까이에서 다루며 실무 역량이 넓어졌다는 실감이 생긴다. 이전 회사에서 느끼던 정체감은 줄고, 제품이나 기능의 방향에 더 직접 영향을 주는 경험이 커리어 성장 측면에서 의미 있게 남는다. 반면 스타트업 특유의 인력 변화나 우선순위 변경이 반복되면, 안정성을 중시하는 성향 때문에 마음 한편의 피로가 쌓일 수 있다. 연봉 자체가 크게 흔들리지는 않더라도 보너스, 복지, 근무 제도의 예측 가능성이 낮으면 체감 만족도는 생각보다 복합적일 수 있다. 일이 손에 익으면 일과 삶의 균형도 어느 정도 회복되지만, 회사 상황에 따라 바쁜 시기와 한가한 시기의 편차가 커 생활 리듬을 관리하려는 노력이 필요해진다.",
    "three_years": "3년 뒤에는 이직의 가장 큰 성과가 '성장 경험의 밀도'로 남을 가능성이 크다. 새로운 기술을 빠르게 익히고 여러 역할을 맡았던 이력이 쌓여, 같은 개발자 직무 안에서도 선택할 수 있는 포지션이 이전보다 넓어진다. 다만 그 기간 동안 회사가 안정적으로 성장했다면 연봉과 책임이 함께 올라 비교적 만족스러운 결과가 되겠지만, 성장 속도가 둔화되거나 조직 재편이 잦았다면 고용 안정성과 생활 안정성에 대한 고민이 다시 커질 수 있다. 즉, 커리어 성장과 기술 경험 면에서는 분명 얻는 것이 있지만, 안정성과 워라밸을 최우선으로 두는 사람에게는 계속 다닐지 더 안정적인 곳으로 옮길지 판단해야 하는 시점이 온다. 전체적으로 보면 극적인 성공이나 실패보다는, 성장의 폭은 넓어지되 안정성에 대한 민감함도 함께 커지는 현실적인 경로에 가깝다."
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
  "output_file": "playground/outputs/case-01-career-stability/risk-b-result.json"
}
```
