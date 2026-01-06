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

	// 시작/목표 위치 찾아 색상 지정
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

	// 씬, 렌더러, 카메라 초기화
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// 플레이어 색상 관리
	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// 빛 효과 추가
	const light = new THREE.PointLight(0xffffff, 0.6, CFG.tile * 5);
	light.position.set(0, 1, 0);
	player.mesh.add(light);

	// 방향 인덱스 → 이동 벡터
	const dirToDelta = [
		{ dx: 0, dy: -1 }, // 북
		{ dx: 1, dy: 0 }, // 동
		{ dx: 0, dy: 1 }, // 남
		{ dx: -1, dy: 0 }, // 서
	];

	// 초기 방향 설정: 이동 가능한 첫 이웃
	(function setInitialDirection() {
		const dirs = [
			{ dx: 1, dy: 0, dir: 1 },
			{ dx: 0, dy: 1, dir: 2 },
			{ dx: -1, dy: 0, dir: 3 },
			{ dx: 0, dy: -1, dir: 0 },
		];
		for (const { dx, dy, dir } of dirs) {
			const nx = startX + dx;
			const ny = startY + dy;
			if (level.canWalk(nx, ny)) {
				player.setDirection(dir);
				return;
			}
		}
		player.setDirection(0);
	})();

	// 카메라 컨트롤: Pan 비활성화, Zoom 활성화
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = false;
	controls.enableZoom = true;
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.update();

	window.addEventListener("contextmenu", (e) => e.preventDefault());
	const toast = document.getElementById("toast");

	let cleared = false;
	function setCleared(v) {
		cleared = v;
		toast.style.display = v ? "block" : "none";
	}

	// 이동 색상 선택 상태 (white 제외)
	let selectedColor = "red";

	// 하이라이트 재질 설정
	const highlightMaterials = {};
	for (const name in COLOR_VALUES) {
		const base = new THREE.Color(COLOR_VALUES[name]);
		const hl = base.clone().lerp(new THREE.Color(0xffffff), 0.4);
		highlightMaterials[name] = new THREE.MeshStandardMaterial({
			color: hl.getHex(),
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

	// 색상 변경 애니메이션 변수
	let colorStart = null;
	let colorTarget = null;
	let colorAnimationStart = null;
	const colorAnimationDuration = 0.4; // seconds

	// 색상 버튼 클릭 시
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			selectedColor = color;
			playerColor = color;
			colorStart = player.mesh.material.color.clone();
			colorTarget = new THREE.Color(PLAYER_COLORS[color]);
			colorAnimationStart = performance.now();
			highlightAheadTile();
		});
	});

	// 방향 버튼 클릭 시
	document.querySelectorAll(".arrow-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const dir = parseInt(btn.getAttribute("data-dir"), 10);
			player.setDirection(dir);
			highlightAheadTile();
			updatePillarsVisibility();
		});
	});

	// speed 슬라이더 초기화 및 변화 처리
	const speedSlider = document.getElementById("speedSlider");
	const baseMoveInterval = 0.6;
	const baseMoveDuration = 0.18;
	let moveInterval = baseMoveInterval * parseFloat(speedSlider.value);
	CFG.moveDuration = baseMoveDuration * parseFloat(speedSlider.value);

	speedSlider.addEventListener("input", () => {
		const val = parseFloat(speedSlider.value);
		moveInterval = baseMoveInterval * val;
		CFG.moveDuration = baseMoveDuration * val;
	});

	let timeSinceLastMove = 0;

	// 키보드 입력 처리: WASD로 방향 회전, 숫자키로 색 변경
	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: () => {},
		onRestart: () => {
			setCleared(false);
			player.reset();
			selectedColor = "red";
			playerColor = "red";
			colorStart = player.mesh.material.color.clone();
			colorTarget = new THREE.Color(PLAYER_COLORS.red);
			colorAnimationStart = performance.now();
			clearHighlight();
			timeSinceLastMove = 0;
			highlightAheadTile();
			updatePillarsVisibility();
		},
		onRotate: (dir) => {
			player.setDirection(dir);
			highlightAheadTile();
			updatePillarsVisibility();
		},
		onColorKey: (color) => {
			selectedColor = color;
			playerColor = color;
			colorStart = player.mesh.material.color.clone();
			colorTarget = new THREE.Color(PLAYER_COLORS[color]);
			colorAnimationStart = performance.now();
			highlightAheadTile();
		},
	});

	// 기둥 가시성 업데이트: 바라보는 방향의 기둥만 표시
	function updatePillarsVisibility() {
		const dirIdx = player.state.dir;
		level.pillars.forEach((pillar) => {
			const gx = pillar.userData.gridX;
			const gy = pillar.userData.gridY;
			if (dirIdx === 0) {
				// 북: 같은 열, 플레이어보다 위쪽
				pillar.visible = gx === player.state.gx && gy < player.state.gy;
			} else if (dirIdx === 1) {
				// 동: 같은 행, 플레이어보다 오른쪽
				pillar.visible = gy === player.state.gy && gx > player.state.gx;
			} else if (dirIdx === 2) {
				// 남: 같은 열, 플레이어보다 아래쪽
				pillar.visible = gx === player.state.gx && gy > player.state.gy;
			} else if (dirIdx === 3) {
				// 서: 같은 행, 플레이어보다 왼쪽
				pillar.visible = gy === player.state.gy && gx < player.state.gx;
			}
		});
	}

	// 초기 기둥 가시성 설정
	updatePillarsVisibility();

	const clock = new THREE.Clock();
	function update(dt) {
		// 색상 애니메이션 처리
		if (colorAnimationStart !== null) {
			const elapsed = performance.now() - colorAnimationStart;
			const t = Math.min(elapsed / (colorAnimationDuration * 1000), 1);
			player.mesh.material.color.copy(colorStart).lerp(colorTarget, t);
			if (t >= 1) {
				colorAnimationStart = null;
			}
		}

		// 플레이어 이동 업데이트
		player.update(dt);

		if (!cleared) {
			if (!player.state.isMoving) {
				timeSinceLastMove += dt;
			}
		}

		// 전진 조건: 색상 일치 & 간격 충족
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

		// 목표 도달 체크
		if (!cleared && map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// 카메라를 플레이어 중심으로 맞춤
		controls.target.copy(player.mesh.position);
		controls.update();

		// 다음 타일 하이라이트
		highlightAheadTile();
	}

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
