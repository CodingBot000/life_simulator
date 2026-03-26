# case-03-startup-vs-job

- Case ID: `case-03-startup-vs-job`
- Input snapshot: `playground/outputs/case-03-startup-vs-job/input.json`
- Output directory: `playground/outputs/case-03-startup-vs-job`

## Input Summary

- Profile: age 34, job product manager, risk tolerance medium
- Priority: independence, growth, income
- Option A: 작은 SaaS를 창업한다
- Option B: 안정적인 IT 회사에 취업한다
- Context: 그동안 사이드프로젝트를 여러 번 해보며 직접 제품을 만들고 싶다는 생각이 커졌다. 다만 대출 상환과 생활비 부담도 있어 당장 수입이 끊기는 상황은 부담스럽다.

## State Context

### Profile State

- risk_preference: medium
- decision_style: deliberate
- top_priorities: independence, growth, income

### Situational State

- career_stage: mid
- financial_pressure: high
- time_pressure: unknown
- emotional_state: uncertain

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: balances stability and upside
- current_constraint: financial pressure is high; emotional state is uncertain
- agent_guidance: explain tradeoffs around independence, growth, income while respecting financial pressure is high; emotional state is uncertain

## Routing

- complexity: high
- risk_level: high
- ambiguity: medium
- execution_mode: full
- selected_path: planner -> scenario -> risk -> ab_reasoning -> guardrail -> advisor -> reflection
- reason: 잘못 판단했을 때 손실 규모가 커 고위험 케이스로 보고 전체 경로 실행이 필요하다.

## Planner

- Decision type: career_change
- Factors: 수입 안정성, 성장 가능성, 업무 자율성과 독립성, 생활비 및 대출 상환 부담 대응 가능성, 중간 수준의 리스크 감내도와의 적합성

## Scenario A

- 3 months: 처음 3개월은 기대감과 긴장감이 함께 크다. 직접 문제를 정의하고 제품 방향을 정하는 과정에서 업무 자율성과 독립성은 분명히 커져 만족감이 높지만, 동시에 기능 범위를 줄이고 출시 속도를 맞추느라 일상이 빡빡해진다. 중간 수준의 리스크 감내도에 맞춰 초기부터 큰 비용을 쓰기보다 작게 검증하려 하고, 생활비와 대출 상환 부담 때문에 고정지출을 재점검하며 월별 현금흐름을 세심하게 관리하게 된다. 아직 수입 안정성은 낮아 불안한 날도 있지만, 몇 명의 초기 사용자가 실제로 반응을 보이기 시작하면 성장 가능성에 대한 확신이 아주 조금 생긴다.
- 1 year: 1년쯤 지나면 제품은 한두 번의 방향 수정 끝에 특정 고객층에 조금 더 맞춰지고, 소규모이지만 꾸준히 결제하는 사용자가 생긴다. 큰 수익은 아니어도 매출이 반복적으로 들어오면서 완전한 불확실성에서는 벗어나지만, 생활비와 대출 상환을 모두 넉넉히 감당하기에는 여전히 빠듯할 수 있다. 대신 직접 고객 인터뷰, 가격 조정, 기능 우선순위 판단까지 해보며 성장 속도는 회사에 있을 때보다 훨씬 가파르게 느껴진다. 독립적으로 일하는 만족은 크지만, 매출 변동과 혼자 결정해야 하는 부담 때문에 심리적으로 흔들리는 시기도 있고, 그래서 무리한 확장보다 수입 안정성을 조금씩 높이는 방향으로 운영 방식을 보수적으로 다듬게 된다.
- 3 years: 3년 후에는 이 선택이 자신의 일 방식과 맞는지 비교적 분명해진다. SaaS가 완전히 폭발적으로 성장하지는 않더라도, 특정 시장에서 쓸모 있는 도구로 자리 잡으면 이전보다 예측 가능한 매출 구조를 만들 수 있고, 생활비와 대출 상환도 어느 정도 계획적으로 대응할 가능성이 높아진다. 반대로 성장 속도가 기대보다 느리더라도, 그 과정에서 제품 개발, 고객 확보, 수익화 경험을 축적해 이후 다른 창업이나 프리랜스, 작은 팀 운영으로 이어질 기반이 생긴다. 즉 수입 안정성은 대기업 수준만큼 강하지 않지만, 업무 자율성과 독립성은 가장 크게 확보되고, 성장 가능성도 본인 실행력에 따라 계속 열려 있다. 중간 수준의 리스크를 감당하는 사람에게는 불안과 보람이 함께 가는 선택이지만, 시간이 지날수록 단순한 충동이 아니라 스스로 만든 경력의 방향으로 굳어질 가능성이 크다.

