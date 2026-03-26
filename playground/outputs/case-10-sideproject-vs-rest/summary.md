# case-10-sideproject-vs-rest

- Case ID: `case-10-sideproject-vs-rest`
- Input snapshot: `playground/outputs/case-10-sideproject-vs-rest/input.json`
- Output directory: `playground/outputs/case-10-sideproject-vs-rest`

## Input Summary

- Profile: age 34, job product manager, risk tolerance low
- Priority: health, sustainability, future_optionality
- Option A: 퇴근 후 사이드프로젝트를 계속한다
- Option B: 휴식과 회복에 집중한다
- Context: 본업이 바쁜데도 개인 프로젝트를 6개월째 이어오고 있어 포트폴리오와 가능성은 커지고 있다. 하지만 최근 수면과 집중력이 급격히 떨어져 번아웃 직전이라는 느낌도 강하다.

## State Context

### Profile State

- risk_preference: low
- decision_style: deliberate
- top_priorities: health, sustainability, future_optionality

### Situational State

- career_stage: mid
- financial_pressure: unknown
- time_pressure: high
- emotional_state: strained

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: leans conservative under uncertainty
- current_constraint: time pressure is high; emotional state is strained
- agent_guidance: explain tradeoffs around health, sustainability, future_optionality while respecting time pressure is high; emotional state is strained

## Routing

- complexity: high
- risk_level: medium
- ambiguity: high
- execution_mode: full
- selected_path: planner -> scenario -> risk -> ab_reasoning -> guardrail -> advisor -> reflection
- reason: 정보 해석 여지가 크고 불확실성이 높아 전체 경로 실행이 필요하다.

## Planner

- Decision type: work_life_balance
- Factors: 건강과 번아웃 회복 가능성, 수면·집중력 저하를 줄이는 정도, 본업과 병행했을 때의 안정성, 장기적으로 지속 가능한 생활 리듬, 포트폴리오를 통한 미래 선택지 확대

## Scenario A

- 3 months: 퇴근 후 사이드프로젝트를 계속하는 선택을 유지하면, 처음 몇 주는 ‘그래도 여기서 멈추면 아깝다’는 마음으로 버티게 된다. 다만 이미 떨어진 수면과 집중력은 바로 회복되지 않아 오전 업무에서 피로감이 누적되고, 작은 의사결정에도 시간이 더 걸리는 날이 잦아진다. 본업을 유지하고 있어 수입과 고용 안정성은 그대로 지켜지지만, 낮은 위험 선호 성향 때문에 프로젝트를 더 크게 벌리기보다 기능 범위를 줄이고 주 2~3회만 작업하는 식으로 스스로 속도를 조절하려 할 가능성이 높다. 그 결과 번아웃이 급격히 악화되지는 않지만 완전히 회복되지도 않는 애매한 상태가 이어지고, 포트폴리오는 조금씩 쌓이되 생활 리듬은 아직 불안정하다고 느끼게 된다.
- 1 year: 1년 정도 지나면 이 선택은 두 가지가 함께 드러난다. 한편으로는 사이드프로젝트가 실제 결과물로 남아 포트폴리오의 밀도가 높아지고, 이직이나 프리랜스 협업 제안처럼 미래 선택지를 넓혀 주는 재료가 생긴다. 다른 한편으로는 본업이 바쁜 시기마다 저녁과 주말이 다시 잠식되면서 건강 관리가 계속 후순위로 밀릴 수 있다. 수면 패턴을 의식적으로 고치지 않으면 집중력 저하는 만성화되어 본업 성과에도 미세한 영향이 나타나고, 성취감보다 ‘계속 돌려막기 하는 생활’이라는 피로가 더 크게 느껴질 수 있다. 반대로 프로젝트의 속도를 의도적으로 낮추고 휴식, 운동, 수면 시간을 고정해 두면 큰 손상 없이 병행이 가능하지만, 그 경우 성장 속도는 느려져도 지속 가능성은 높아진다. 즉 1년 시점의 핵심은 성과 자체보다, 이 선택을 감당할 생활 리듬을 만들었는지에 달려 있다.
- 3 years: 3년 후에는 퇴근 후 사이드프로젝트를 계속한 시간이 분명한 자산으로 남을 가능성이 크다. 당장 회사를 그만두지 않았기 때문에 안정성은 유지되고, 축적된 결과물 덕분에 새로운 직무, 더 유연한 역할, 개인 브랜드 기반의 기회처럼 미래 선택지는 지금보다 넓어져 있을 수 있다. 하지만 건강과 수면 문제를 초반에 제대로 다루지 못했다면, 프로젝트가 커졌더라도 몸과 집중력이 받쳐주지 않아 결국 몇 차례 긴 휴식이나 강제 축소를 거치게 될 가능성도 현실적이다. 반대로 낮은 위험 선호에 맞게 본업을 기반으로 두고 프로젝트를 천천히 운영하며 지속 가능한 리듬을 구축했다면, 큰 도약은 아니어도 ‘건강을 해치지 않으면서도 다음 선택을 준비해 둔 상태’에 가까워진다. 이 선택의 장기 결과는 극적인 성공보다, 무리하지 않는 속도로 포트폴리오를 쌓아 미래 옵션을 확보하되 건강 비용을 얼마나 잘 통제했는지에 의해 결정될 가능성이 높다.

