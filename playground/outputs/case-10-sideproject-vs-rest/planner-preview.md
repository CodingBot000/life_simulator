# Planner Request Preview

- Request file: `playground/outputs/case-10-sideproject-vs-rest/planner-request.json`
- Prompt file: `prompts/planner.md`
- Input source: `playground/inputs/cases/case-10-sideproject-vs-rest.json`
- Previous result: `(none)`

## Prompt

```md
너는 의사결정 시뮬레이션 체인의 Planner Agent다.

목표:
- 사용자 프로필과 decision 입력을 읽고 의사결정 유형을 한 줄로 분류한다.
- 이후 단계에서 재사용할 핵심 비교 요소 factors를 3~6개 도출한다.
- factors는 실제로 A/B 선택지를 비교할 때 의미가 있는 항목만 남긴다.

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
  }
}
```

판단 규칙:
- `decision_type`은 `career_change`, `relationship`, `financial`, `living`, `education`처럼 짧고 재사용 가능한 범주형 문자열로 작성한다.
- `factors`는 실제 비교 기준이 되는 문자열 배열이어야 한다.
- `priority`, `risk_tolerance`, `decision.context`를 반드시 반영한다.
- 입력에 없는 사실을 추가로 만들지 않는다.
- 응답은 반드시 한국어 기반의 유효한 JSON만 반환한다.
- 마크다운, 코드블록, 설명 문장, 여분 텍스트는 절대 포함하지 않는다.

출력 JSON 형식:
```json
{
  "decision_type": "",
  "factors": []
}
```
```

## Input JSON

```json
{
  "userProfile": {
    "age": 34,
    "job": "product manager",
    "risk_tolerance": "low",
    "priority": [
      "health",
      "sustainability",
      "future_optionality"
    ]
  },
  "decision": {
    "optionA": "퇴근 후 사이드프로젝트를 계속한다",
    "optionB": "휴식과 회복에 집중한다",
    "context": "본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다."
  }
}
```

## Expected Output Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "decision_type": {
      "type": "string"
    },
    "factors": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  },
  "required": [
    "decision_type",
    "factors"
  ]
}
```

## Provider Payload Preview

```json
{
  "runner": "codex exec",
  "call_status": "ready",
  "output_file": "playground/outputs/case-10-sideproject-vs-rest/planner-result.json"
}
```
