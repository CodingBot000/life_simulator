# Risk A Request Preview

- Request file: `playground/outputs/case-10-sideproject-vs-rest/risk-a-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-10-sideproject-vs-rest.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/planner-result.json`
- Previous result: `playground/outputs/case-10-sideproject-vs-rest/scenario-a-result.json`

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
    "age": 34,
    "job": "product manager",
    "risk_tolerance": "low",
    "priority": [
      "health",
      "sustainability",
      "future_optionality"
    ]
  },
  "selectedOption": "퇴근 후 사이드프로젝트를 계속한다",
  "decisionContext": "본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다.",
  "factors": [
    "건강과 번아웃 회복 가능성",
    "수면·집중력 저하를 줄이는 정도",
    "본업과 병행했을 때의 안정성",
    "장기적으로 지속 가능한 생활 리듬",
    "포트폴리오를 통한 미래 선택지 확대"
  ],
  "plannerResult": {
    "decision_type": "work_life_balance",
    "factors": [
      "건강과 번아웃 회복 가능성",
      "수면·집중력 저하를 줄이는 정도",
      "본업과 병행했을 때의 안정성",
      "장기적으로 지속 가능한 생활 리듬",
      "포트폴리오를 통한 미래 선택지 확대"
    ]
  },
  "scenario": {
    "three_months": "퇴근 후 사이드프로젝트를 계속하는 선택을 유지하면, 처음 몇 주는 ‘그래도 여기서 멈추면 아깝다’는 마음으로 버티게 된다. 다만 이미 떨어진 수면과 집중력은 바로 회복되지 않아 오전 업무에서 피로감이 누적되고, 작은 의사결정에도 시간이 더 걸리는 날이 잦아진다. 본업을 유지하고 있어 수입과 고용 안정성은 그대로 지켜지지만, 낮은 위험 선호 성향 때문에 프로젝트를 더 크게 벌리기보다 기능 범위를 줄이고 주 2~3회만 작업하는 식으로 스스로 속도를 조절하려 할 가능성이 높다. 그 결과 번아웃이 급격히 악화되지는 않지만 완전히 회복되지도 않는 애매한 상태가 이어지고, 포트폴리오는 조금씩 쌓이되 생활 리듬은 아직 불안정하다고 느끼게 된다.",
    "one_year": "1년 정도 지나면 이 선택은 두 가지가 함께 드러난다. 한편으로는 사이드프로젝트가 실제 결과물로 남아 포트폴리오의 밀도가 높아지고, 이직이나 프리랜스 협업 제안처럼 미래 선택지를 넓혀 주는 재료가 생긴다. 다른 한편으로는 본업이 바쁜 시기마다 저녁과 주말이 다시 잠식되면서 건강 관리가 계속 후순위로 밀릴 수 있다. 수면 패턴을 의식적으로 고치지 않으면 집중력 저하는 만성화되어 본업 성과에도 미세한 영향이 나타나고, 성취감보다 ‘계속 돌려막기 하는 생활’이라는 피로가 더 크게 느껴질 수 있다. 반대로 프로젝트의 속도를 의도적으로 낮추고 휴식, 운동, 수면 시간을 고정해 두면 큰 손상 없이 병행이 가능하지만, 그 경우 성장 속도는 느려져도 지속 가능성은 높아진다. 즉 1년 시점의 핵심은 성과 자체보다, 이 선택을 감당할 생활 리듬을 만들었는지에 달려 있다.",
    "three_years": "3년 후에는 퇴근 후 사이드프로젝트를 계속한 시간이 분명한 자산으로 남을 가능성이 크다. 당장 회사를 그만두지 않았기 때문에 안정성은 유지되고, 축적된 결과물 덕분에 새로운 직무, 더 유연한 역할, 개인 브랜드 기반의 기회처럼 미래 선택지는 지금보다 넓어져 있을 수 있다. 하지만 건강과 수면 문제를 초반에 제대로 다루지 못했다면, 프로젝트가 커졌더라도 몸과 집중력이 받쳐주지 않아 결국 몇 차례 긴 휴식이나 강제 축소를 거치게 될 가능성도 현실적이다. 반대로 낮은 위험 선호에 맞게 본업을 기반으로 두고 프로젝트를 천천히 운영하며 지속 가능한 리듬을 구축했다면, 큰 도약은 아니어도 ‘건강을 해치지 않으면서도 다음 선택을 준비해 둔 상태’에 가까워진다. 이 선택의 장기 결과는 극적인 성공보다, 무리하지 않는 속도로 포트폴리오를 쌓아 미래 옵션을 확보하되 건강 비용을 얼마나 잘 통제했는지에 의해 결정될 가능성이 높다."
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
  "output_file": "playground/outputs/case-10-sideproject-vs-rest/risk-a-result.json"
}
```
