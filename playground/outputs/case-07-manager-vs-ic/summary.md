# case-07-manager-vs-ic

- Case ID: `case-07-manager-vs-ic`
- Input snapshot: `playground/outputs/case-07-manager-vs-ic/input.json`
- Output directory: `playground/outputs/case-07-manager-vs-ic`

## Input Summary

- Profile: age 37, job senior developer, risk tolerance low
- Priority: growth, stress_management, compensation
- Option A: 매니저 트랙으로 전환한다
- Option B: IC 트랙에 남는다
- Context: 조직이 커지면서 팀을 맡아 달라는 제안을 받았지만, 사람 관리와 조율에서 오는 스트레스를 걱정하고 있다. 반대로 기술적인 깊이를 더 쌓고 싶은 욕구도 여전히 강하다.

## State Context

### Profile State

- risk_preference: low
- decision_style: deliberate
- top_priorities: growth, stress_management, compensation

### Situational State

- career_stage: mid
- financial_pressure: unknown
- time_pressure: unknown
- emotional_state: unknown

### Memory State

- recent_similar_decisions: none
- repeated_patterns: none
- consistency_notes: none

### State Summary

- decision_bias: leans conservative under uncertainty
- current_constraint: none
- agent_guidance: tie the recommendation directly to growth, stress_management, compensation and make the tradeoff explicit

## Routing

- complexity: medium
- risk_level: low
- ambiguity: medium
- execution_mode: standard
- selected_path: planner -> scenario -> advisor
- reason: 중간 수준의 변수는 있으나 주된 검토는 시나리오 비교로 구조화 가능해 standard 경로를 선택한다.

## Planner

- Decision type: career_change
- Factors: 성장 경로 적합성, 스트레스 관리 가능성, 보상 수준과 보상 성장성, 역할 변화의 안정성과 불확실성, 기술적 깊이 유지 가능성

## Scenario A

- 3 months: 매니저 트랙으로 전환한 직후 3개월은 기대와 불안이 같이 간다. 겉으로는 역할이 명확해져 안정적으로 보이지만, 실제로는 1:1 면담, 일정 조율, 채용 참여, 다른 팀과의 커뮤니케이션이 갑자기 늘면서 하루가 잘게 끊겨 스트레스가 예상보다 크게 느껴진다. 특히 직접 코드를 오래 붙잡는 시간이 줄어들어 기술적 깊이가 느슨해지는 것 같아 아쉬움도 든다. 다만 senior developer로 쌓은 신뢰가 있어 팀원들은 비교적 협조적이고, 회사도 갑작스러운 평가 부담보다는 적응 기간을 주기 때문에 역할 변화의 불확실성은 아주 크지 않다. 보상은 소폭 인상되거나 다음 평가에서 반영될 가능성이 보여 현실적인 동기부여는 되지만, 당장 큰 차이는 아니다. 본인도 리스크를 크게 지고 싶어 하지 않기 때문에 완전히 관리 중심으로 달리기보다, 기술 리뷰나 아키텍처 논의는 계속 붙잡으려는 식으로 균형점을 찾으려 한다.
- 1 year: 1년쯤 지나면 이 선택이 자신에게 어느 정도 맞는지 더 분명해진다. 사람 관리 자체는 여전히 에너지를 쓰게 만들지만, 갈등을 초기에 정리하고 우선순위를 조율하는 방식에 익숙해지면서 스트레스는 처음보다 관리 가능한 수준으로 내려온다. 성장 경로 측면에서는 개인 기여자 시절과 다른 종류의 성취감이 생긴다. 팀원의 성과를 끌어올리거나 조직 내 의사결정을 정리하는 역할에서 영향력이 커지기 때문이다. 대신 기술적 깊이는 의식적으로 시간을 확보하지 않으면 확실히 얕아진다. 그래서 주간 기술 리뷰를 직접 주도하거나 중요한 설계 이슈에는 계속 참여하는 식으로 연결고리를 유지하게 된다. 보상은 관리 역할이 반영되며 이전보다 나아질 가능성이 높고, 향후 상승 폭도 개인 기여자 트랙과 비교해 나쁘지 않다는 점이 확인된다. 다만 성취의 내용이 ‘내가 잘 만드는 것’에서 ‘팀이 잘 움직이게 만드는 것’으로 바뀌기 때문에, 그 전환을 받아들이는 정도에 따라 만족감이 갈린다.
- 3 years: 3년 후에는 매니저 트랙이 일시적 실험이 아니라 경력의 한 축으로 자리잡았을 가능성이 크다. 낮은 위험 선호 성향 덕분에 무리하게 조직을 키우거나 과도한 책임을 떠안기보다, 감당 가능한 범위 안에서 팀 운영과 성과 관리를 안정적으로 해내는 스타일이 굳어진다. 그 결과 역할 자체의 안정성은 높아지고, 보상도 누적적으로 개선되어 생활 측면의 만족은 전반적으로 올라갈 수 있다. 반면 기술적 깊이 유지 가능성은 가장 큰 과제로 남는다. 꾸준히 설계 검토와 기술 방향성에 관여했다면 ‘기술을 이해하는 매니저’로 강점이 생기지만, 그렇지 못했다면 예전처럼 깊게 구현을 파고드는 감각은 분명 줄어든다. 감정적으로는 초반의 불안은 많이 사라지지만, 때때로 ‘나는 관리자로 성장하고 있는가, 아니면 원래 좋아하던 기술에서 멀어지고 있는가’라는 질문이 다시 올라온다. 결국 이 선택은 극적인 성공이나 실패라기보다, 보상과 조직 영향력은 커지는 대신 기술 몰입의 비중은 줄어드는 방향으로 서서히 굳어지는 현실적인 경로가 된다.

