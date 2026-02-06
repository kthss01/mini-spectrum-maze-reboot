# 마이그레이션 요약 (KO)

## 1) 아키텍처 Before / After

### Before: JS 단일 흐름
- `index.html` + 스크립트 중심으로 엔진/입력/UI 갱신이 한 흐름에 결합된 구조
- DOM 접근, 입력 처리, 렌더 루프가 같은 계층에서 뒤섞여 변경 영향 범위가 큼
- 타입 계약이 약해 리팩터링 시 회귀 위험이 상대적으로 높음

### After: React UI + TypeScript 엔진 모듈
- React가 UI/상태 표시를 담당하고, 엔진은 `GameEngine` 클래스로 캡슐화
- 엔진 공개 API(`init`, `dispose`, `setDirection`, `selectColor`, `setSpeedMultiplier`, `setViewAngle`, `restart`)를 통해 UI와 통신
- 공용 도메인 타입(`Direction`, `TileColor`, `MazeMap` 등)을 `src/types/game.ts`로 일원화하여 인터페이스 안정성 강화

## 2) 파일 단위 변경 포인트

### `src/main.tsx`
- React 루트 마운트 엔트리로 전환
- `React.StrictMode` 내부에서 `App` 실행
- 앱 전역 스타일 로딩을 엔트리에서 일원화

### `src/App.tsx`
- 게임 캔버스 호스트 DOM(`canvasHostRef`)와 엔진 인스턴스 생명주기(`init`/`dispose`)를 React effect로 관리
- UI 상태(`cleared`, `selectedColor`, `speed`, `angle`)를 React state로 유지
- UI 이벤트를 엔진 API 호출로 브릿지(방향 전환, 색상 선택, 속도/시야각 변경)

### `src/engine/GameEngine.ts`
- Three.js 씬 구성, 플레이어/레벨 생성, 입력 바인딩, 게임 루프를 단일 엔진 클래스로 캡슐화
- UI 콜백(`onClearedChange`, `onSelectedColorChange`)을 통해 화면 계층과 느슨하게 연결
- 입력 잠금 상태와 재시작/이동/색상 변경 로직을 엔진 내부 상태 기준으로 일관 처리

### `src/types/game.ts`
- 방향 상수(`DIRECTION`)와 파생 타입(`Direction`) 정의
- 플레이어 상태, 맵, 타일 색상 타입을 공용 계약으로 제공
- 엔진/입력/플레이어/레벨 모듈 간 타입 해석 기준을 하나로 통일

## 3) 미완료 항목 / 후속 과제

- `strict` 모드 미적용: `tsconfig.json`의 `strict: true` 및 strict 타입 체크 통과는 아직 미완료
- strict 전환을 위한 오류 목록 정리 및 리팩터링 범위 확정 필요
- `src/utils.js` 관련 레거시 표기 정리 필요:
  - 런타임 코드는 현재 `src/utils.ts`로 전환 완료 상태
  - 문서/히스토리에서 `src/utils.js`로 남아 있는 표현은 `src/utils.ts` 기준으로 정정 권장
