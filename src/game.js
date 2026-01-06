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

	// Find start and goal positions; assign colors
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

	// Set camera view
	const { viewSize, radius } = computeCameraSettings(map);
	CFG.viewSize = viewSize;
	CFG.radius = radius;

	// Scene, renderer, camera
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, map, colorMap);
	const player = createPlayer(scene, level);

	// Player color state and highlight
	let playerColor = "white";
	player.mesh.material.color.set(PLAYER_COLORS.white);

	// Add light effect: attach a point light to the player
	const light = new THREE.PointLight(0xffffff, 0.6, CFG.tile * 5);
	light.position.set(0, 1, 0);
	player.mesh.add(light);

	// Direction mapping (grid deltas)
	const dirToDelta = [
		{ dx: 0, dy: -1 },
		{ dx: 1, dy: 0 },
		{ dx: 0, dy: 1 },
		{ dx: -1, dy: 0 },
	];

	// Initialize facing direction toward first available neighbor
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

	// OrbitControls: pan disabled, zoom enabled
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

	// Movement color selection
	let selectedColor = "red";

	// Highlight materials for next tile
	const highlightMaterials = {};
	for (const name in COLOR_VALUES) {
		const base = new THREE.Color(COLOR_VALUES[name]);
		const hlColor = base.clone().lerp(new THREE.Color(0xffffff), 0.4);
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

	// Color animation variables
	let colorStart = null;
	let colorTarget = null;
	let colorAnimationStart = null;
	const colorAnimationDuration = 0.4; // seconds

	// Color buttons (red/yellow/blue) click handler
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			selectedColor = color;
			playerColor = color;
			// Setup color animation
			colorStart = player.mesh.material.color.clone();
			colorTarget = new THREE.Color(PLAYER_COLORS[color]);
			colorAnimationStart = performance.now();
			highlightAheadTile();
		});
	});

	// Direction buttons click handler: rotate character
	document.querySelectorAll(".arrow-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const dir = parseInt(btn.getAttribute("data-dir"));
			player.setDirection(dir);
			highlightAheadTile();
		});
	});

	// Speed slider
	const speedSlider = document.getElementById("speedSlider");
	const baseMoveInterval = 0.6;
	const baseMoveDuration = 0.18; // 기본 애니메이션 지속시간(초)
	let moveInterval = baseMoveInterval * parseFloat(speedSlider.value);
	CFG.moveDuration = baseMoveDuration * parseFloat(speedSlider.value);

	speedSlider.addEventListener("input", () => {
		const val = parseFloat(speedSlider.value);
		moveInterval = baseMoveInterval * val;
		CFG.moveDuration = baseMoveDuration * val;
	});

	let timeSinceLastMove = 0;

	const clock = new THREE.Clock();
	function update(dt) {
		// Update goal pillar rotation
		if (level.goalMesh) level.goalMesh.rotation.y += dt * 0.8;

		// Color animation interpolation
		if (colorAnimationStart !== null) {
			const elapsed = performance.now() - colorAnimationStart;
			const t = Math.min(elapsed / (colorAnimationDuration * 1000), 1);
			player.mesh.material.color.copy(colorStart).lerp(colorTarget, t);
			if (t >= 1) {
				colorAnimationStart = null;
			}
		}

		// Update player movement
		player.update(dt);

		if (!cleared) {
			if (!player.state.isMoving) {
				timeSinceLastMove += dt;
			}
		}

		// Move forward when player's color matches selected color
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

		// Check goal
		if (!cleared && level.map[player.state.gy][player.state.gx] === 3) {
			setCleared(true);
		}

		// Always center camera on player (pan disabled)
		controls.target.copy(player.mesh.position);
		controls.update();

		// Highlight next tile
		highlightAheadTile();
	}

	function restart() {
		setCleared(false);
		player.reset();
		selectedColor = "red";
		playerColor = "red";
		// Reset color animation
		colorStart = player.mesh.material.color.clone();
		colorTarget = new THREE.Color(PLAYER_COLORS.red);
		colorAnimationStart = performance.now();
		clearHighlight();
		timeSinceLastMove = 0;
		highlightAheadTile();
	}

	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: () => {},
		onRestart: restart,
		onRotate: (dir) => {
			player.setDirection(dir);
			highlightAheadTile();
		},
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