## Scenario B

- 3 months: IC 트랙에 남기로 한 직후에는 안도감이 먼저 든다. 팀 운영과 인사 이슈를 맡지 않아도 된다는 점에서 스트레스 관리가 가능하다고 느끼고, 당장 익숙한 역할을 유지한다는 점도 저위험 성향에 맞아 심리적으로 안정적이다. 대신 조직이 커지는 흐름 속에서 매니저 역할 제안을 고사한 만큼, 스스로 성장 경로를 분명히 보여줘야 한다는 압박이 생긴다. 그래서 핵심 시스템 개선, 아키텍처 리뷰, 난도 높은 기술 과제에 더 깊게 관여하려 하고, 기술적 깊이를 유지하는 방향은 분명해진다. 다만 보상 측면에서는 관리직보다 상승 속도가 느릴 수 있다는 현실을 체감하면서, 지금 수준의 보상은 유지되지만 앞으로의 성장성에 대한 작은 불안도 함께 남는다.
- 1 year: 1년 정도 지나면 IC 트랙 안에서도 자신의 위치가 조금 더 선명해진다. 주요 기술 의사결정에 참여하고, 복잡한 문제를 해결하는 사람으로 신뢰를 얻으면서 성장 경로 적합성에 대한 확신이 커진다. 관리 업무에서 오는 감정 소모는 상대적으로 적어 스트레스는 예측 가능하게 유지되지만, 반대로 여러 팀이 기술 판단을 의존하기 시작하면 조율 부담이 완전히 사라지지는 않는다. 그래도 사람 평가나 갈등 중재의 중심에 서지 않는 만큼, 본인이 걱정했던 종류의 스트레스는 피한 편이다. 보상은 큰 폭의 점프보다는 안정적인 인상이나 전문성 기반 보상으로 이어질 가능성이 높고, 회사가 IC 레벨 체계를 잘 운영한다면 만족감이 생기지만, 그렇지 않다면 매니저 트랙 대비 성장 속도가 아쉽게 느껴질 수 있다. 전반적으로 안정성은 높고 기술적 깊이도 유지되지만, ‘내가 이 조직에서 어디까지 갈 수 있나’라는 질문은 더 구체적으로 떠오른다.
- 3 years: 3년 후에는 선택의 성격이 더 분명하게 드러난다. IC 트랙에 남은 덕분에 특정 도메인이나 시스템에서 깊은 전문성을 쌓아 조직 내 핵심 개인 기여자로 자리잡을 가능성이 크고, 이는 본인이 원했던 기술적 깊이 유지 욕구와 잘 맞는다. 저위험 성향에 맞게 역할 변화의 불확실성을 크게 늘리지 않았기 때문에 경력의 연속성도 안정적으로 이어진다. 다만 조직이 계속 커질수록 영향력의 방식이 달라져, 직접 관리하지 않더라도 기술 리더십과 설득, 우선순위 조율 책임은 늘어난다. 이 과정에서 스트레스는 초기 예상보다 약간 높아질 수 있지만, 사람 관리 중심 스트레스와는 결이 달라 스스로 통제 가능한 수준으로 느낄 가능성이 높다. 보상은 회사의 IC 보상 체계가 성숙해 있으면 충분히 경쟁력 있게 따라가지만, 그렇지 않으면 매니저 트랙 동료와의 격차를 체감하며 아쉬움을 느낄 수 있다. 결국 이 선택은 극적인 승부수보다는, 성장의 방향을 기술 전문성으로 고정하고 스트레스를 관리 가능한 범위 안에 두는 대신, 보상 성장성과 조직 내 위상은 회사 구조에 따라 천천히 갈리는 시나리오에 가깝다.

