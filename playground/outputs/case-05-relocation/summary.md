# case-05-relocation

- Case ID: `case-05-relocation`
- Input snapshot: `playground/outputs/case-05-relocation/input.json`
- Output directory: `playground/outputs/case-05-relocation`

## Input Summary

- Profile: age 30, job backend developer, risk tolerance medium
- Priority: stability, experience, future_opportunity
- Option A: 한국에 남아 현재 커리어를 이어간다
- Option B: 일본으로 이주해 새 직장을 찾는다
- Context: 해외 생활 경험과 장기적인 커리어 확장을 원하지만, 언어와 비자 문제 때문에 초기 적응 실패 가능성도 현실적으로 크다. 현재 한국에서는 무난한 팀과 안정적인 연봉을 유지하고 있다.

## State Context

### Profile State

- risk_preference: medium
- decision_style: exploratory
- top_priorities: stability, experience, future_opportunity

### Situational State

- career_stage: mid
- financial_pressure: medium
- time_pressure: unknown
- emotional_state: cautiously_optimistic

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: balances stability and upside
- current_constraint: financial pressure is medium; emotional state is cautiously_optimistic
- agent_guidance: explain tradeoffs around stability, experience, future_opportunity while respecting financial pressure is medium; emotional state is cautiously_optimistic

## Routing

- complexity: high
- risk_level: medium
- ambiguity: high
- execution_mode: full
- selected_path: planner -> scenario -> risk -> ab_reasoning -> guardrail -> advisor -> reflection
- reason: 정보 해석 여지가 크고 불확실성이 높아 전체 경로 실행이 필요하다.

## Planner

- Decision type: career_change
- Factors: 안정적인 수입과 고용 지속성, 해외 생활 및 새로운 경험의 실질적 가치, 장기적인 커리어 확장성과 미래 기회, 언어·비자 문제로 인한 초기 적응 리스크, 현재 커리어 연속성 대비 환경 변화 부담

## Scenario A

- 3 months: 한국에 남기로 한 직후에는 큰 생활 변화가 없어 마음이 비교적 안정된다. 월급과 고용이 계속 유지되고 현재 팀의 업무 흐름도 익숙해 불안은 크지 않지만, 해외로 나가지 않았다는 선택 때문에 가끔은 아쉬움과 정체감이 함께 올라온다. 대신 언어와 비자 문제로 인한 초기 적응 리스크를 피했다는 점에서 스스로 납득하게 되고, 현재 커리어의 연속성을 살려 프로젝트 책임 범위를 조금 넓히거나 영어 공부, 해외 협업이 있는 업무를 찾아보려는 현실적인 움직임이 시작된다.
- 1 year: 1년쯤 지나면 안정적인 수입과 무난한 팀 환경 덕분에 생활은 한층 단단해진다. 이직이나 해외 정착 실패에 대한 부담 없이 실무 경험은 분명히 쌓이고, 백엔드 개발자로서 시스템 운영이나 협업 역량도 더 선명해진다. 다만 새로운 환경에서 얻을 수 있었던 생활 경험은 직접 체감하지 못해, 성장의 폭이 생각보다 비슷한 패턴 안에 머문다는 답답함이 생길 수 있다. 그래서 중간 정도의 위험 감수 성향에 맞게 당장 크게 판을 바꾸기보다, 외국계 기업 지원 준비, 영어 실무 능력 강화, 원격 협업 경험 확보 같은 방식으로 미래 기회를 넓히려는 방향으로 관심이 옮겨간다.
- 3 years: 3년 후에는 한국에서 커리어를 이어온 선택의 장단점이 더 분명해진다. 안정적인 고용과 수입을 바탕으로 경력의 연속성은 잘 유지되고, 한두 번의 승진이나 더 나은 조건의 국내 이직 기회가 생길 가능성도 있다. 반면 해외 생활 자체에서 얻는 경험은 여전히 간접적이어서, 별도의 준비를 하지 않았다면 장기적인 커리어 확장성은 기대만큼 크게 넓어지지 않았다고 느낄 수 있다. 그래도 초기에 걱정했던 언어·비자 적응 리스크를 피한 덕분에 경력이 끊기지 않았고, 꾸준히 영어, 글로벌 협업, 기술 전문성을 쌓아왔다면 그때는 해외 이직이나 외국계 전환을 더 현실적인 다음 선택지로 바라보게 된다. 전체적으로는 큰 실패 없이 기반을 지키는 대신, 미래 기회를 넓히려면 의도적인 추가 행동이 꼭 필요하다는 결론에 가까워진다.

## Scenario B

