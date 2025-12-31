import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

// 미로 크기 설정 (홀수)
const MAZE_WIDTH = 31;
const MAZE_HEIGHT = 33;

// 색상 목록 및 재질/플레이어 색 매핑
const COLORS = ["gray", "red", "yellow", "blue"];
const COLOR_MATERIALS = {
	gray: new THREE.MeshStandardMaterial({
		color: 0x1e2430,
		roughness: 0.95,
		metalness: 0.0,
	}),
	red: new THREE.MeshStandardMaterial({
		color: 0xd95763,
		roughness: 0.85,
		metalness: 0.0,
	}),
	yellow: new THREE.MeshStandardMaterial({
		color: 0xffd35c,
		roughness: 0.85,
		metalness: 0.0,
	}),
	blue: new THREE.MeshStandardMaterial({
		color: 0x5090e7,
		roughness: 0.85,
		metalness: 0.0,
	}),
};
const PLAYER_COLORS = {
	gray: 0xe8edf7,
	red: 0xd95763,
	yellow: 0xffd35c,
	blue: 0x5090e7,
};

// 게임 설정 (CFG)
const CFG = {
	viewSize: 18,
	zoom: 1.25,
	tile: 2.2,
	wallH: 2.4,
	floorH: 0.4,
	playerY: 0.6,
	moveDuration: 0.18,
	radius: 40,
};

/**
 * DFS 백트래커로 미로 생성
 */
function generateMaze(width, height) {
	const maze = Array.from({ length: height }, () => Array(width).fill(1));
	const stack = [];
	maze[1][1] = 0;
	stack.push([1, 1]);
	const dirs = [
		[0, -2],
		[2, 0],
		[0, 2],
		[-2, 0],
	];
	while (stack.length) {
		const [x, y] = stack[stack.length - 1];
		const neighbors = dirs
			.map(([dx, dy]) => [x + dx, y + dy, x + dx / 2, y + dy / 2])
			.filter(([nx, ny]) => {
				return (
					nx > 0 &&
					ny > 0 &&
					nx < width - 1 &&
					ny < height - 1 &&
					maze[ny][nx] === 1
				);
			});
		if (neighbors.length) {
			const [nx, ny, wx, wy] =
				neighbors[Math.floor(Math.random() * neighbors.length)];
			maze[ny][nx] = 0;
			maze[wy][wx] = 0;
			stack.push([nx, ny]);
		} else {
			stack.pop();
		}
	}
	maze[1][1] = 2; // 시작점
	maze[height - 2][width - 2] = 3; // 목표점
	return maze;
}

/**
 * 각 통로 타일에 무작위 색상 부여
 * 1: 벽은 null, 2/3: 회색, 0: 랜덤 색상 (빨/노/파 중)
 */
function assignTileColors(map) {
	return map.map((row, y) =>
		row.map((v, x) => {
			if (v === 1) return null;
			if (v === 2 || v === 3) return "gray";
			// 무작위 색 선택 (red/yellow/blue)
			const idx = 1 + Math.floor(Math.random() * (COLORS.length - 1));
			return COLORS[idx];
		})
	);
}

/**
 * 카메라 크기 계산
 */
function computeCameraSettings(map) {
	const rows = map.length;
	const cols = map[0].length;
	const maxDim = Math.max(rows, cols);
	const viewSize = maxDim * CFG.tile * 0.6;
	const radius = maxDim * CFG.tile * 1.4;
	return { viewSize, radius };
}

// 미로와 색상 초기화
const LEVEL = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
const COLOR_MAP = assignTileColors(LEVEL);
const { viewSize, radius } = computeCameraSettings(LEVEL);
CFG.viewSize = viewSize;
CFG.radius = radius;

let controls;

/**
 * 부드러운 이동을 위한 easing
 */
function easeInOut(t) {
	return t * t * (3 - 2 * t);
}

/**
 * THREE Core 구성
 */
