# case-08-smallbiz-vs-employment

- Case ID: `case-08-smallbiz-vs-employment`
- Input snapshot: `playground/outputs/case-08-smallbiz-vs-employment/input.json`
- Output directory: `playground/outputs/case-08-smallbiz-vs-employment`

## Input Summary

- Profile: age 35, job office worker, risk tolerance high
- Priority: independence, income, stability
- Option A: 소규모 카페를 창업한다
- Option B: 회사를 취업해 안정적으로 일한다
- Context: 오랫동안 카페 운영을 꿈꿔왔고 어느 정도 모아둔 자금도 있다. 다만 자영업 경험은 없고, 최근 경기 변동성이 커져 창업 타이밍이 맞는지 고민하고 있다.

## State Context

### Profile State

- risk_preference: high
- decision_style: deliberate
- top_priorities: independence, income, stability

### Situational State

- career_stage: mid
- financial_pressure: medium
- time_pressure: unknown
- emotional_state: uncertain

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: accepts volatility for upside
- current_constraint: financial pressure is medium; emotional state is uncertain
- agent_guidance: explain tradeoffs around independence, income, stability while respecting financial pressure is medium; emotional state is uncertain

## Routing

- complexity: high
- risk_level: medium
- ambiguity: medium
- execution_mode: full
- selected_path: planner -> scenario -> risk -> ab_reasoning -> guardrail -> advisor -> reflection
- reason: 복잡도와 불확실성이 함께 높아 planner 이후 심화 검토가 모두 필요하다.

## Planner

- Decision type: career_change
- Factors: 독립성과 자율성 확보 가능성, 수입 안정성과 기대 수익, 직업 안정성과 경기 변동 리스크, 창업 경험 부족에 따른 실행 난이도, 오랜 창업 희망을 실현하는 만족도

## Scenario A

- 3 months: 창업 준비와 오픈 초기에는 회사 생활과 전혀 다른 리듬에 적응하느라 긴장과 기대가 동시에 커진다. 직접 입지, 임대 조건, 인테리어, 원가 계산, 메뉴 구성, 위생·노무 같은 실무를 하나씩 처리하면서 독립적으로 결정한다는 만족감은 분명 크지만, 자영업 경험이 없어 예상보다 판단해야 할 일이 많다는 부담도 크게 느낀다. 오픈 직후에는 지인 방문과 주변 유동인구 덕분에 매출이 어느 정도 나오지만, 시간대별 손님 편차와 재료비·임대료를 반영해 보면 수입은 아직 불안정하다. 그래도 위험을 감수하는 성향 덕분에 초반 시행착오를 감내하며 운영 데이터를 빠르게 쌓으려 하고, 한편으로는 경기 변동에 따라 손님 수가 민감하게 흔들릴 수 있다는 현실을 체감하면서 안정성에 대한 경계심도 함께 생긴다.
- 1 year: 1년이 지나면 카페 운영은 조금 더 체계를 갖추지만, 기대했던 것보다 수입의 변동성이 크다는 점이 분명해진다. 단골이 서서히 생기고 메뉴와 운영 시간이 지역 수요에 맞게 조정되면서 매출은 초반보다 안정되지만, 계절 변화와 소비 위축이 오면 바로 타격을 받기 때문에 직장 시절 같은 고정적 안정감은 없다. 대신 스스로 방향을 정하고 매장 분위기와 서비스 기준을 만들어가는 과정에서 독립성과 자율성에 대한 만족은 꽤 높아진다. 경험 부족에서 비롯된 발주 실수, 인력 운영 문제, 예상 밖의 설비 수리 같은 비용을 몇 차례 겪으면서 실행 난이도도 현실적으로 받아들이게 되고, 무작정 낙관하기보다 현금흐름을 관리하고 작은 개선을 반복하는 쪽으로 태도가 바뀐다. 창업의 꿈을 실제로 살아보고 있다는 성취감은 남지만, 그 만족감이 곧바로 높은 순이익으로 이어지지는 않는다는 점도 냉정하게 인식하게 된다.
- 3 years: 3년쯤 지나면 이 선택은 일회성 도전이 아니라 생활 방식의 전환으로 자리 잡는다. 카페가 완전히 큰 성공을 거두지는 않더라도, 지역 안에서 어느 정도 고객층과 운영 패턴을 확보해 이전보다 예측 가능한 수준의 매출을 만드는 단계에 들어설 가능성이 있다. 다만 경기 변동이나 상권 변화에 따라 수입은 계속 흔들릴 수 있어, 안정성은 회사원 시절보다 낮지만 초창기보다는 관리 가능한 수준으로 바뀐다. 본인이 원하는 콘셉트와 운영 방식을 유지할 수 있다는 점에서 독립성 만족은 계속 크고, 오래 품어온 창업 희망을 실현했다는 자부심도 남는다. 반면 경험 부족은 시간이 지나며 많이 보완되지만, 그 과정에서 배운 것은 카페 운영이 낭만보다 반복 관리와 버티기의 비중이 크다는 사실이다. 결과적으로 이 선택은 높은 자유와 중간 정도의 수익 가능성을 주지만, 안정적인 소득과 직업 안정성을 얻기 위해서는 확장보다 비용 통제와 운영 효율을 꾸준히 다지는 방향으로 현실적인 균형을 잡게 된다.

