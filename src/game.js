import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CFG, PLAYER_COLORS, COLOR_VALUES } from "./config.js";
import { generateMaze, assignTileColors } from "./maze.js";
import { computeCameraSettings, createThreeCore } from "./camera.js";
import { createLevel } from "./level.js";
import { createPlayer } from "./player.js";
import { bindInput } from "./input.js";

function createGame() {
	const MAZE_WIDTH = 31;
	const MAZE_HEIGHT = 33;
	const map = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
	const colorMap = assignTileColors(map);

	// 시작/목표 색 지정 (start: white, goal: gray)
	let startX = 1,
		startY = 1,
		goalX = MAZE_WIDTH - 2,
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
	colorMap[goalY][goalX] = "gray";

	// 카메라 설정
	const { viewSize, radius } = computeCameraSettings(map);
	CFG.viewSize = viewSize;
	CFG.radius = radius;

	// 씬/렌더러/카메라 생성
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// 플레이어 색상 관리
	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// 방향 인덱스 → 이동 벡터
	const dirToDelta = [
		{ dx: 0, dy: -1 }, // 북
		{ dx: 1, dy: 0 }, // 동
		{ dx: 0, dy: 1 }, // 남
		{ dx: -1, dy: 0 }, // 서
	];

	// 초기 방향 설정 (인접 타일 중 첫 번째 이동 가능한 방향)
	function setInitialDirection() {
		const dirs = [
			{ dx: 1, dy: 0, dir: 1 },
			{ dx: 0, dy: 1, dir: 2 },
			{ dx: -1, dy: 0, dir: 3 },
			{ dx: 0, dy: -1, dir: 0 },
		];
		for (const { dx, dy, dir } of dirs) {
			const nx = level.start.x + dx;
			const ny = level.start.y + dy;
			if (level.canWalk(nx, ny)) {
				player.setDirection(dir);
				return;
			}
		}
		player.setDirection(0);
	}
	setInitialDirection();

	// 카메라 컨트롤 (Pan 비활성화, Zoom만 사용)
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = false;
	controls.enableZoom = true;
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.update();

	// 우클릭 메뉴 비활성화
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	const toast = document.getElementById("toast");

	let cleared = false;
	function setCleared(v) {
		cleared = v;
		toast.style.display = v ? "block" : "none";
	}

	// 이동 색상 선택 (white 제외)
	let selectedColor = "red";

	// 하이라이트 재질
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

	let currentHighlightTile = null;
	function clearHighlight() {
		if (currentHighlightTile) {
			currentHighlightTile.material =
				currentHighlightTile.userData.originalMaterial;
			currentHighlightTile = null;
		}
	}
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

	// 이동 색상 버튼 (red/yellow/blue) 클릭
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			selectedColor = color;
			playerColor = color;
			player.mesh.material.color.set(
				PLAYER_COLORS[color] || PLAYER_COLORS.white
			);
			highlightAheadTile();
		});
	});

	// 방향 버튼 (dir-north/east/south/west) 클릭 → 회전
	document.querySelectorAll(".arrow-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const dir = parseInt(btn.getAttribute("data-dir"));
			player.setDirection(dir);
			highlightAheadTile();
		});
	});

	// 속도 슬라이더
	const speedSlider = document.getElementById("speedSlider");
	const baseMoveInterval = 0.6;
	let moveInterval = baseMoveInterval * parseFloat(speedSlider.value);
	speedSlider.addEventListener("input", () => {
		const val = parseFloat(speedSlider.value);
		moveInterval = baseMoveInterval * val;
	});

	let timeSinceLastMove = 0;

	const clock = new THREE.Clock();
	function update(dt) {
		// 목표 기둥 회전
		if (level.goalMesh) level.goalMesh.rotation.y += dt * 0.8;

		player.update(dt);

		if (!cleared) {
			if (!player.state.isMoving) {
				timeSinceLastMove += dt;
			}
		}

		// 이동 조건: 캐릭터 색상 = 선택 색상, 시간 간격 충족
		if (!player.state.isMoving && !cleared) {
			if (
				playerColor === selectedColor &&
				(selectedColor === "red" ||
					selectedColor === "yellow" ||
					selectedColor === "blue")
			) {
				if (timeSinceLastMove >= moveInterval) {
					const dirIdx = player.state.dir;
					const { dx, dy } = dirToDelta[dirIdx];
					const nx = player.state.gx + dx;
					const ny = player.state.gy + dy;
					if (level.canWalk(nx, ny)) {
						const tileColor = level.colorMap[ny][nx] || "gray";
						if (
							tileColor === selectedColor ||
							tileColor === "gray"
						) {
							const moved = player.tryMove(dx, dy);
							if (moved) {
								timeSinceLastMove = 0;
							}
						}
					}
				}
			}
		}

		// 목표 도달 확인
		if (!cleared && level.map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// 카메라를 항상 플레이어에 맞춤 (Pan 비활성화)
		controls.target.copy(player.mesh.position);
		controls.update();

		// 다음 타일 하이라이트
		highlightAheadTile();
	}

	function restart() {
		setCleared(false);
		player.reset();
		selectedColor = "red";
		playerColor = "red";
		player.mesh.material.color.set(PLAYER_COLORS.red);
		clearHighlight();
		timeSinceLastMove = 0;
		highlightAheadTile();
	}

	// 키보드 R 키로 다시 시작
	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: () => {},
		onRestart: restart,
	});

	function loop() {
		requestAnimationFrame(loop);
		const dt = clock.getDelta();
		update(dt);
		renderer.render(scene, camera);
	}

	highlightAheadTile();
	loop();
}

createGame();