function createThreeCore() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0f1115);

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	document.body.appendChild(renderer.domElement);

	scene.add(new THREE.AmbientLight(0xffffff, 0.55));
	const dir = new THREE.DirectionalLight(0xffffff, 0.95);
	dir.position.set(20, 30, 10);
	dir.castShadow = true;
	dir.shadow.mapSize.set(1024, 1024);
	scene.add(dir);

	const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 200);
	camera.zoom = CFG.zoom;

	function updateCamera() {
		const aspect = window.innerWidth / window.innerHeight;
		const v = CFG.viewSize;
		camera.left = -v * aspect;
		camera.right = v * aspect;
		camera.top = v;
		camera.bottom = -v;
		const yaw = THREE.MathUtils.degToRad(45);
		const pitch = THREE.MathUtils.degToRad(35.264);
		const r = CFG.radius;
		camera.position.set(
			r * Math.cos(yaw) * Math.cos(pitch),
			r * Math.sin(pitch),
			r * Math.sin(yaw) * Math.cos(pitch)
		);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
	}

	updateCamera();
	window.addEventListener("resize", () => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		updateCamera();
	});

	return { scene, renderer, camera };
}

/**
 * LEVEL 생성: 타일 및 색상 적용
 */
function createLevel(scene, map, colorMap) {
	const rows = map.length;
	const cols = map[0].length;

	const group = new THREE.Group();
	scene.add(group);

	const offsetX = (cols - 1) * CFG.tile * 0.5;
	const offsetZ = (rows - 1) * CFG.tile * 0.5;

	function gridToWorld(gx, gy) {
		return new THREE.Vector3(
			gx * CFG.tile - offsetX,
			0,
			gy * CFG.tile - offsetZ
		);
	}

	function canWalk(gx, gy) {
		return map[gy]?.[gx] != null && map[gy][gx] !== 1;
	}

	function findTile(value) {
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				if (map[y][x] === value) return { x, y };
			}
		}
		return null;
	}

	const start = findTile(2) ?? { x: 1, y: 1 };
	const goal = findTile(3) ?? { x: cols - 2, y: rows - 2 };

	// 색상별 바닥 생성
	const floorGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const floors = [];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v !== 1) {
				const p = gridToWorld(x, y);
				const colorName = colorMap[y][x] || "gray";
				const material =
					COLOR_MATERIALS[colorName] || COLOR_MATERIALS.gray;
				const floor = new THREE.Mesh(floorGeo, material);
				floor.position.set(p.x, -CFG.floorH * 0.5, p.z);
				floor.receiveShadow = true;
				floor.userData.color = colorName;
				floors.push(floor);
				group.add(floor);
			}
		}
	}

	// 시작/목표 마커와 목표 기둥
	const startMat = new THREE.MeshStandardMaterial({
		color: 0x48d597,
		roughness: 0.6,
		metalness: 0.0,
	});
	const goalMat = new THREE.MeshStandardMaterial({
		color: 0xffd35c,
		roughness: 0.6,
		metalness: 0.0,
	});
	function addMarkerTile(gx, gy, mat) {
		const p = gridToWorld(gx, gy);
		const marker = new THREE.Mesh(
			new THREE.BoxGeometry(CFG.tile * 0.92, 0.08, CFG.tile * 0.92),
			mat
		);
		marker.position.set(p.x, 0.05, p.z);
		marker.receiveShadow = true;
		group.add(marker);
	}
	addMarkerTile(start.x, start.y, startMat);
	addMarkerTile(goal.x, goal.y, goalMat);

	const goalPillarGeo = new THREE.CylinderGeometry(
		CFG.tile * 0.18,
		CFG.tile * 0.18,
		2.2,
		16
	);
	const goalMesh = new THREE.Mesh(goalPillarGeo, goalMat);
	{
		const p = gridToWorld(goal.x, goal.y);
		goalMesh.position.set(p.x, 1.1, p.z);
		goalMesh.castShadow = true;
		group.add(goalMesh);
	}

	return {
		group,
		map,
		colorMap,
		floors,
		start,
		goal,
		goalMesh,
		gridToWorld,
		canWalk,
	};
}

/**
 * 플레이어 생성
 */
