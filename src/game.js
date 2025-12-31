import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { CFG, PLAYER_COLORS, COLOR_VALUES } from "./config.js";
import { generateMaze, assignTileColors } from "./maze.js";
import { computeCameraSettings, createThreeCore } from "./camera.js";
import { createLevel } from "./level.js";
import { createPlayer } from "./player.js";
import { bindInput } from "./input.js";

function createGame() {
	// 미로 크기 설정
	const MAZE_WIDTH = 31;
	const MAZE_HEIGHT = 33;

	// 미로와 색상 맵 생성
	const map = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
	const colorMap = assignTileColors(map);

	// 시작/목표 위치 찾아 색상 지정 (흰색/검정)
	let startX = 1,
		startY = 1;
	let goalX = MAZE_WIDTH - 2,
		goalY = MAZE_HEIGHT - 2;
	for (let y = 0; y < map.length; y++) {
		for (let x = 0; x < map[0].length; x++) {
			if (map[y][x] === 2) {
				startX = x;
				startY = y;
			} else if (map[y][x] === 3) {
				goalX = x;
				goalY = y;
			}
		}
	}
	colorMap[startY][startX] = "white";
	colorMap[goalY][goalX] = "black";

	// 카메라 동적 설정 반영
	const { viewSize, radius } = computeCameraSettings(map);
	CFG.viewSize = viewSize;
	CFG.radius = radius;

	// 씬/렌더러/카메라 초기화
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// 초기 플레이어 색상과 방향
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// 방향 인덱스 -> 이동 벡터 매핑
	const dirToDelta = [
		{ dx: 0, dy: -1 }, // 북
		{ dx: 1, dy: 0 }, // 동
		{ dx: 0, dy: 1 }, // 남
		{ dx: -1, dy: 0 }, // 서
	];

	// 카메라 컨트롤 설정 (왼쪽 클릭으로 팬)
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = true;
	controls.enableZoom = true;
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.mouseButtons = {
		LEFT: THREE.MOUSE.PAN,
		MIDDLE: THREE.MOUSE.DOLLY,
		RIGHT: THREE.MOUSE.ROTATE,
	};
	controls.update();

	// 우클릭 메뉴 비활성화
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	// UI 요소
	const toast = document.getElementById("toast");
	const resetCamBtn = document.getElementById("resetCam");
	if (resetCamBtn) {
		resetCamBtn.addEventListener("click", () => {
			controls.reset();
		});
	}

	// 게임 상태
	let cleared = false;
	function setCleared(v) {
		cleared = v;
		toast.style.display = v ? "block" : "none";
	}

	// 선택된 색상 (초기값은 흰색)
	let selectedColor = "white";

	// 하이라이트 재질 생성 (각 색상을 밝게 표현)
	const highlightMaterials = {};
	for (const name in COLOR_VALUES) {
		const baseColor = new THREE.Color(COLOR_VALUES[name]);
		const hlColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.4);
		highlightMaterials[name] = new THREE.MeshStandardMaterial({
			color: hlColor.getHex(),
			roughness: 0.4,
			metalness: 0.0,
		});
	}

	// 현재 하이라이트된 타일
	let currentHighlightTile = null;
	function clearHighlight() {
		if (currentHighlightTile) {
			currentHighlightTile.material =
				currentHighlightTile.userData.originalMaterial;
			currentHighlightTile = null;
		}
	}
	// 바라보는 다음 타일에 하이라이트 적용
	function highlightAheadTile() {
		clearHighlight();
		if (cleared) return;
		const dirIdx = player.state.dir;
		const { dx, dy } = dirToDelta[dirIdx];
		const nx = player.state.gx + dx;
		const ny = player.state.gy + dy;
		const tile = level.floors.find(
			(f) => f.userData.gridX === nx && f.userData.gridY === ny
		);
		if (tile) {
			const cName = tile.userData.color;
			const hlMat = highlightMaterials[cName] || highlightMaterials.gray;
			tile.material = hlMat;
			currentHighlightTile = tile;
		}
	}

	// 색상 선택 처리
	function setActiveColor(color) {
		selectedColor = color;
		player.mesh.material.color.set(
			PLAYER_COLORS[color] || PLAYER_COLORS.white
		);
	}
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			setActiveColor(color);
		});
	});

	// 업데이트 함수
	const clock = new THREE.Clock();
	function update(dt) {
		// 목표 기둥 회전
		if (level.goalMesh) level.goalMesh.rotation.y += dt * 0.8;

		const finishedMove = player.update(dt);

		// 움직이지 않는 동안 행동 처리
		if (!player.state.isMoving && !cleared) {
			if (selectedColor === "white") {
				// 흰색: 시계방향 회전
				player.turnClockwise();
			} else {
				// 빨/노/파: 앞 타일 색상이 일치하거나 목표(black)이면 이동
				const dirIdx = player.state.dir;
				const { dx, dy } = dirToDelta[dirIdx];
				const nx = player.state.gx + dx;
				const ny = player.state.gy + dy;
				if (level.canWalk(nx, ny)) {
					const tileColor = level.colorMap[ny][nx] || "gray";
					if (tileColor === selectedColor || tileColor === "black") {
						player.tryMove(dx, dy);
					}
				}
			}
		}

		// 목표 도달 여부 체크
		if (!cleared && level.map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// 다음 타일 하이라이트 갱신
		highlightAheadTile();
	}

	// 재시작 처리
	function restart() {
		setCleared(false);
		player.reset();
		player.mesh.material.color.set(PLAYER_COLORS.white);
		selectedColor = "white";
		clearHighlight();
		highlightAheadTile();
	}

	// 키보드 입력: R 키만 처리
	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: () => {},
		onRestart: restart,
	});

	function loop() {
		requestAnimationFrame(loop);
		const dt = clock.getDelta();
		update(dt);
		controls.update();
		renderer.render(scene, camera);
	}

	// 초기 하이라이트 및 루프 시작
	highlightAheadTile();
	loop();
}

createGame();