- 3 months: 일본으로 이주한 뒤 첫 3개월은 기대와 긴장이 함께 간다. 한국에서의 안정적인 급여가 끊기거나 줄어드는 시점이라 생활비와 보증금, 비자 관련 비용이 생각보다 크게 느껴지고, 수입의 안정성에 대한 불안이 자주 올라온다. 동시에 새로운 도시와 업무 문화, 생활 방식은 분명 신선한 자극이 되어 해외 생활 경험의 실질적 가치를 체감하게 만든다. 다만 언어 장벽 때문에 면접에서 자신 있게 답하지 못하거나, 비자 조건에 맞는 채용 공고가 제한적이라 준비 기간이 길어질 수 있다. 백엔드 개발 경력 자체는 경쟁력이 있지만, 현재 커리어의 연속성이 잠시 끊긴 느낌이 들어 조급함도 생긴다. 이 시기에는 눈에 띄는 성과보다도 생활 적응, 일본어 보완, 이력서 현지화, 채용 시장 이해가 중심이 되며, 감정적으로는 불안과 기대가 번갈아 나타난다.
- 1 year: 1년 정도 지나면 초기 혼란은 다소 정리되고, 현실적인 자리가 잡히기 시작한다. 일본 현지 기업이나 외국인 채용에 열려 있는 회사에 합류했다면 연봉은 한국 대비 비슷하거나 약간 낮을 수 있지만, 고용과 체류가 안정되면서 심리적 부담은 초반보다 줄어든다. 업무에서는 기술 역량 자체보다 커뮤니케이션 방식, 문서 문화, 회의 참여 방식에 적응하는 데 시간이 들고, 그 과정에서 스스로 성장하고 있다는 감각도 생긴다. 새로운 경험은 분명 쌓이지만, 생활 전반을 혼자 관리해야 해서 피로감도 적지 않다. 그래도 중간 수준의 위험 감수 성향에 맞게 무리한 이직이나 창업 대신, 현재 자리에서 경험을 축적하며 다음 기회를 보는 쪽으로 판단할 가능성이 크다. 이 시점의 핵심 결과는 수입과 고용의 안정성을 완전히 회복하지는 못해도, 해외 경력과 실무 적응 경험이 생기면서 장기적인 커리어 확장 가능성이 현실적인 형태로 열리기 시작한다는 점이다.
- 3 years: 3년 후에는 이 선택의 의미가 단기 모험이 아니라 경력의 방향 전환으로 남을 가능성이 높다. 일본에서 계속 일하고 있다면 언어와 비자 문제는 완전히 사라지지 않아도 관리 가능한 수준이 되고, 현지 실무 경험과 다국적 환경 적응력이 이력서에서 분명한 강점으로 자리 잡는다. 수입은 초기에 기대했던 만큼 빠르게 오르지 않을 수 있지만, 고용 지속성과 역할의 안정성은 점차 개선되고, 한국에 머물렀을 때보다 선택 가능한 미래 기회는 넓어진다. 예를 들어 일본 내 더 나은 팀으로 옮기거나, 아시아 지역 원격 포지션, 글로벌 기업 지원 같은 경로가 현실적인 옵션이 된다. 반면 생활 기반을 해외에 둔 부담, 관계망 재구성, 문화적 피로는 계속 비용으로 남아 있어 마냥 낭만적인 결과는 아니다. 감정적으로는 초반의 불안 대신 ‘쉽지는 않았지만 경험과 기회를 바꿔 얻었다’는 차분한 만족에 가까우며, 안정성을 최우선으로 두면서도 미래 기회를 넓히고 싶었던 우선순위와는 대체로 맞는 결과가 된다.

## Risk A

- Level: medium
- 단기적으로는 현재 팀과 연봉이 유지되고 언어·비자 적응 리스크를 피하므로 고용·수입 측면의 위험은 낮다.
- 하지만 1년~3년 시나리오에서 새로운 생활 경험과 해외 환경 노출은 직접적으로 쌓이지 않아, 사용자가 중시하는 experience 측면에서는 아쉬움이 누적될 가능성이 있다.
- 장기적으로도 영어, 글로벌 협업, 외국계 지원 준비 같은 추가 행동이 없으면 미래 기회 확장이 기대보다 제한될 수 있어 future_opportunity 관점의 위험이 남는다.
- 즉 큰 실패 가능성은 낮지만, 안정성을 얻는 대신 성장 경로가 비슷한 패턴에 머물 수 있다는 점에서 전체 위험도는 중간 수준이다.

## Risk B