function createPlayer(scene, level) {
	const playerGeo = new THREE.BoxGeometry(
		CFG.tile * 0.45,
		1.2,
		CFG.tile * 0.45
	);
	const playerMat = new THREE.MeshStandardMaterial({
		color: PLAYER_COLORS.gray,
		roughness: 0.5,
		metalness: 0.0,
	});

	const mesh = new THREE.Mesh(playerGeo, playerMat);
	mesh.castShadow = true;
	level.group.add(mesh);

	const state = {
		gx: level.start.x,
		gy: level.start.y,
		isMoving: false,
		t: 0,
		from: new THREE.Vector3(),
		to: new THREE.Vector3(),
	};

	function snapToGrid() {
		const p = level.gridToWorld(state.gx, state.gy);
		mesh.position.set(p.x, CFG.playerY, p.z);
	}

	function beginMoveTo(nx, ny) {
		state.isMoving = true;
		state.t = 0;
		state.from.copy(mesh.position);
		const wp = level.gridToWorld(nx, ny);
		state.to.set(wp.x, CFG.playerY, wp.z);
		state.gx = nx;
		state.gy = ny;
	}

	function tryMove(dx, dy) {
		if (state.isMoving) return false;
		const nx = state.gx + dx;
		const ny = state.gy + dy;
		if (!level.canWalk(nx, ny)) return false;
		beginMoveTo(nx, ny);
		return true;
	}

	function update(dt) {
		if (!state.isMoving) return false;
		state.t += dt / CFG.moveDuration;
		const a = Math.min(state.t, 1);
		const eased = easeInOut(a);
		mesh.position.lerpVectors(state.from, state.to, eased);
		if (a >= 1) {
			state.isMoving = false;
			return true;
		}
		return false;
	}

	function reset() {
		state.gx = level.start.x;
		state.gy = level.start.y;
		state.isMoving = false;
		snapToGrid();
	}

	snapToGrid();
	return { mesh, state, tryMove, update, reset };
}

/**
 * 키보드 입력 바인딩
 */
function bindInput({ onMove, onRestart, isLocked }) {
	function onKeyDown(e) {
		const k = e.key.toLowerCase();
		if (isLocked()) return;
		if (k === "w") onMove(0, -1);
		else if (k === "s") onMove(0, 1);
		else if (k === "a") onMove(-1, 0);
		else if (k === "d") onMove(1, 0);
		else if (k === "r") onRestart();
	}
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}

/**
 * 게임 생성 및 실행
 */
function createGame() {
	const toast = document.getElementById("toast");
	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, LEVEL, COLOR_MAP);
	const player = createPlayer(scene, level);

	// 카메라 컨트롤
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false;
	controls.enablePan = true; // 우클릭 팬
	controls.enableZoom = true; // 스크롤 줌
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.update();

	// 우클릭 메뉴 방지
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	// 현재 선택된 색상
	let currentColor = "gray";

	// 선택된 색상에 따라 타일 및 플레이어 갱신
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

	// 색상 버튼 이벤트 바인딩
	document.querySelectorAll(".color-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const color = btn.getAttribute("data-color");
			setActiveColor(color);
		});
	});

	// Reset 카메라 버튼
	const resetBtn = document.getElementById("resetCam");
	if (resetBtn) {
		resetBtn.addEventListener("click", () => {
			controls.reset();
		});
	}

	const clock = new THREE.Clock();
	let cleared = false;

	function setCleared(v) {
		cleared = v;
		toast.style.display = v ? "block" : "none";
	}

	function restart() {
		setCleared(false);
		player.reset();
		setActiveColor("gray"); // 게임 재시작 시 색상 초기화
	}

	bindInput({
		isLocked: () => cleared || player.state.isMoving,
		onMove: (dx, dy) => {
			player.tryMove(dx, dy);
		},
		onRestart: restart,
	});

	function checkClear() {
		return level.map[player.state.gy][player.state.gx] === 3;
	}

	function update(dt) {
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

	// 초기 색상 설정
	setActiveColor("gray");
	loop();
}

// Boot
createGame();
