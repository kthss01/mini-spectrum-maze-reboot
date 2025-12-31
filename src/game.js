import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { CFG, PLAYER_COLORS } from "./config.js";
import { generateMaze, assignTileColors } from "./maze.js";
import { computeCameraSettings, createThreeCore } from "./camera.js";
import { createLevel } from "./level.js";
import { createPlayer } from "./player.js";
import { bindInput } from "./input.js";

function createGame() {
	// 미로 생성 및 색상 배정
	const MAZE_WIDTH = 31;
	const MAZE_HEIGHT = 33;
	const map = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
	const colorMap = assignTileColors(map);

	// 카메라 설정 계산 후 CFG 반영
	const { viewSize, radius } = computeCameraSettings(map);
	CFG.viewSize = viewSize;
	CFG.radius = radius;

	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// OrbitControls: 왼쪽 버튼으로만 팬 가능하도록 설정
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = true;
	controls.enableZoom = true;
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	// mouseButtons 설정: 왼쪽 버튼 = PAN, 가운데 = DOLLY, 오른쪽 = ROTATE (disableRotate로 회전 비활성)
	controls.mouseButtons = {
		LEFT: THREE.MOUSE.PAN,
		MIDDLE: THREE.MOUSE.DOLLY,
		RIGHT: THREE.MOUSE.ROTATE,
	};
	controls.update();

	// 우클릭 메뉴 비활성화
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	// UI 참조
	const toast = document.getElementById("toast");
	const resetCamBtn = document.getElementById("resetCam");

	// 카메라 리셋 버튼
	if (resetCamBtn) {
		resetCamBtn.addEventListener("click", () => {
			controls.reset();
		});
	}

	let cleared = false;
	function setCleared(v) {
		cleared = v;
		toast.style.display = v ? "block" : "none";
	}

	function restart() {
		setCleared(false);
		player.reset();
		setActiveColor("gray");
	}

	// 키보드 입력 바인딩
	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: (dx, dy) => {
			player.tryMove(dx, dy);
		},
		onRestart: restart,
	});

	// 색상 선택 로직
	let currentColor = "gray";
	function setActiveColor(color) {
		currentColor = color;
		level.floors.forEach((floor) => {
			floor.visible = color === "gray" || floor.userData.color === color;
		});
		// 플레이어 색상 변경
		player.mesh.material.color.set(
			PLAYER_COLORS[color] || PLAYER_COLORS.gray
		);
	}

	// 색상 버튼 이벤트 연결
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			setActiveColor(color);
		});
	});

	// 게임 루프
	function checkClear() {
		return level.map[player.state.gy][player.state.gx] === 3;
	}

	const clock = new THREE.Clock();
	function update(dt) {
		// 목표 기둥 회전 애니메이션
		if (level.goalMesh) level.goalMesh.rotation.y += dt * 0.8;
		const finishedMove = player.update(dt);
		if (finishedMove && !cleared && checkClear()) {
			setCleared(true);
		}
	}

	function loop() {
		requestAnimationFrame(loop);
		const dt = clock.getDelta();
		update(dt);
		controls.update();
		renderer.render(scene, camera);
	}

	// 초기 상태 설정
	setActiveColor("gray");
	loop();
}

createGame();
