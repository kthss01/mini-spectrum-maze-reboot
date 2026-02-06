# mini-spectrum-maze-reboot

빛의 색을 전환하며 길을 찾는 3D 미로 퍼즐 프로토타입입니다. Three.js와 순수 JavaScript(모듈)로 동작합니다.

## 현재 구현 상태

- 랜덤 미로 생성 (`31 x 33` 기본값)
- Start(흰색) / Goal(회색) 타일 자동 지정
- 타일별 색상(빨강/노랑/파랑) 배치
- 플레이어 전방 기준 시야각 페이드(타일/기둥 opacity 보간)
- 색상 버튼/숫자키로 플레이어 색 전환(부드러운 컬러 애니메이션)
- 방향 전환 후 자동 전진(속도 슬라이더로 주기 조절)
- 카메라 확대/축소(OrbitControls zoom), 회전/패닝 비활성화
- 골 도착 시 `CLEAR!` 토스트 표시

## 조작 방법

- 방향 전환: `W / A / S / D`
- 색 선택: `1 / 2 / 3` 또는 UI 색상 버튼
- 다시 시작: `R`
- 이동 속도: `Speed` 슬라이더
- 시야각: `View Angle` 슬라이더
- 카메라 줌: 마우스 휠(또는 트랙패드 줌)

## 실행 방법

별도 빌드 과정 없이 정적 파일로 실행됩니다.

1. 프로젝트 루트에서 정적 서버를 실행합니다. (예: `python -m http.server 8000`)
2. 브라우저에서 `http://localhost:8000` 접속
3. 게임 시작

## 구조

- `index.html`: UI, importmap, 스타일, 게임 엔트리 연결
- `src/game.js`: 게임 루프/상태/입력 연결/시야/자동 이동 핵심 로직
- `src/maze.js`: 미로 생성 및 타일 색 분배
- `src/level.js`: 타일/기둥 메쉬 생성, 월드 좌표 변환, 이동 가능 판정
- `src/player.js`: 플레이어 상태/이동 보간/방향 처리
- `src/input.js`: 키보드 입력 바인딩
- `src/camera.js`: Three.js scene/camera/renderer 구성
- `src/config.js`: 상수 설정값
- `src/utils.js`: easing 유틸
- `docs/concept.md`: 컨셉 및 개선 과제 정리

## 현재 확인된 이슈/개선 포인트

- 타일 강조(`highlightAheadTile`)가 매 프레임 `floors.find(...)`를 수행하므로 맵이 커지면 비용이 증가할 수 있습니다.
- `R` 재시작은 클리어 상태/이동 잠금 여부와 관계없이 동작하도록 보완했습니다.
- 골 도착 시에도 목표 타일 강조가 남아 보일 수 있어, UX 관점에서 클리어 시 강조 제거를 추가 검토할 수 있습니다.

## 참고

- 퍼즐 감성 레퍼런스: Monument Valley 류의 고정 시점 탐색 퍼즐
