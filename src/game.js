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

	// 시작/목표 위치 찾아 색상 지정 (start: white, goal: gray)
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

	// 씬 구성
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// 초기 플레이어 색상: white
	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// 방향 인덱스 → 이동 벡터
	const dirToDelta = [
		{ dx: 0, dy: -1 }, // 북
		{ dx: 1, dy: 0 }, // 동
		{ dx: 0, dy: 1 }, // 남
		{ dx: -1, dy: 0 }, // 서
	];

	// 초기 방향 설정 (이동 가능한 인접 타일을 바라봄)
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

	// 카메라 컨트롤
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

	// 마우스 팬 상태
	let isPanning = false;
	renderer.domElement.addEventListener("pointerdown", (e) => {
		if (e.button === 0) {
			isPanning = true;
		}
	});
	renderer.domElement.addEventListener("pointerup", (e) => {
		if (e.button === 0) {
			isPanning = false;
			controls.target.copy(player.mesh.position);
			controls.update();
		}
	});
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	const toast = document.getElementById("toast");
	const resetCamBtn = document.getElementById("resetCam");
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

	// 현재 선택된 이동 색상 (흰색 제외)
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

	// 색상/회전 버튼 이벤트
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			if (color === "white") {
				// 흰색 버튼은 회전만 하고 캐릭터 색도 흰색으로
				player.turnClockwise();
				playerColor = "white";
				player.mesh.material.color.set(PLAYER_COLORS.white);
				highlightAheadTile();
			} else {
				// 이동 색상 선택
				selectedColor = color;
				playerColor = color;
				player.mesh.material.color.set(
					PLAYER_COLORS[color] || PLAYER_COLORS.white
				);
				highlightAheadTile();
			}
		});
	});

	// 속도 슬라이더
	const speedSlider = document.getElementById("speedSlider");
	const baseMoveInterval = 0.6;
	const baseRotateInterval = 0.4;
	let moveInterval = baseMoveInterval * parseFloat(speedSlider.value);
	let rotateInterval = baseRotateInterval * parseFloat(speedSlider.value);
	speedSlider.addEventListener("input", () => {
		const val = parseFloat(speedSlider.value);
		moveInterval = baseMoveInterval * val;
		rotateInterval = baseRotateInterval * val;
	});

	let timeSinceLastMove = 0;
	let timeSinceLastRotate = 0;

	const clock = new THREE.Clock();
	function update(dt) {
		// 목표 기둥 회전
		if (level.goalMesh) level.goalMesh.rotation.y += dt * 0.8;
		// 플레이어 이동 업데이트
		player.update(dt);

		// 타이머 증가
		if (!cleared) {
			if (!player.state.isMoving) {
				timeSinceLastMove += dt;
				timeSinceLastRotate += dt;
			}
		}

		// 자동 이동 (선택 색상과 플레이어 색상이 일치할 때만)
		if (!player.state.isMoving && !cleared) {
			if (
				(selectedColor === "red" ||
					selectedColor === "yellow" ||
					selectedColor === "blue") &&
				playerColor === selectedColor
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

		// 목표 도달 체크
		if (!cleared && level.map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// 카메라 중심을 플레이어 위치에 맞춤 (마우스 팬 중이면 유지)
		if (!isPanning) {
			controls.target.copy(player.mesh.position);
		}
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
		timeSinceLastRotate = 0;
		highlightAheadTile();
	}

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
