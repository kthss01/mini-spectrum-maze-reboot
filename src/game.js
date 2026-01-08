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

	// 시작/목표 위치 및 색 지정
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

	// 씬, 레벨, 플레이어
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);
	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// 빛 효과
	const light = new THREE.PointLight(0xffffff, 0.6, CFG.tile * 5);
	light.position.set(0, 1, 0);
	player.mesh.add(light);

	// 방향 벡터
	const dirToDelta = [
		{ dx: 0, dy: -1 },
		{ dx: 1, dy: 0 },
		{ dx: 0, dy: 1 },
		{ dx: -1, dy: 0 },
	];

	// 초기 방향
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

	// 카메라 컨트롤
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

	// 색상 선택 상태
	let selectedColor = "red";
	// 하이라이트 재질
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

	// 색상 애니메이션
	let colorStart = null;
	let colorTarget = null;
	let colorAnimationStart = null;
	const colorAnimationDuration = 0.4;

	// 색상 버튼
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

	// 방향 버튼
	document.querySelectorAll(".arrow-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const dir = parseInt(btn.getAttribute("data-dir"), 10);
			player.setDirection(dir);
			highlightAheadTile();
			updateVisibilityTargets();
		});
	});

	// speed 슬라이더
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

	// 원뿔 각도 슬라이더
	const angleSlider = document.getElementById("angleSlider");
	let viewAngleDeg = parseFloat(angleSlider.value); // degrees
	angleSlider.addEventListener("input", () => {
		viewAngleDeg = parseFloat(angleSlider.value);
		updateVisibilityTargets();
	});

	let timeSinceLastMove = 0;

	// 투명도 목표 설정 (원뿔 시야)
	function computeTargetVisibility() {
		const dirIdx = player.state.dir;
		const dirVec = new THREE.Vector2(
			dirToDelta[dirIdx].dx,
			dirToDelta[dirIdx].dy
		).normalize();
		const halfAngleRad = THREE.MathUtils.degToRad(viewAngleDeg / 2);
		const cosThreshold = Math.cos(halfAngleRad);

		return (obj) => {
			const gx = obj.userData.gridX;
			const gy = obj.userData.gridY;
			// 플레이어 자기 자신 타일은 항상 보임
			if (gx === player.state.gx && gy === player.state.gy) return true;
			// 타일로 가는 벡터 (2D 평면)
			const vec = new THREE.Vector2(
				gx - player.state.gx,
				gy - player.state.gy
			).normalize();
			const dot = dirVec.dot(vec);
			// cos(θ/2) 이상이면 시야 범위
			return dot >= cosThreshold;
		};
	}

	function updateVisibilityTargets() {
		const isVisible = computeTargetVisibility();
		level.floors.forEach((floor) => {
			floor.userData.targetOpacity = isVisible(floor) ? 1 : 0;
		});
		level.pillars.forEach((pillar) => {
			pillar.userData.targetOpacity = isVisible(pillar) ? 1 : 0;
		});
	}
	updateVisibilityTargets();

	// 입력 처리 (WASD 회전, R 재시작, 1/2/3 색 선택)
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
			updateVisibilityTargets();
		},
		onRotate: (dir) => {
			player.setDirection(dir);
			highlightAheadTile();
			updateVisibilityTargets();
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

		player.update(dt);

		if (!cleared) {
			if (!player.state.isMoving) {
				timeSinceLastMove += dt;
			}
		}

		// 자동 전진
		if (!player.state.isMoving && !cleared) {
			if (
				playerColor === selectedColor &&
				["red", "yellow", "blue"].includes(selectedColor)
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

		// 타일/기둥 투명도 점진적 변화
		level.floors.forEach((floor) => {
			const target = floor.userData.targetOpacity ?? 0;
			floor.material.opacity += (target - floor.material.opacity) * 0.08;
			floor.visible = floor.material.opacity > 0.05;
		});
		level.pillars.forEach((pillar) => {
			const target = pillar.userData.targetOpacity ?? 0;
			pillar.material.opacity +=
				(target - pillar.material.opacity) * 0.08;
			pillar.visible = pillar.material.opacity > 0.05;
		});

		// 목표 도달 체크
		if (!cleared && map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// 카메라 중심
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
