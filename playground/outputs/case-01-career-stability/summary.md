# case-01-career-stability

- Case ID: `case-01-career-stability`
- Input snapshot: `playground/outputs/case-01-career-stability/input.json`
- Output directory: `playground/outputs/case-01-career-stability`

## Input Summary

- Profile: age 32, job developer, risk tolerance low
- Priority: stability, income, work_life_balance
- Option A: 현재 회사에 남는다
- Option B: 스타트업으로 이직한다
- Context: 현재 회사는 연봉과 복지가 안정적이지만 최근 2년 동안 역할 변화가 거의 없었다. 새로운 기술을 더 가까이에서 다루고 싶지만 생활 안정성을 해칠까 걱정하고 있다.

## State Context

### Profile State

- risk_preference: low
- decision_style: deliberate
- top_priorities: stability, income, work_life_balance

### Situational State

- career_stage: mid
- financial_pressure: medium
- time_pressure: unknown
- emotional_state: unknown

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: leans conservative under uncertainty
- current_constraint: financial pressure is medium
- agent_guidance: explain tradeoffs around stability, income, work_life_balance while respecting financial pressure is medium

## Routing

- complexity: medium
- risk_level: high
- ambiguity: low
- execution_mode: full
- selected_path: planner -> scenario -> risk -> ab_reasoning -> advisor -> reflection
- reason: 잘못 판단했을 때 손실 규모가 커 고위험 케이스로 보고 전체 경로 실행이 필요하다.

## Planner

- Decision type: career_change
- Factors: 고용 및 생활 안정성, 연봉 및 복지 수준, 역할 변화와 커리어 성장 가능성, 새로운 기술을 가까이서 다룰 기회, 워라밸 유지 가능성

## Scenario A

- 3 months: 현재 회사에 남은 지 3개월쯤 지나면, 당장의 이직 부담이 사라졌다는 점에서 마음은 한결 안정된다. 연봉과 복지, 익숙한 업무 환경이 유지되어 생활 계획을 흔들지 않아도 된다는 안도감이 크고, 워라밸도 지금 수준에서 크게 무너지지 않는다. 다만 역할 자체는 크게 달라지지 않아 일상 업무는 무난하지만 다소 반복적으로 느껴지고, 새로운 기술을 직접 다룰 기회가 생각보다 제한적이라는 점에서 약한 답답함이 남는다. 대신 리스크를 크게 지지 않는 선에서 사내 스터디나 작은 개선 과제를 자발적으로 맡아 보며 성장 가능성을 시험해 보려는 움직임이 생긴다.
- 1 year: 1년이 지나면 안정성 측면에서는 선택의 장점이 더 분명해진다. 고용과 생활은 대체로 안정적으로 유지되고, 연봉은 큰 폭은 아니더라도 정기 인상이나 성과급 수준에서 무난하게 관리될 가능성이 높다. 워라밸 역시 급격히 나빠지지 않아 일과 생활의 균형은 비교적 잘 지켜진다. 그러나 커리어 성장과 역할 변화에서는 복합적인 감정이 생긴다. 스스로 작은 프로젝트나 협업 범위를 넓혀 보지 않았다면 정체감이 더 선명해지고, 반대로 내부에서 기술 개선이나 자동화, 신규 도입 검토 같은 기회를 꾸준히 찾았다면 제한적이지만 의미 있는 변화가 생긴다. 새로운 기술을 가까이서 다루는 경험은 외부 이직만큼 빠르지는 않지만, 현재 회사를 기반으로 천천히 넓혀 가는 형태가 된다. 만족감은 안정에서 오고, 아쉬움은 성장 속도에서 온다.
- 3 years: 3년 후에는 이 선택의 성격이 더 뚜렷해진다. 생활 안정성, 꾸준한 소득, 복지, 예측 가능한 워라밸을 중시한 결정은 전반적으로 사용자 성향과 맞아 심리적 피로를 크게 줄여 준다. 경제적으로는 큰 도약은 아니어도 급격한 하락 없이 안정적인 흐름을 만들 가능성이 높다. 다만 역할 변화와 커리어 성장 가능성은 본인의 추가 행동 여부에 따라 차이가 커진다. 회사 안에서 점진적으로 책임 범위를 넓히고 새로운 기술을 일부라도 실무에 연결해 왔다면, 전문성은 느리지만 단단하게 쌓여 팀 내 신뢰와 안정적인 입지를 얻는다. 반대로 기존 업무에만 머물렀다면, 안정은 유지되지만 기술적 시장 경쟁력이나 성장 만족도에 대한 아쉬움이 커질 수 있다. 즉 이 선택은 파격적인 변화보다 안정적 기반을 지키는 데 강점이 있고, 성장의 폭은 회사를 바꾸느냐보다 회사 안에서 얼마나 의도적으로 기회를 만들었느냐에 달려 있게 된다.

## Scenario B

