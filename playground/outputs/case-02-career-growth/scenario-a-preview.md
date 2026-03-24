# Scenario A Request Preview

- Request file: `playground/outputs/case-02-career-growth/scenario-a-request.json`
- Prompt file: `prompts/scenario.md`
- Input source: `playground/inputs/cases/case-02-career-growth.json`
- Previous result: `playground/outputs/case-02-career-growth/planner-result.json`

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
  "optionLabel": "A",
  "userProfile": {
    "age": 29,
    "job": "developer",
    "risk_tolerance": "high",
    "priority": [
      "growth",
      "ownership",
      "learning"
    ]
  },
  "selectedOption": "대기업 플랫폼팀에 남는다",
  "decisionContext": "현재 회사는 시스템과 프로세스가 잘 잡혀 있지만 개인이 내리는 제품 영향력은 작다. 생성형 AI 제품을 빠르게 만들 수 있는 환경에 끌리지만 실패 가능성도 알고 있다.",
  "factors": [
    "성장 속도와 커리어 확장성",
    "제품 영향력과 오너십 수준",
    "생성형 AI 학습 및 실전 경험 기회",
    "조직 안정성과 실패 리스크",
    "프로세스 체계와 실행 속도"
  ],
  "plannerResult": {
    "decision_type": "career_change",
    "factors": [
      "성장 속도와 커리어 확장성",
      "제품 영향력과 오너십 수준",
      "생성형 AI 학습 및 실전 경험 기회",
      "조직 안정성과 실패 리스크",
      "프로세스 체계와 실행 속도"
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
  "output_file": "playground/outputs/case-02-career-growth/scenario-a-result.json"
}
```