## Scenario B

- 3 months: 안정적인 IT 회사에 입사한 뒤 3개월쯤 지나면 가장 먼저 느끼는 변화는 수입이 다시 예측 가능해졌다는 안도감이다. 월급이 정기적으로 들어오면서 생활비와 대출 상환 계획이 다시 정리되고, 당장 현금흐름을 걱정하던 압박은 줄어든다. 다만 업무는 이미 검증된 제품과 프로세스 안에서 진행되기 때문에, 직접 방향을 정하고 빠르게 실험하던 사이드프로젝트 때보다 자율성과 독립성은 제한적으로 느껴질 수 있다. 대신 제품 조직 내에서 데이터, 운영, 협업 구조를 체계적으로 배우며 성장 가능성을 확인하게 되고, ‘지금은 기반을 다지는 시기’라고 받아들이면서도 한편으로는 내 아이디어를 더 주도적으로 실행하고 싶다는 마음이 완전히 사라지지는 않는다. 전체적으로는 중간 수준의 리스크 감내도에 맞는 선택이었다는 생각이 들지만, 안정과 독립성 사이의 간극을 의식하기 시작하는 시점이다.
- 1 year: 1년이 지나면 회사 생활의 리듬에 익숙해지고, 성과를 내는 방식도 보다 명확해진다. 수입 안정성은 여전히 큰 장점으로 작용해 대출 상환 부담은 관리 가능한 수준으로 유지되고, 생활비 때문에 즉흥적으로 커리어 결정을 내려야 하는 압박도 줄어든다. 연봉 인상이나 성과급이 크지는 않더라도 예측 가능한 범위 안에서 개선되면 심리적으로는 꽤 안정감을 준다. 성장 측면에서는 제품 운영, 사용자 지표, 조직 내 의사결정 구조를 깊게 이해하며 PM으로서 역량이 단단해지지만, 동시에 회사 안에서의 성장과 내가 진짜 원하는 독립적인 제품 경험 사이에 차이가 있다는 점도 선명해진다. 그래서 퇴근 후나 주말에 작은 검증형 사이드프로젝트를 다시 시작할 가능성이 높다. 이때의 감정은 ‘창업을 당장 뛰어들기엔 아직 부담스럽지만, 완전히 포기하고 싶지도 않다’에 가깝고, 결과적으로 안정적인 직장을 기반으로 리스크를 통제하며 다음 선택지를 준비하는 흐름이 만들어진다.
- 3 years: 3년 정도 지나면 이 선택의 성격이 더 분명해진다. 안정적인 회사에 남아 있으면 수입과 경력은 비교적 꾸준히 쌓이고, 생활비와 대출 상환 대응 능력도 초반보다 훨씬 여유로워질 가능성이 크다. 중간 수준의 리스크 성향을 가진 사람에게는 이런 누적된 안전판이 실제로 큰 의미가 있어서, 무리한 도전 없이도 다음 단계를 선택할 수 있는 폭이 넓어진다. 다만 업무 자율성과 독립성에 대한 우선순위가 높은 만큼, 회사 안에서 권한이 커지지 않거나 맡는 역할이 반복적으로 느껴지면 답답함이 다시 커질 수 있다. 반대로 내부에서 신규 제품이나 작은 사업 단위를 맡게 되면, 안정성을 유지한 채 독립성 욕구를 일부 충족하는 방향으로 만족도가 올라간다. 결국 3년 뒤의 모습은 ‘완전히 안전해서 모든 갈증이 해소된 상태’라기보다, 재무적 기반과 실무 역량을 확보한 대신 독립적으로 무언가를 만들고 싶은 욕구를 더 구체적이고 현실적인 계획으로 바꿔놓은 상태에 가깝다.

## Risk A