## Risk A

- Skipped in execution_mode=standard

## Risk B

- Skipped in execution_mode=standard

## A/B Reasoning

- Skipped in execution_mode=standard

## Guardrail

- guardrail_triggered: true
- triggers: ambiguity_high
- strategy: ask_more_info
- final_mode: cautious
- guardrail correctness: good

## Advisor

- Decision: B
- Confidence: 0.51
- Guardrail applied: true
- Recommended option: B
- Reason: guardrail이 cautious 모드로 전환됐기 때문에 결론 강도를 낮춘다. 핵심 trigger는 ambiguity_high이고 대응 strategy는 ask_more_info다. 사용자의 최우선 기준이 growth인 점은 유지하되 riskA=not_run, riskB=not_run를 더 무겁게 반영해 현재는 B 쪽을 조심스럽게 권한다.
- Reasoning basis: reasoning B / confidence 0.51 / guardrail이 위험 신호를 감지했으므로 최종 선택을 뒤집기보다는 confidence를 낮추고 위험 경고를 전면에 두는 것이 적절하다.

## Reflection

- evaluation: guardrail final_mode=cautious 조건에서 advisor가 약한 추천과 낮아진 confidence로 위험 신호를 충분히 반영했는지 다시 점검한다.
- realism: 4
- consistency: 4
- profile_alignment: 4
- recommendation_clarity: 4
- guardrail_review: needed=true / triggered=true / correctness=good

### 주요 문제

- [advisor] advisor decision=B, confidence=0.51, guardrail_applied=true 조합이 guardrail final_mode=cautious 및 위험 신호(routing risk=low, ambiguity=medium, riskA=medium, riskB=medium)와 어떻게 연결되는지 문장 수준에서 더 직접적으로 드러나야 한다.
- [scenario] standard 경로에서는 scenario 비교가 핵심이므로, 각 옵션의 시간축 변화가 최우선 priority와 어떻게 연결되는지 더 직접적으로 드러낼 필요가 있다.

### 개선 방향

- [advisor] advisor reason에 조심스러운 추천임을 직접 밝히고 risk/uncertainty가 confidence를 낮춘 이유를 한 문장으로 덧붙여라.
- [scenario] scenario A/B의 3개월, 1년, 3년 문장마다 사용자의 최우선 priority 유지 여부를 한 문장씩 명시하라.

- Overall comment: cautious 모드 전환은 적절하며, 위험 신호를 유지한 채 추천 강도를 낮춘 점이 현재 실행 경로와 잘 맞는다.