- 3 months: 스타트업으로 옮긴 직후 3개월은 기대감과 긴장감이 함께 간다. 개발자로서 더 가까이에서 새로운 기술 스택과 제품 의사결정을 접하면서 역할 범위가 넓어져, 이전 회사에서 느끼던 정체감은 다소 줄어든다. 다만 낮은 위험 감수 성향 때문에 고용 및 생활 안정성에 대한 불안은 쉽게 사라지지 않고, 연봉이나 복지 조건이 이전보다 조금 낮거나 불확실하게 느껴질 수 있다. 초기에는 업무 구조가 빠르게 바뀌고 책임이 넓어져 퇴근 후에도 머리가 바쁜 날이 많아 워라밸은 일시적으로 흔들리지만, 동시에 배우는 속도와 성장 체감은 분명히 커진다.
- 1 year: 1년쯤 지나면 업무 흐름과 팀 문화에 익숙해지면서 감정의 기복은 줄고, 이직이 완전히 무모한 선택은 아니었다는 안도감이 생길 가능성이 크다. 새로운 기술을 실제 서비스에 적용한 경험이 쌓여 역할 변화와 커리어 성장 가능성은 이전보다 뚜렷해지고, 작은 조직에서 주도적으로 문제를 푼 경험이 이력에도 남는다. 반면 안정성과 워라밸은 회사 상황에 따라 편차가 커서, 제품 일정이나 투자 환경이 좋지 않으면 야근이 잦아지고 생활 리듬이 흔들릴 수 있다. 연봉은 기본급만 보면 큰 차이가 없더라도 성과 보상이나 스톡옵션 기대가 포함돼 체감이 복합적이며, 복지는 이전 직장보다 단순해져 아쉬움이 남을 수 있다.
- 3 years: 3년 후에는 이직의 의미가 더 현실적으로 정리된다. 회사가 일정 수준 이상 자리를 잡았다면, 당신은 새로운 기술과 빠른 실행 환경을 경험한 개발자로서 시장가치가 높아지고 다음 커리어 선택지도 넓어진다. 그 경우 초반의 불안은 줄고, 성장 측면에서는 분명한 성과를 느끼지만, 안정성과 워라밸은 여전히 대기업이나 안정적인 조직보다 덜 예측 가능하다고 받아들이게 된다. 반대로 회사가 기대만큼 성장하지 못하더라도, 극단적 실패라기보다 연봉·복지·고용 안정성의 한계를 체감하며 다시 더 안정적인 회사로 이동할 준비를 하게 될 가능성이 높다. 즉, 이 선택은 낮은 위험 선호를 가진 사람에게 마음 편한 길은 아니지만, 생활 안정성을 일부 감수하는 대신 역할 변화, 기술 경험, 커리어 성장의 폭을 실제로 넓히는 방향으로 작동할 가능성이 크다.

## Risk A

- Level: low
- 사용자의 최우선 순위인 안정성·소득·워라밸이 3개월, 1년, 3년 시나리오 전반에서 크게 흔들리지 않고 유지되는 흐름이라 저위험 성향과 잘 맞는다.
- 3개월과 1년 시점에서 이직 부담이 없고 연봉·복지·익숙한 업무 환경이 유지되어 생활 계획이 깨질 가능성이 낮다.
- 1년 이후에도 소득은 큰 도약은 아니어도 정기 인상이나 성과급 수준에서 무난하게 관리될 가능성이 제시되어, 급격한 수입 하락 위험은 작다.
- 주된 위험은 역할 변화와 새로운 기술 경험이 제한되어 3년 뒤 성장 정체감이나 시장 경쟁력 아쉬움이 커질 수 있다는 점이지만, 이는 생활 기반을 흔드는 직접적 위험보다는 기회비용에 가깝다.

## Risk B

- Level: high
- 사용자의 최우선 순위가 안정성인데, 시나리오 전반에서 스타트업의 고용 및 생활 안정성이 이전보다 덜 예측 가능하고 초반 3개월에도 불안이 쉽게 사라지지 않는다고 제시된다.
- 연봉과 복지 역시 현재보다 조금 낮거나 불확실하게 느껴질 수 있고, 1년 시점에도 복지가 더 단순해져 아쉬움이 남을 수 있어 소득·보상 안정성을 중시하는 성향과 충돌한다.
- 워라밸은 초기 적응기부터 흔들리고, 1년 후에도 제품 일정이나 투자 환경에 따라 야근이 잦아질 수 있어 우선순위인 생활 균형 측면의 리스크가 크다.
- 3년 후 성장과 기술 경험의 이점은 크지만, 사용자 성향이 낮은 위험 감수인 만큼 장기적으로도 안정성과 예측 가능성을 일부 포기해야 한다는 점이 현실적인 부담으로 남는다.

## A/B Reasoning

### A Reasoning

- stance: conservative
- recommended option: A
- summary: 보수적 reasoning은 사용자의 risk_tolerance가 low이고 최우선 priority가 stability라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.

### B Reasoning

- stance: opportunity_seeking
- recommended option: B
- summary: 기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.

### Comparison

- agreements: 두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.; 두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다.
- conflicts: A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.; A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다.
- which fits user better: A
- reason: 현재 입력에서는 risk_tolerance=low, primary_priority=stability, riskA=low, riskB=high 조합 때문에 A 쪽이 사용자 성향과 더 직접적으로 맞는다.

### Final Selection

- selected reasoning: A
- selected option: A
- why selected: 최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 A reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.
- decision confidence: 0.77

## Advisor

- Recommended option: A
- Reason: 사용자의 risk_tolerance가 low이고 최우선 기준이 stability이므로, full 경로에서 생성된 A/B reasoning의 최종 선택을 기본값으로 채택한다. 실행 모드는 full이며 riskA=low, riskB=high 조합을 함께 고려했을 때 현재는 A를 추천한다.
- Reasoning basis: reasoning A / confidence 0.77 / 최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 A reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.

## Reflection

- realism: 4
- consistency: 4
- profile_alignment: 3
- recommendation_clarity: 4

### 주요 문제

- [profile] planner가 career_change로 의사결정을 분류했지만, 최우선 priority인 stability을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.
- [reasoning] reasoning의 최종 선택은 reasoning A, option A, confidence 0.77로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.
- [advisor] advisor가 A를 추천하지만 riskA=low, riskB=high와 reasoning final_selection을 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.

### 개선 방향

- [scenario] 각 시간 축 문장에서 stability 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.
- [reasoning] A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라.
- [advisor] 최종 추천 사유를 priority, risk, reasoning, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라.

- Overall comment: 전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다.
