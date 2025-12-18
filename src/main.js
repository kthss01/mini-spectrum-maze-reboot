import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

// =========================
// Level Data (0=path, 1=wall, 2=start, 3=goal)
// =========================
const map = [
	[1, 1, 1, 1, 1, 1, 1],
	[1, 2, 0, 0, 0, 3, 1],
	[1, 0, 1, 1, 0, 0, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 1, 1, 1, 1, 1, 1],
];

// =========================
// Three.js Setup
// =========================
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

// =========================
// Camera (Isometric Orthographic)
// =========================
const viewSize = 18;
const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 200);
camera.zoom = 1.25;

function setIsometricCamera() {
	const aspect = window.innerWidth / window.innerHeight;
	camera.left = -viewSize * aspect;
	camera.right = viewSize * aspect;
	camera.top = viewSize;
	camera.bottom = -viewSize;

	const yaw = THREE.MathUtils.degToRad(45);
	const pitch = THREE.MathUtils.degToRad(35.264);
	const radius = 40;

	camera.position.set(
		radius * Math.cos(yaw) * Math.cos(pitch),
		radius * Math.sin(pitch),
		radius * Math.sin(yaw) * Math.cos(pitch)
	);
	camera.lookAt(0, 0, 0);
	camera.updateProjectionMatrix();
}
setIsometricCamera();

// =========================
// Map Build (Tiles / Walls / Markers)
// =========================
const TILE = 2.2;
const WALL_H = 2.4;
const FLOOR_H = 0.4;

const rows = map.length;
const cols = map[0].length;

const offsetX = (cols - 1) * TILE * 0.5;
const offsetZ = (rows - 1) * TILE * 0.5;

function gridToWorld(x, y) {
	return new THREE.Vector3(x * TILE - offsetX, 0, y * TILE - offsetZ);
}

const group = new THREE.Group();
scene.add(group);

const floorMat = new THREE.MeshStandardMaterial({
	color: 0x1e2430,
	roughness: 0.95,
	metalness: 0.0,
});
const wallMat = new THREE.MeshStandardMaterial({
	color: 0x2f394b,
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

const floorGeo = new THREE.BoxGeometry(TILE, FLOOR_H, TILE);
const wallGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);

let startGX = 1,
	startGY = 1;
let goalGX = -1,
	goalGY = -1;

for (let y = 0; y < rows; y++) {
	for (let x = 0; x < cols; x++) {
		const v = map[y][x];
		const p = gridToWorld(x, y);

		// floor
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.position.set(p.x, -FLOOR_H * 0.5, p.z);
		floor.receiveShadow = true;
		group.add(floor);

		// wall
		if (v === 1) {
			const wall = new THREE.Mesh(wallGeo, wallMat);
			wall.position.set(p.x, WALL_H * 0.5, p.z);
			wall.castShadow = true;
			wall.receiveShadow = true;
			group.add(wall);
		}

		if (v === 2) {
			startGX = x;
			startGY = y;
		}
		if (v === 3) {
			goalGX = x;
			goalGY = y;
		}
	}
}

function addMarkerTile(gx, gy, mat) {
	const p = gridToWorld(gx, gy);
	const marker = new THREE.Mesh(
		new THREE.BoxGeometry(TILE * 0.92, 0.08, TILE * 0.92),
		mat
	);
	marker.position.set(p.x, 0.05, p.z);
	marker.receiveShadow = true;
	group.add(marker);
}

addMarkerTile(startGX, startGY, startMat);
addMarkerTile(goalGX, goalGY, goalMat);

// Goal pillar
const goalPillarGeo = new THREE.CylinderGeometry(
	TILE * 0.18,
	TILE * 0.18,
	2.2,
	16
);
const goalMesh = new THREE.Mesh(goalPillarGeo, goalMat);
{
	const p = gridToWorld(goalGX, goalGY);
	goalMesh.position.set(p.x, 1.1, p.z);
	goalMesh.castShadow = true;
	group.add(goalMesh);
}

// =========================
// Player + Grid Movement
// =========================
const playerGeo = new THREE.BoxGeometry(TILE * 0.45, 1.2, TILE * 0.45);
const playerMat = new THREE.MeshStandardMaterial({
	color: 0xe8edf7,
	roughness: 0.5,
	metalness: 0.0,
});
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true;
group.add(player);

let gridX = startGX,
	gridY = startGY;

function snapPlayerToGrid() {
	const p = gridToWorld(gridX, gridY);
	player.position.set(p.x, 0.6, p.z);
}
snapPlayerToGrid();

function canMove(nx, ny) {
	return map[ny]?.[nx] != null && map[ny][nx] !== 1;
}

let isMoving = false;
let moveT = 0;
const moveDuration = 0.18;

const from = new THREE.Vector3();
const to = new THREE.Vector3();

function easeInOut(t) {
	return t * t * (3 - 2 * t);
}

const toast = document.getElementById("toast");
let cleared = false;

function tryMove(dx, dy) {
	if (cleared || isMoving) return;

	const nx = gridX + dx;
	const ny = gridY + dy;
	if (!canMove(nx, ny)) return;

	isMoving = true;
	moveT = 0;

	from.copy(player.position);
	const tp = gridToWorld(nx, ny);
	to.set(tp.x, 0.6, tp.z);

	gridX = nx;
	gridY = ny;
}

function restart() {
	cleared = false;
	toast.style.display = "none";
	gridX = startGX;
	gridY = startGY;
	isMoving = false;
	snapPlayerToGrid();
}

// Input (WASD)
window.addEventListener("keydown", (e) => {
	const k = e.key.toLowerCase();

	if (k === "w") tryMove(0, -1);
	if (k === "s") tryMove(0, 1);
	if (k === "a") tryMove(-1, 0);
	if (k === "d") tryMove(1, 0);

	if (k === "r") restart();
});

// =========================
// Loop + Resize
// =========================
const clock = new THREE.Clock();

function onResize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	setIsometricCamera();
}
window.addEventListener("resize", onResize);

function animate() {
	requestAnimationFrame(animate);

	const dt = clock.getDelta();
	goalMesh.rotation.y += dt * 0.8;

	if (isMoving) {
		moveT += dt / moveDuration;
		const a = Math.min(moveT, 1);
		const eased = easeInOut(a);

		player.position.lerpVectors(from, to, eased);

		if (a >= 1) {
			isMoving = false;

			if (map[gridY][gridX] === 3) {
				cleared = true;
				toast.style.display = "block";
			}
		}
	}

	renderer.render(scene, camera);
}
animate();
