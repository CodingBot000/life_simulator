# Scenario B Request Preview

- Request file: `playground/outputs/case-05-relocation/scenario-b-request.json`
- Prompt file: `prompts/scenario.md`
- Input source: `playground/inputs/cases/case-05-relocation.json`
- Previous result: `playground/outputs/case-05-relocation/planner-result.json`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Scenario Agent다.

목표:
- 하나의 선택지에 대해 현실적인 미래 시나리오를 작성한다.
- 각 시점은 감정, 사건, 결과가 자연스럽게 함께 드러나야 한다.
- 과장, 판타지식 전개, 근거 없는 성공/실패 서사는 금지한다.

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
  }
}
```

작성 규칙:
- 반드시 현재 입력으로 주어진 `selectedOption` 하나만 기준으로 분석한다.
- `userProfile.risk_tolerance`와 `userProfile.priority`를 시나리오 전개에 반영한다.
- `factors`를 무시하지 말고 각 시점의 전개에 연결한다.
- `three_months`, `one_year`, `three_years`는 각각 서로 다른 시간 축의 변화를 보여줘야 한다.
- 비현실적 확신, 극단적 성공, 극단적 파국은 피한다.
- 응답은 반드시 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "three_months": "",
  "one_year": "",
  "three_years": ""
}
```
```

## Input JSON

```json
{
  "optionLabel": "B",
  "userProfile": {
    "age": 30,
    "job": "backend developer",
    "risk_tolerance": "medium",
    "priority": [
      "stability",
      "experience",
      "future_opportunity"
    ]
  },
  "selectedOption": "일본으로 이주해 새 직장을 찾는다",
  "decisionContext": "해외 생활 경험과 장기적인 커리어 확장을 원하지만, 언어와 비자 문제 때문에 초기 적응 실패 가능성도 현실적으로 크다. 현재 한국에서는 무난한 팀과 안정적인 연봉을 유지하고 있다.",
  "factors": [
    "안정적인 수입과 고용 지속성",
    "해외 생활 및 새로운 경험의 실질적 가치",
    "장기적인 커리어 확장성과 미래 기회",
    "언어·비자 문제로 인한 초기 적응 리스크",
    "현재 커리어 연속성 대비 환경 변화 부담"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "안정적인 수입과 고용 지속성",
      "해외 생활 및 새로운 경험의 실질적 가치",
      "장기적인 커리어 확장성과 미래 기회",
      "언어·비자 문제로 인한 초기 적응 리스크",
      "현재 커리어 연속성 대비 환경 변화 부담"
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
    "three_months": {
      "type": "string"
    },
    "one_year": {
      "type": "string"
    },
    "three_years": {
      "type": "string"
    }
  },
  "required": [
    "three_months",
    "one_year",
    "three_years"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-05-relocation/scenario-b-result.json"
}
```
