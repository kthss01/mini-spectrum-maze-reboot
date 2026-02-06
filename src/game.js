import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CFG, PLAYER_COLORS, COLOR_VALUES } from "./config";
import { generateMaze, assignTileColors } from "./maze";
import { computeCameraSettings, createThreeCore } from "./camera";
import { createLevel } from "./level";
import { createPlayer } from "./player";
import { bindInput } from "./input";

export function createGame({
	canvasHost,
	selectedColor: initialSelectedColor = "red",
	speed: initialSpeed = 1,
	angle: initialAngle = 60,
	onClearedChange,
	onSelectedColorChange,
} = {}) {
	const MAZE_WIDTH = 31;
	const MAZE_HEIGHT = 33;

	const map = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
	const colorMap = assignTileColors(map);

	// start/goal 찾아서 색 지정
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

	const { viewSize, radius } = computeCameraSettings(map);
	CFG.viewSize = viewSize;
	CFG.radius = radius;

	const { scene, renderer, camera, destroy: destroyThreeCore } = createThreeCore({ canvasHost });
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	const light = new THREE.PointLight(0xffffff, 0.6, CFG.tile * 5);
	light.position.set(0, 1, 0);
	player.mesh.add(light);

	const dirToDelta = [
		{ dx: 0, dy: -1 },
		{ dx: 1, dy: 0 },
		{ dx: 0, dy: 1 },
		{ dx: -1, dy: 0 },
	];

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

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = false;
	controls.enableZoom = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.update();

	const cleanups = [];

	function preventContextMenu(e) {
		e.preventDefault();
	}

	window.addEventListener("contextmenu", preventContextMenu);
	cleanups.push(() => window.removeEventListener("contextmenu", preventContextMenu));

	let cleared = false;
	function setCleared(v) {
		cleared = v;
		onClearedChange && onClearedChange(v);
	}

	let selectedColor = initialSelectedColor;

	// highlight materials
	const highlightMaterials = {};
	for (const name in COLOR_VALUES) {
		const base = new THREE.Color(COLOR_VALUES[name]);
		const hl = base.clone().lerp(new THREE.Color(0xffffff), 0.4);
		highlightMaterials[name] = new THREE.MeshStandardMaterial({
			color: hl.getHex(),
			roughness: 0.4,
			metalness: 0.0,
			transparent: true,
			opacity: 1,
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
			tile.material =
				highlightMaterials[cName] || highlightMaterials.gray;
			currentHighlightTile = tile;
		}
	}

	let colorStart = null;
	let colorTarget = null;
	let colorAnimationStart = null;
	const colorAnimationDuration = 0.4;

	function selectColor(color) {
		selectedColor = color;
		playerColor = color;
		onSelectedColorChange && onSelectedColorChange(color);

		colorStart = player.mesh.material.color.clone();
		colorTarget = new THREE.Color(PLAYER_COLORS[color]);
		colorAnimationStart = performance.now();
	}

	function setDirection(dir) {
		player.setDirection(dir);
		updateVisibilityTargets();
		highlightAheadTile();
	}

	const baseMoveInterval = 0.6;
	const baseMoveDuration = 0.18;
	let moveInterval = baseMoveInterval * initialSpeed;
	CFG.moveDuration = baseMoveDuration * initialSpeed;

	function setSpeedMultiplier(speedMultiplier) {
		moveInterval = baseMoveInterval * speedMultiplier;
		CFG.moveDuration = baseMoveDuration * speedMultiplier;
	}

	let viewAngleDeg = initialAngle;
	function setViewAngle(angleDeg) {
		viewAngleDeg = angleDeg;
		updateVisibilityTargets();
	}

	let timeSinceLastMove = 0;

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

			if (gx === player.state.gx && gy === player.state.gy) return true;

			const to = new THREE.Vector2(
				gx - player.state.gx,
				gy - player.state.gy
			);
			if (to.lengthSq() === 0) return true;
			to.normalize();

			const dot = dirVec.dot(to);
			return dot >= cosThreshold;
		};
	}

	function updateVisibilityTargets() {
		const isVisible = computeTargetVisibility();
		// 모든 타일/기둥에 매번 targetOpacity를 재설정 (잔상 방지)
		for (const floor of level.floors) {
			floor.userData.targetOpacity = isVisible(floor) ? 1 : 0;
		}
		for (const pillar of level.pillars) {
			pillar.userData.targetOpacity = isVisible(pillar) ? 1 : 0;
		}
	}

	updateVisibilityTargets();

	// keyboard: WASD rotate, 1/2/3 select, R restart
	function restart() {
		setCleared(false);
		player.reset();
		selectColor("red");
		timeSinceLastMove = 0;
		updateVisibilityTargets();
		highlightAheadTile();
	}

	const unbindInput = bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onRestart: restart,
		onRotate: (dir) => {
			setDirection(dir);
		},
		onColorKey: (color) => {
			selectColor(color);
		},
	});
	cleanups.push(unbindInput);

	const clock = new THREE.Clock();

	function update(dt) {
		// animate player color
		if (colorAnimationStart !== null) {
			const elapsed = performance.now() - colorAnimationStart;
			const t = Math.min(elapsed / (colorAnimationDuration * 1000), 1);
			player.mesh.material.color.copy(colorStart).lerp(colorTarget, t);
			if (t >= 1) colorAnimationStart = null;
		}

		// movement update
		const finishedMove = player.update(dt);

		// 이동이 끝났을 때는 시야 재계산
		if (finishedMove) {
			updateVisibilityTargets();
		}

		if (!cleared && !player.state.isMoving) {
			timeSinceLastMove += dt;
		}

		// auto-forward
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
							const started = player.tryMove(dx, dy);
							if (started) {
								timeSinceLastMove = 0;
								// 이동 시작 순간에도 시야 재계산 (잔상 최소화)
								updateVisibilityTargets();
							}
						}
					}
				}
			}
		}

		// fade apply
		for (const floor of level.floors) {
			const target = floor.userData.targetOpacity ?? 0;
			floor.material.opacity += (target - floor.material.opacity) * 0.1;
			floor.visible = floor.material.opacity > 0.03;
		}
		for (const pillar of level.pillars) {
			const target = pillar.userData.targetOpacity ?? 0;
			pillar.material.opacity += (target - pillar.material.opacity) * 0.1;
			pillar.visible = pillar.material.opacity > 0.03;
		}

		// goal check
		if (!cleared && map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		controls.target.copy(player.mesh.position);
		controls.update();

		highlightAheadTile();
	}

	let rafId = 0;

	function loop() {
		rafId = requestAnimationFrame(loop);
		const dt = clock.getDelta();
		update(dt);
		renderer.render(scene, camera);
	}

	highlightAheadTile();
	setSpeedMultiplier(initialSpeed);
	setViewAngle(initialAngle);
	selectColor(initialSelectedColor);
	loop();

	return {
		setDirection,
		selectColor,
		setSpeedMultiplier,
		setViewAngle,
		restart,
		destroy() {
			if (rafId) cancelAnimationFrame(rafId);
			clearHighlight();
			cleanups.forEach((cleanup) => cleanup && cleanup());
						controls.dispose();
			destroyThreeCore();
		},
	};
}
