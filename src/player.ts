import * as THREE from "three";
import { CFG, PLAYER_COLORS } from "./config";
import { easeInOut } from "./utils";
import { DIRECTION, type Direction, type PlayerState } from "./types/game";

type LevelLike = {
	group: THREE.Group;
	start: { x: number; y: number };
	gridToWorld: (gx: number, gy: number) => THREE.Vector3;
	canWalk: (gx: number, gy: number) => boolean;
};

export function createPlayer(_scene: THREE.Scene, level: LevelLike) {
	const playerGeo = new THREE.BoxGeometry(CFG.tile * 0.45, 1.2, CFG.tile * 0.45);
	const playerMat = new THREE.MeshStandardMaterial({
		color: PLAYER_COLORS.white,
		roughness: 0.5,
		metalness: 0.0,
	});
	playerMat.emissive = new THREE.Color(0xffffff);
	playerMat.emissiveIntensity = 0.4;

	const mesh = new THREE.Mesh(playerGeo, playerMat);
	mesh.castShadow = true;
	level.group.add(mesh);

	const state: PlayerState = {
		gx: level.start.x,
		gy: level.start.y,
		isMoving: false,
		t: 0,
		from: new THREE.Vector3(),
		to: new THREE.Vector3(),
		dir: DIRECTION.NORTH,
	};

	function snapToGrid() {
		const p = level.gridToWorld(state.gx, state.gy);
		mesh.position.set(p.x, CFG.playerY, p.z);
	}

	function setDirection(newDir: number) {
		const normalized = (((newDir % 4) + 4) % 4) as Direction;
		state.dir = normalized;
		mesh.rotation.y = state.dir * (Math.PI / 2);
	}

	function beginMoveTo(nx: number, ny: number) {
		state.isMoving = true;
		state.t = 0;
		state.from.copy(mesh.position);
		const wp = level.gridToWorld(nx, ny);
		state.to.set(wp.x, CFG.playerY, wp.z);
		state.gx = nx;
		state.gy = ny;
	}

	function tryMove(dx: number, dy: number) {
		if (state.isMoving) return false;
		const nx = state.gx + dx;
		const ny = state.gy + dy;
		if (!level.canWalk(nx, ny)) return false;
		beginMoveTo(nx, ny);
		return true;
	}

	function update(dt: number) {
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
		state.t = 0;
		snapToGrid();
		setDirection(DIRECTION.NORTH);
	}

	snapToGrid();
	setDirection(DIRECTION.NORTH);
	return { mesh, state, tryMove, update, reset, setDirection };
}
