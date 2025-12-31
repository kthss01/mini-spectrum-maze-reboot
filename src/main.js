import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

// 미로 크기 설정 (홀수)
const MAZE_WIDTH = 31; // 반드시 홀수 (타일 단위)
const MAZE_HEIGHT = 33; // 반드시 홀수 (타일 단위)

// 게임 설정 (CFG)
const CFG = {
	viewSize: 18,
	zoom: 1.25,
	tile: 2.2,
	wallH: 2.4,
	floorH: 0.4,
	playerY: 0.6,
	moveDuration: 0.18,
	radius: 40, // 기본값, 이후 동적으로 재설정됨
};

/**
 * DFS 백트래커로 미로 생성
 * width, height는 타일 그리드 크기이며 홀수여야 합니다.
 * 0=길, 1=벽, 2=시작, 3=목표
 */
function generateMaze(width, height) {
	const maze = Array.from({ length: height }, () => Array(width).fill(1));
	const stack = [];
	maze[1][1] = 0;
	stack.push([1, 1]);

	const directions = [
		[0, -2],
		[2, 0],
		[0, 2],
		[-2, 0],
	];

	while (stack.length > 0) {
		const [x, y] = stack[stack.length - 1];
		const neighbors = directions
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

		if (neighbors.length > 0) {
			const [nx, ny, wx, wy] =
				neighbors[Math.floor(Math.random() * neighbors.length)];
			maze[ny][nx] = 0;
			maze[wy][wx] = 0;
			stack.push([nx, ny]);
		} else {
			stack.pop();
		}
	}

	// 시작점과 도착점 지정
	maze[1][1] = 2;
	maze[height - 2][width - 2] = 3;
	return maze;
}

/**
 * 미로 크기에 따라 카메라 viewSize와 radius를 계산
 * map: 2D 배열 LEVEL
 */
function computeCameraSettings(map) {
	const rows = map.length;
	const cols = map[0].length;
	const maxDim = Math.max(rows, cols);
	const viewSize = maxDim * CFG.tile * 0.6;
	const radius = maxDim * CFG.tile * 1.4;
	return { viewSize, radius };
}

// 미로 생성 후 동적 카메라 설정 적용
const LEVEL = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
const { viewSize, radius } = computeCameraSettings(LEVEL);
CFG.viewSize = viewSize;
CFG.radius = radius;

let controls; // OrbitControls 인스턴스

/**
 * 완만한 easing 함수
 */
function easeInOut(t) {
	return t * t * (3 - 2 * t);
}

/**
 * THREE CORE (scene/renderer/camera/lights)
 */
function createThreeCore() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0f1115);

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	document.body.appendChild(renderer.domElement);

	// Lights
	scene.add(new THREE.AmbientLight(0xffffff, 0.55));
	const dir = new THREE.DirectionalLight(0xffffff, 0.95);
	dir.position.set(20, 30, 10);
	dir.castShadow = true;
	dir.shadow.mapSize.set(1024, 1024);
	scene.add(dir);

	// 카메라 생성
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
 * LEVEL (tile map -> meshes + helpers)
 */
function createLevel(scene, map) {
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

	// Materials / geometries
	const floorMat = new THREE.MeshStandardMaterial({
		color: 0x1e2430,
		roughness: 0.95,
		metalness: 0.0,
	});
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

	const floorGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);

	// Create only path tiles; wall tiles become 낭떠러지
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v !== 1) {
				const p = gridToWorld(x, y);
				const floor = new THREE.Mesh(floorGeo, floorMat);
				floor.position.set(p.x, -CFG.floorH * 0.5, p.z);
				floor.receiveShadow = true;
				group.add(floor);
			}
		}
	}

	// Start/Goal marker tiles
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

	// Goal pillar (for visibility)
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
		start,
		goal,
		goalMesh,
		gridToWorld,
		canWalk,
	};
}

/**
 * PLAYER (grid state + move tween)
 */
function createPlayer(scene, level) {
	const playerGeo = new THREE.BoxGeometry(
		CFG.tile * 0.45,
		1.2,
		CFG.tile * 0.45
	);
	const playerMat = new THREE.MeshStandardMaterial({
		color: 0xe8edf7,
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
 * INPUT (WASD)
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
 * GAME
 */
function createGame() {
	const toast = document.getElementById("toast");

	const { scene, renderer, camera } = createThreeCore();
	const level = createLevel(scene, LEVEL);
	const player = createPlayer(scene, level);

	// OrbitControls 설정
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableRotate = false; // 회전 비활성화
	controls.enablePan = true; // 우클릭 팬 가능
	controls.enableZoom = true; // 스크롤 줌 가능
	controls.screenSpacePanning = true;
	controls.minZoom = 0.5;
	controls.maxZoom = 4;
	controls.update();

	// 우클릭 메뉴 방지
	window.addEventListener("contextmenu", (e) => e.preventDefault());

	// Reset 버튼 이벤트 등록
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
		controls.update(); // 컨트롤 상태 업데이트
		renderer.render(scene, camera);
	}

	loop();
}

// Boot
createGame();
