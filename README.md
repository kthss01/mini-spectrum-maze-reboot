# mini-spectrum-maze-reboot

빛의 색을 전환하며 길을 찾는 3D 미로 퍼즐 프로토타입입니다. React + Three.js + Vite로 구성되어 있습니다.

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

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 Vite가 출력한 로컬 주소(`http://localhost:5173` 등)로 접속하면 됩니다.

## GitHub Pages 배포 (GitHub Actions)

이 저장소에는 GitHub Pages 자동 배포 워크플로우가 포함되어 있습니다.

1. GitHub 저장소 **Settings → Pages**에서 **Build and deployment / Source**를 **GitHub Actions**로 설정
2. `main` 브랜치에 푸시
3. Actions 탭에서 `Deploy static site to GitHub Pages` 워크플로우가 실행
4. 완료 후 Pages URL에서 정적 사이트 확인

워크플로우 파일: `.github/workflows/deploy-pages.yml`

## 구조

- `index.html`: 앱 엔트리 연결
- `src/main.tsx`: React 마운트
- `src/App.tsx`: UI/게임 호스트 컴포넌트
- `src/gameAdapter.ts`: 게임 인스턴스 마운트/해제
- `src/game.js`: 게임 루프/상태/입력 연결/시야/자동 이동 핵심 로직
- `src/maze.js`: 미로 생성 및 타일 색 분배
- `src/level.js`: 타일/기둥 메쉬 생성, 월드 좌표 변환, 이동 가능 판정
- `src/player.js`: 플레이어 상태/이동 보간/방향 처리
- `src/input.js`: 키보드 입력 바인딩
- `src/camera.js`: Three.js scene/camera/renderer 구성
- `src/config.js`: 상수 설정값
- `src/utils.js`: easing 유틸
- `docs/concept.md`: 컨셉 및 개선 과제 정리
