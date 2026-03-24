# Risk B Request Preview

- Request file: `playground/outputs/case-09-overseas-study-vs-work/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-09-overseas-study-vs-work.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/planner-result.json`
- Previous result: `playground/outputs/case-09-overseas-study-vs-work/scenario-b-result.json`

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
    "age": 28,
    "job": "research assistant",
    "risk_tolerance": "medium",
    "priority": [
      "long_term_growth",
      "short_term_income",
      "expertise"
    ]
  },
  "selectedOption": "바로 실무 취업한다",
  "decisionContext": "장기적으로는 특정 분야 전문성을 갖춘 커리어를 만들고 싶지만, 학비와 생활비 부담 때문에 단기 수입도 무시하기 어렵다. 현장 경험을 먼저 쌓는 편이 나을지 계속 고민 중이다.",
  "factors": [
    "장기 커리어 성장 가능성",
    "단기 수입 확보 가능성",
    "특정 분야 전문성 강화 정도",
    "학비·생활비에 따른 재정 부담",
    "현장 실무 경험 축적 속도",
    "선택지별 불확실성과 안정성"
  ],
  "plannerResult": {
    "decision_type": "education",
    "factors": [
      "장기 커리어 성장 가능성",
      "단기 수입 확보 가능성",
      "특정 분야 전문성 강화 정도",
      "학비·생활비에 따른 재정 부담",
      "현장 실무 경험 축적 속도",
      "선택지별 불확실성과 안정성"
    ]
  },
  "scenario": {
    "three_months": "실무 취업을 선택한 직후에는 월급이 들어오기 시작하면서 학비와 생활비 부담이 눈에 띄게 줄어들어 안도감이 커진다. 연구실에서 하던 일과 달리 업무 속도와 협업 방식에 적응하느라 피로감도 있지만, 현장에서 바로 결과를 만드는 경험을 빠르게 쌓으면서 \"지금 당장 수입을 확보한 선택은 현실적으로 맞았다\"는 느낌을 받는다. 다만 맡는 일이 원하는 특정 분야의 핵심 전문성과 완전히 일치하지 않을 수 있어, 장기 커리어 성장과 전문성 강화가 자동으로 따라오지는 않는다는 약한 불안도 함께 생긴다.",
    "one_year": "1년쯤 지나면 수입이 비교적 안정되면서 재정 압박은 크게 완화되고, 경력 공백 없이 실무 경험이 쌓였다는 점에서 심리적 안정도 생긴다. 업무 성과와 프로젝트 경험이 이력서에 쌓이면서 이직이나 사내 이동 가능성도 조금씩 보이지만, 동시에 현장 실무 경험이 빠르게 늘어난 만큼 특정 분야의 깊이 있는 전문성은 의식적으로 보완해야 한다는 현실도 분명해진다. 그래서 퇴근 후 강의, 자격 준비, 관련 프로젝트 참여처럼 추가 학습을 병행할 가능성이 높고, 이 과정에서 단기 수입은 유지되지만 시간 여유는 다소 줄어든다. 불확실성은 진학보다 낮지만, 어떤 업무를 계속 맡느냐에 따라 장기 성장 방향이 달라질 수 있다는 점은 계속 체감한다.",
    "three_years": "3년이 지나면 실무 적응 단계는 넘어섰고, 현장 경험 축적 속도가 빨랐던 선택의 장점이 분명해진다. 재정적으로는 학비 부담을 피한 덕분에 생활 기반이 더 안정적일 가능성이 크고, 경력 연차에 맞는 보상 상승도 기대할 수 있다. 다만 장기 커리어 성장과 특정 분야 전문성은 초기에 어떤 프로젝트를 맡았고, 그 후에 얼마나 의도적으로 분야를 좁혀 갔는지에 따라 차이가 난다. 원하는 전문 분야와 연결된 경험을 꾸준히 쌓았다면 '실무형 전문가'로 자리 잡으며 다음 이직이나 승진에서 경쟁력이 생기지만, 그렇지 않으면 수입과 안정성은 확보했어도 전문성의 선명도가 약해져 방향 전환을 다시 고민할 수 있다. 즉, 이 선택은 단기 수입과 안정성에는 비교적 유리하지만, 장기 전문성은 시간이 해결해 주기보다 스스로 설계해야 하는 경로로 굳어진다."
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
  "output_file": "playground/outputs/case-09-overseas-study-vs-work/risk-b-result.json"
}
```