## Scenario B

- 3 months: 처음 3개월은 개인 프로젝트 속도를 의도적으로 늦추거나 잠시 멈추면서 불안감이 먼저 올라온다. 포트폴리오가 더디게 쌓이는 것 같아 아쉽지만, 위험을 크게 지고 싶지 않은 성향 때문에 본업 안정성을 해치지 않는 선택이라는 확신도 함께 생긴다. 몇 주 지나면서 수면 시간이 조금씩 회복되고 업무 중 멍해지는 시간이 줄어들어, 집중력 저하와 번아웃 신호가 완만해진다. 본업에서의 실수와 감정 소모가 줄어들며 생활 리듬을 다시 세우는 감각이 생기고, 미래 선택지는 당장 넓어지지 않더라도 잃지 않는 방향으로 관리된다.
- 1 year: 1년쯤 지나면 휴식 자체가 목표가 아니라 지속 가능한 운영 방식으로 자리 잡는다. 평일에는 본업과 회복에 우선순위를 두고, 개인 프로젝트는 무리하지 않는 주기로만 이어가면서 건강과 안정성을 동시에 챙기게 된다. 예전처럼 단기간에 포트폴리오를 크게 늘리지는 못하지만, 이미 해온 작업을 정리해 케이스 스터디나 간단한 결과물로 남기면서 미래 선택지는 오히려 더 선명해진다. 몸이 완전히 가볍다고 느끼는 날만 있는 것은 아니지만, 수면·집중력 저하가 일상 전체를 흔드는 수준에서는 벗어나고, 스스로를 몰아붙이지 않아도 된다는 안도감이 커진다.
- 3 years: 3년 뒤에는 '계속 버티는 삶'보다 '지속 가능한 리듬을 유지하는 삶'에 더 가까워진다. 건강을 우선한 선택 덕분에 큰 번아웃 재발 가능성은 낮아지고, 본업도 무리 없이 이어가며 필요할 때만 다음 커리어 옵션을 검토할 여유가 생긴다. 포트폴리오는 폭발적으로 커지지 않았더라도, 꾸준히 다듬어진 기록과 회복된 컨디션 덕분에 이직·사이드 전환·프로젝트 재확장 같은 선택지를 현실적으로 판단할 수 있게 된다. 가장 큰 변화는 성과의 속도보다 생활의 지속 가능성을 기준으로 결정을 내리게 된 점이고, 그 결과 미래 옵션도 줄어들기보다 더 오래 유지된다.

## Risk A

