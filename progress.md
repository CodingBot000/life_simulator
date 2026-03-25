Original prompt: `/Users/switch/Development/Web/life_simulator/docs/20260324_03_53_01_self_reflection.md` 지시문대로 Self-Reflection Agent를 기존 planner -> scenario -> risk -> advisor 체인 뒤에 독립 단계로 추가한다.

- Done: `prompts/reflection.md`, reflection schema/type, API chain, UI card, playground reflection script 추가
- Done: `summary.md`에 Reflection 점수/문제/개선 방향/overall comment 반영
- Done: compose-only 경로에서 summary 생성이 유지되도록 `advisor-result.stub.json` 및 reflection stub/result 처리 추가
- Verification:
  - `bash -n`으로 playground 스크립트 문법 검증
  - `npm run build` 성공
  - `./playground/scripts/run-case.sh ./playground/inputs/cases/case-01-career-stability.json` 라이브 실행 성공
  - `CODEX_COMPOSE_ONLY=1 ./playground/scripts/run-all-cases.sh` 실행 후 10개 케이스 모두 `reflection-result.json`, `summary.md`의 `## Reflection` 확인