- Level: medium
- 초기 3개월과 1년 시점 모두 수입 안정성이 낮거나 빠듯하다고 제시되어 있어, 생활비와 대출 상환 부담이 있는 상황에서는 현금흐름 리스크가 현실적으로 존재한다.
- 다만 사용자의 우선순위인 독립성과 성장 측면에서는 직접 제품 방향을 정하고 고객 반응을 바탕으로 빠르게 학습하는 구조가 강하게 맞아, 선택 자체가 성향과 크게 어긋나지는 않는다.
- 1년 후에는 반복 매출이 생겨 완전한 불확실성에서는 벗어나고, 3년 후에는 예측 가능한 매출 구조를 만들 가능성도 있어 위험이 장기적으로 완화될 여지는 있다.
- 중간 수준의 리스크 감내도에는 맞출 수 있지만, 시나리오에서도 무리한 확장보다 보수적 운영이 필요하다고 나타나므로 안정적 소득을 최우선으로 보는 경우보다 부담이 더 큰 선택이다.

## Risk B

- Level: medium
- 3개월~1년 시점에는 정기적인 급여로 생활비와 대출 상환 계획을 안정적으로 유지할 수 있어 소득 측면의 위험은 낮다.
- 다만 사용자의 우선순위에 있는 독립성과 자율성은 회사의 검증된 프로세스 안에서 제한적으로 느껴질 수 있어, 만족도 저하 위험이 초기에 이미 나타난다.
- 1년 이후에는 PM 역량과 조직 경험이 쌓여 성장 기반은 생기지만, 사용자가 원하는 '직접 제품을 만드는 경험'과의 차이가 더 선명해져 장기적으로 방향성 갈등이 커질 수 있다.
- 3년 시점에도 재무적 안전판은 강화되지만, 회사 안에서 권한 확대나 신규 사업 기회가 없으면 반복감과 답답함이 누적될 가능성이 있어 완전한 저위험 선택으로 보기는 어렵다.

## A/B Reasoning

### A Reasoning

- stance: conservative
- recommended option: A
- summary: 보수적 reasoning은 사용자의 risk_tolerance가 medium이고 최우선 priority가 independence라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.

### B Reasoning

- stance: opportunity_seeking
- recommended option: B
- summary: 기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.

### Comparison

- agreements: 두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.; 두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다.
- conflicts: A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.; A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다.
- which fits user better: A
- reason: 현재 입력에서는 risk_tolerance=medium, primary_priority=independence, riskA=medium, riskB=medium 조합 때문에 A 쪽이 사용자 성향과 더 직접적으로 맞는다.

### Final Selection

- selected reasoning: A
- selected option: A
- why selected: 최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 A reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.
- decision confidence: 0.70

## Guardrail

- guardrail_triggered: true
- triggers: reasoning_conflict
- strategy: neutralize_decision
- final_mode: cautious

## Advisor

- Decision: A
- Confidence: 0.5499999999999999
- Guardrail applied: true
- Recommended option: A
- Reason: guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 reasoning_conflict이고 대응 strategy는 neutralize_decision다. 사용자의 최우선 기준이 independence인 점은 유지하되 riskA=medium, riskB=medium를 더 무겁게 반영해 현재는 A 쪽을 조심스럽게 권한다.
- Reasoning basis: reasoning A / confidence 0.5499999999999999 / guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.

## Reflection

- evaluation: guardrail final_mode=cautious 조건에서 advisor decision=A와 reasoning 선택이 얼마나 안전하게 연결됐는지 다시 평가한다.
- realism: 4
- consistency: 4
- profile_alignment: 3
- recommendation_clarity: 4
- guardrail_review: needed=true / triggered=true / correctness=good

### 주요 문제

- [profile] planner가 career_change로 의사결정을 분류했지만, 최우선 priority인 independence을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.
- [reasoning] reasoning의 최종 선택은 reasoning A, option A, confidence 0.70로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.
- [advisor] advisor가 A를 제시하지만 riskA=medium, riskB=medium, guardrail final_mode=cautious를 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.

### 개선 방향

- [scenario] 각 시간 축 문장에서 independence 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.
- [reasoning] A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라.
- [advisor] 최종 추천 사유를 priority, risk, reasoning, guardrail, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라.

- Overall comment: 전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다.