- Level: high
- 이미 수면과 집중력이 급격히 떨어지고 번아웃 직전이라고 느끼는 상태에서 퇴근 후 작업을 계속하면, 향후 3개월 동안 피로 누적과 생활 리듬 불안정이 우선순위인 건강과 지속 가능성을 직접 해칠 가능성이 크다.
- 1년 시나리오에서도 수면 패턴을 고치지 않으면 집중력 저하가 만성화되고 본업 성과에도 미세한 영향이 생길 수 있어, 본업과 병행했을 때의 안정성이 생각보다 약해질 수 있다.
- 장기적으로는 포트폴리오가 쌓여 미래 선택지는 넓어질 수 있지만, 이 선택의 성패가 결국 건강 비용을 얼마나 통제하느냐에 달려 있어 낮은 위험 선호 성향의 사용자에게는 부담이 큰 편이다.
- 속도를 의도적으로 낮추면 위험을 줄일 여지는 있지만, 현재 선택 자체는 이미 무리가 시작된 상태에서 추가 시간을 계속 투입하는 것이어서 건강과 지속 가능성 기준으로는 보수적으로 볼 때 위험도가 높다.

## Risk B

- Level: low
- 사용자 우선순위인 건강과 지속 가능성 기준에서, 3개월 내 수면 회복과 업무 중 멍해지는 시간 감소가 나타나 번아웃 악화를 막는 방향으로 전개된다.
- 위험 회피 성향이 강한데도 본업 안정성을 해치지 않는 선택으로 묘사되어 있어, 단기적으로 커리어·생활 기반이 흔들릴 가능성이 낮다.
- 1년 이후에는 개인 프로젝트를 완전히 포기하지 않고 무리 없는 주기로 유지해 미래 선택지를 잃기보다 관리하는 흐름이 확인된다.
- 3년 시점에도 포트폴리오의 성장 속도는 느리지만, 회복된 컨디션과 정리된 기록 덕분에 이직·사이드 전환 여부를 더 현실적으로 판단할 수 있어 장기 옵션 훼손 위험이 크지 않다.

## A/B Reasoning

### A Reasoning

- stance: conservative
- recommended option: A
- summary: 보수적 reasoning은 사용자의 risk_tolerance가 low이고 최우선 priority가 health라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.

### B Reasoning

- stance: opportunity_seeking
- recommended option: B
- summary: 기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.

### Comparison

- agreements: 두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.; 두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다.
- conflicts: A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.; A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다.
- which fits user better: B
- reason: 현재 입력에서는 risk_tolerance=low, primary_priority=health, riskA=high, riskB=low 조합 때문에 B 쪽이 사용자 성향과 더 직접적으로 맞는다.

### Final Selection

- selected reasoning: B
- selected option: B
- why selected: 최종 선택은 사용자의 우선순위와 위험 허용도에 더 직접적으로 맞는 reasoning을 택한 결과다. 현재 비교에서는 B reasoning이 손실 회피와 기대 보상의 균형을 더 설득력 있게 설명한다.
- decision confidence: 0.71

## Guardrail

- guardrail_triggered: true
- triggers: reasoning_conflict, high_risk
- strategy: neutralize_decision, risk_warning
- final_mode: cautious
- guardrail correctness: good

## Advisor

- Decision: B
- Confidence: 0.5599999999999999
- Guardrail applied: true
- Recommended option: B
- Reason: guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 reasoning_conflict, high_risk이고 대응 strategy는 neutralize_decision, risk_warning다. 사용자의 최우선 기준이 health인 점은 유지하되 riskA=high, riskB=low를 더 무겁게 반영해 현재는 B 쪽을 조심스럽게 권한다.
- Reasoning basis: reasoning B / confidence 0.5599999999999999 / guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.

## Reflection

- evaluation: guardrail final_mode=cautious 조건에서 advisor decision=B와 reasoning 선택이 얼마나 안전하게 연결됐는지 다시 평가한다.
- realism: 4
- consistency: 4
- profile_alignment: 3
- recommendation_clarity: 4
- guardrail_review: needed=true / triggered=true / correctness=good

### 주요 문제

- [profile] planner가 work_life_balance로 의사결정을 분류했지만, 최우선 priority인 health을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.
- [reasoning] reasoning의 최종 선택은 reasoning B, option B, confidence 0.71로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.
- [advisor] advisor가 B를 제시하지만 riskA=high, riskB=low, guardrail final_mode=cautious를 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.

### 개선 방향

- [scenario] 각 시간 축 문장에서 health 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.
- [reasoning] A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라.
- [advisor] 최종 추천 사유를 priority, risk, reasoning, guardrail, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라.

- Overall comment: 전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다.