## Scenario B

- 3 months: 회사를 선택해 입사하거나 이직을 마친 뒤 3개월쯤 지나면, 월급이 규칙적으로 들어오고 생활 리듬이 안정되면서 경기 변동에 대한 불안은 예상보다 빨리 줄어든다. 수입 안정성과 직업 안정성 면에서는 안도감이 크지만, 독립성과 자율성을 중시하는 성향 때문에 조직의 보고 체계와 정해진 역할에 답답함도 함께 느낀다. 카페 창업을 바로 밀어붙이지 않은 덕분에 자영업 경험 부족에서 오는 시행착오는 피했지만, 오래 품어온 꿈을 당장 실현하지 못했다는 아쉬움이 은근히 남아 마음이 완전히 편하지만은 않다.
- 1 year: 1년이 지나면 회사 일은 익숙해지고 성과를 내는 방식도 파악해, 처음보다 자율적으로 일할 여지는 조금 늘어난다. 큰 변동 없이 급여가 들어오고 저축도 다시 쌓이면서 기대 수익은 창업보다 낮더라도 예측 가능하다는 장점이 분명해진다. 특히 경기 상황이 흔들릴 때는 안정적으로 일한다는 선택이 실용적이었다는 확신이 생긴다. 다만 위험 감수 성향이 높은 편이라 마음 한쪽에서는 '지금 너무 안전한 길만 가는 건 아닌가'라는 생각이 반복되고, 창업 경험 부족을 메우기 위해 주말에 상권 분석이나 카페 운영 관련 공부를 시작할 가능성이 크다. 만족감은 생활 안정에서 오지만, 창업 희망 자체는 미뤄진 과제로 남는다.
- 3 years: 3년쯤 지나면 회사 안에서 책임이 늘거나 더 조건이 나은 자리로 옮길 기회가 생기면서, 수입과 안정성은 처음보다 한층 강화될 가능성이 높다. 모아둔 자금도 더 두터워져 예전보다 훨씬 현실적인 판단이 가능해지고, 창업을 바로 하지 않은 시간 덕분에 운영 지식과 준비 수준은 분명 나아진다. 반면 독립성과 자율성을 최우선으로 두는 성향은 쉽게 사라지지 않아, 회사 생활이 안정될수록 오히려 '언제까지 남을까'라는 질문이 더 선명해질 수 있다. 오래된 창업 희망을 아직 실행하지 못한 데서 오는 아쉬움은 남지만, 그 감정이 조급함보다는 준비된 다음 선택을 고민하는 형태로 바뀐다. 결과적으로 이 선택은 큰 실패를 피하고 기반을 다지는 데는 유리하지만, 장기적으로는 안정과 독립 욕구 사이의 긴장을 계속 관리해야 하는 현실적인 경로가 된다.

## Risk A