- Level: medium
- 초기 3개월에는 한국에서의 안정적인 급여 흐름이 끊기거나 약해질 수 있고, 생활비·보증금·비자 관련 비용이 동시에 발생해 사용자의 1순위인 안정성에 직접적인 부담이 된다.
- 언어 장벽과 비자 조건 때문에 지원 가능한 채용 공고가 제한되고 준비 기간이 길어질 수 있어, 새 직장을 찾는 과정 자체의 불확실성이 비교적 크다.
- 다만 1년 시점부터는 현지 적응과 고용 안정이 점차 회복되고, 3년 시점에는 해외 실무 경험과 다국적 환경 적응력이 미래 기회 확대에 실제 자산으로 작용해 위험이 장기적으로 완화된다.
- 사용자는 위험 감수 성향이 중간 수준이고 우선순위에 새로운 경험과 미래 기회가 포함되어 있어, 이 선택의 부담은 분명하지만 성향과 목표에 비해 과도하게 높은 위험으로 보기는 어렵다.

## A/B Reasoning

### A Reasoning

- stance: conservative
- recommended option: A
- summary: 보수적 reasoning은 사용자의 risk_tolerance가 medium이고 최우선 priority가 stability라는 점을 기준으로, 위험 수준이 더 낮고 생활 변동성이 작은 선택을 우선 본다. 현재 비교에서는 A가 더 안정적으로 해석된다.

### B Reasoning

- stance: opportunity_seeking
- recommended option: B
- summary: 기회 추구 reasoning은 decision context와 planner factors를 보면 변화의 보상이 분명할 수 있다고 본다. 위험을 감수하더라도 역할 변화와 성장폭을 원한다면 B를 검토할 가치가 있다.

### Comparison

- agreements: 두 reasoning 모두 사용자 우선순위와 리스크 허용도를 핵심 판단 축으로 본다.; 두 reasoning 모두 시나리오와 risk 결과를 근거로 사용한다.
- conflicts: A reasoning은 손실 회피와 안정 기반을 우선하지만, B reasoning은 성장 기회의 기대값을 더 크게 본다.; A reasoning은 현재 성향과의 정합성을 중시하고, B reasoning은 미래 옵션 확장을 더 높게 평가한다.
- which fits user better: A
- reason: 현재 입력에서는 risk_tolerance=medium, primary_priority=stability, riskA=medium, riskB=medium 조합 때문에 A 쪽이 사용자 성향과 더 직접적으로 맞는다.

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
- guardrail correctness: good

## Advisor

- Decision: A
- Confidence: 0.5499999999999999
- Guardrail applied: true
- Recommended option: A
- Reason: guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 reasoning_conflict이고 대응 strategy는 neutralize_decision다. 사용자의 최우선 기준이 stability인 점은 유지하되 riskA=medium, riskB=medium를 더 무겁게 반영해 현재는 A 쪽을 조심스럽게 권한다.
- Reasoning basis: reasoning A / confidence 0.5499999999999999 / guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.

## Reflection

- evaluation: guardrail final_mode=cautious 조건에서 advisor decision=A와 reasoning 선택이 얼마나 안전하게 연결됐는지 다시 평가한다.
- realism: 4
- consistency: 4
- profile_alignment: 3
- recommendation_clarity: 4
- guardrail_review: needed=true / triggered=true / correctness=good

### 주요 문제

- [profile] planner가 career_change로 의사결정을 분류했지만, 최우선 priority인 stability을 scenario 전개 문장마다 직접 연결한 근거는 충분히 선명하지 않다.
- [reasoning] reasoning의 최종 선택은 reasoning A, option A, confidence 0.70로 정리됐지만 A/B 관점 차이가 실제로 충분히 벌어졌는지와 comparison 충돌 정리가 더 선명하게 드러날 필요가 있다.
- [advisor] advisor가 A를 제시하지만 riskA=medium, riskB=medium, guardrail final_mode=cautious를 어떻게 함께 해석했는지 연결 설명이 더 구조화될 필요가 있다.

### 개선 방향

- [scenario] 각 시간 축 문장에서 stability 기준이 어떻게 유지되거나 훼손되는지 한 문장씩 직접 드러내라.
- [reasoning] A는 안정성 손실 회피, B는 성장 기대값 확대라는 관점 차이가 문장 수준에서 분명히 보이도록 comparison의 agreement와 conflict를 더 날카롭게 정리하라.
- [advisor] 최종 추천 사유를 priority, risk, reasoning, guardrail, scenario 증거 순서로 다시 정리해 선택 근거를 추적 가능하게 만들어라.

- Overall comment: 전반적 흐름은 설득력 있지만, reasoning의 관점 분리와 advisor의 반영 연결을 더 명시하면 자동 평가 신뢰도가 높아진다.
