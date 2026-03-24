# Risk B Request Preview

- Request file: `playground/outputs/case-02-career-growth/risk-b-request.json`
- Prompt file: `prompts/risk.md`
- Input source: `playground/inputs/cases/case-02-career-growth.json`
- Previous result: `playground/outputs/case-02-career-growth/planner-result.json`
- Previous result: `playground/outputs/case-02-career-growth/scenario-b-result.json`

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
    "age": 29,
    "job": "developer",
    "risk_tolerance": "high",
    "priority": [
      "growth",
      "ownership",
      "learning"
    ]
  },
  "selectedOption": "AI 스타트업으로 이직한다",
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
  },
  "scenario": {
    "three_months": "이직 직후 3개월은 기대감과 긴장감이 동시에 크다. 팀 규모가 작아 바로 핵심 기능 기획과 모델 실험, 배포까지 관여하게 되면서 이전 회사보다 제품 영향력과 오너십이 훨씬 크게 느껴진다. 생성형 AI 기능을 실제 사용자 반응에 맞춰 빠르게 수정하는 과정에서 학습 속도는 매우 빠르지만, 문서화와 역할 경계가 느슨해 회의 중 결정이 자주 바뀌고 우선순위도 흔들린다. 본인은 원래 성장과 배움을 중시하고 위험 감수 성향도 높아 이런 속도를 자극적으로 받아들이지만, 조직 안정성이 낮고 프로세스 체계가 약하다는 점은 초반부터 분명히 체감한다. 성과가 보이면 보람이 크지만, 하루하루 일이 몰려들어 안정감보다는 몰입감이 더 큰 시기다.",
    "one_year": "1년쯤 지나면 단순히 빠르게 일하는 수준을 넘어, 특정 기능이나 제품 라인의 사실상 책임자처럼 움직일 가능성이 크다. 회사가 살아남아 일정 수준의 시장 반응을 확보했다면, 이직 당시 원했던 커리어 확장성은 현실이 된다. 채용, 기술 의사결정, 지표 개선, 고객 피드백 반영까지 폭넓게 관여하면서 개발자이면서도 제품 감각과 사업 이해를 함께 쌓게 된다. 생성형 AI를 실전에 붙이며 얻은 경험은 이력서에서도 분명한 강점이 되지만, 동시에 모델 비용 관리, 품질 한계, 규제와 데이터 이슈 같은 현실적인 어려움도 반복해서 마주한다. 반대로 회사 상황이 기대만큼 좋지 않다면 방향 전환이나 자금 압박으로 팀 분위기가 불안정해질 수 있고, 빠른 실행이 장점이던 문화가 단기 대응 위주로 변해 피로감을 줄 수도 있다. 그래도 본인처럼 성장과 오너십을 우선하는 사람에게는, 안정성의 대가를 치르더라도 얻는 학습 밀도가 꽤 높다고 느껴질 가능성이 크다.",
    "three_years": "3년 후에는 결과가 한 방향으로 극단화되기보다, 분명한 자산과 남는 불확실성이 함께 보인다. 회사가 완전히 크게 성공하지 않더라도, 초기 단계에서 제품 영향력과 오너십을 갖고 생성형 AI 서비스를 직접 만들고 운영한 경험은 다음 커리어 선택지의 폭을 넓혀준다. 시니어 IC, 테크 리드, 초기 제품 엔지니어, 혹은 다른 스타트업의 핵심 멤버 같은 경로를 검토할 수 있고, 본인도 예전보다 더 큰 책임을 감당할 수 있다는 자신감을 얻는다. 다만 조직 안정성과 실패 리스크는 끝까지 사라지지 않아서, 회사가 합병되거나 전략 수정으로 팀이 재편될 가능성도 충분히 있다. 프로세스가 어느 정도 정착한 조직으로 성장했다면 실행 속도와 체계의 균형을 배우게 되고, 그렇지 않다면 반복되는 우선순위 변경 속에서 번아웃 조짐을 관리해야 할 수도 있다. 전체적으로 보면 이 선택은 안정 대신 성장, 학습, 오너십을 크게 확보하는 쪽으로 작동하며, 위험을 감수할 의지가 있는 현재의 성향과는 비교적 잘 맞지만 장기적으로는 스스로 불확실성을 견딜 기준을 계속 점검해야 하는 시나리오다."
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
  "output_file": "playground/outputs/case-02-career-growth/risk-b-result.json"
}
```