- Level: medium
- 초기 3개월~1년 동안은 자영업 경험 부족 때문에 입지·원가·노무·설비 같은 운영 판단을 직접 익혀야 하고, 실제로 시행착오와 예상 밖 비용이 발생하는 시나리오라 실행 리스크가 적지 않다.
- 수입은 오픈 초반부터 시간대별 손님 편차와 재료비·임대료 영향을 크게 받고, 1년 시점에도 계절 변화와 소비 위축에 따라 흔들리는 것으로 제시되어 있어 'income'과 'stability' 우선순위에는 부담이 있다.
- 다만 사용자는 위험 감수 성향이 높고 우선순위에서 'independence'를 가장 중시하는데, 이 선택은 3개월 이후부터 독립적 의사결정 만족이 크고 3년 시점에도 자율성과 창업 실현의 만족이 유지되어 체감 위험을 일부 낮춘다.
- 3년 시점에는 완전한 대성공이 아니어도 고객층과 운영 패턴이 어느 정도 자리 잡아 초창기보다 관리 가능한 수준으로 바뀔 가능성이 있어, 위험이 매우 높게 고정되는 선택으로 보기는 어렵다.

## Risk B

- Level: medium
- 단기적으로는 월급과 생활 리듬이 빠르게 안정되고, 경기 변동에 대한 불안도 줄어들어 수입·직업 안정성 측면의 위험은 낮다.
- 하지만 사용자 우선순위 1순위가 독립성인데, 3개월 시점부터 조직의 보고 체계와 정해진 역할에 답답함을 느끼는 시나리오가 제시되어 있어 선택과 성향의 불일치 위험이 있다.
- 1년~3년 동안 안정성과 자금 여력은 더 좋아지지만, 창업 희망이 계속 미뤄지면서 '너무 안전한 길만 가는 건 아닌가'라는 생각이 반복되어 장기 만족도가 떨어질 가능성이 있다.
- 자영업 경험 부족과 경기 변동성이라는 창업 리스크는 피할 수 있지만, 그 대신 장기적으로는 안정과 독립 욕구 사이의 긴장을 계속 관리해야 하는 부담이 남는다.

## A/B Reasoning

### A Reasoning

- stance: conservative
- recommended option: A
- summary: 보수적 reasoning은 사용자의 risk_tolerance가 high이고 최우선 priority가 independence라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.

### B Reasoning

- stance: opportunity_seeking
- recommended option: B
- summary: 기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.

### Comparison

- agreements: 두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.; 두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다.
- conflicts: A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.; A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다.
- which fits user better: B
- reason: 현재 입력에서는 risk_tolerance=high, primary_priority=independence, riskA=medium, riskB=medium 조합 때문에 B 쪽이 사용자 성향과 더 직접적으로 맞는다.

### Final Selection

- selected reasoning: B
- selected option: B
- why selected: 최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 B reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.
- decision confidence: 0.68

## Guardrail

- guardrail_triggered: true
- triggers: reasoning_conflict
- strategy: neutralize_decision
- final_mode: cautious

## Advisor

- Decision: B
- Confidence: 0.53
- Guardrail applied: true
- Recommended option: B
- Reason: guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 reasoning_conflict이고 대응 strategy는 neutralize_decision다. 사용자의 최우선 기준이 independence인 점은 유지하되 riskA=medium, riskB=medium를 더 무겁게 반영해 현재는 B 쪽을 조심스럽게 권한다.
- Reasoning basis: reasoning B / confidence 0.53 / guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.

## Reflection

- evaluation: guardrail final_mode=cautious 조건에서 advisor decision=B와 reasoning 선택이 얼마나 안전하게 연결됐는지 다시 평가한다.
- realism: 4
- consistency: 4
- profile_alignment: 3
- recommendation_clarity: 4
- guardrail_review: needed=true / triggered=true / correctness=good

### 주요 문제

- [profile] planner가 career_change로 의사결정을 분류했지만, 최우선 priority인 independence을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.
- [reasoning] reasoning의 최종 선택은 reasoning B, option B, confidence 0.68로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.
- [advisor] advisor가 B를 제시하지만 riskA=medium, riskB=medium, guardrail final_mode=cautious를 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.

### 개선 방향

- [scenario] 각 시간 축 문장에서 independence 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.
- [reasoning] A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라.
- [advisor] 최종 추천 사유를 priority, risk, reasoning, guardrail, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라.

- Overall comment: 전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다.
