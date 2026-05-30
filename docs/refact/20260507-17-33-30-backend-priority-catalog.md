# Backend Priority Catalog Migration Plan

## 목표

프론트엔드에 고정되어 있는 우선순위 항목과 그룹 라벨을 백엔드 API 기준 데이터로 옮긴다. 프론트엔드는 백엔드가 내려주는 catalog를 렌더링하고, 제출 시에는 catalog 기준으로 우선순위 id를 정규화한다.

## 범위

- 백엔드에 priority catalog 서비스와 API를 추가한다.
- 기존 우선순위 id, 그룹, 다국어 라벨은 동일하게 유지한다.
- 카테고리별 후보 그룹 정보를 백엔드 응답에 포함한다.
- 프론트엔드는 `/api/priorities`를 호출해 우선순위 select를 구성한다.
- `low/medium/high` 리스크 허용도와 선택지 A/B 입력폼은 기존처럼 프론트 UI에 둔다.

## 설계

1. Backend
   - `PriorityCatalogService`에서 `maxSelections`, group order, group labels, definitions, category group mapping을 관리한다.
   - `GET /api/priorities`로 catalog를 반환한다.
   - 우선순위 목록은 기존 프론트 정의와 동일하게 이전한다.

2. Frontend
   - `priorities.ts`는 타입과 catalog 기반 helper만 갖도록 축소한다.
   - `fetchPriorityCatalog` API client와 `usePriorityCatalog` hook을 추가한다.
   - `SimulationPage`는 hook으로 받은 catalog를 사용해 optgroup/select를 렌더링한다.
   - catalog 로딩 실패 시 예시 케이스 선택은 가능하되, 우선순위 select는 비활성화하고 에러 메시지를 노출한다.

3. Validation
   - Backend: priority API 단위 테스트를 추가한다.
   - Frontend: `npm run typecheck`로 타입 연결을 확인한다.
   - Backend: `./mvnw test`를 실행한다.

## 비범위

- 리스크 허용도 enum 이전은 이번 작업에서 제외한다.
- 선택지 A/B와 현재 상황 입력 UI 구조 변경은 제외한다.
- 케이스 JSON 파일의 우선순위 값 변경은 제외한다.
