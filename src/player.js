import * as THREE from "three";
import { CFG, PLAYER_COLORS } from "./config.js";
import { easeInOut } from "./utils.js";

// 플레이어(큐브)와 이동 로직 생성
export function createPlayer(scene, level) {
	const playerGeo = new THREE.BoxGeometry(
		CFG.tile * 0.45,
		1.2,
		CFG.tile * 0.45
	);
	const playerMat = new THREE.MeshStandardMaterial({
		color: PLAYER_COLORS.white, // 초기 색상
		roughness: 0.5,
		metalness: 0.0,
	});
	// 하이라이트를 위한 emissive 색상 설정
	playerMat.emissive = new THREE.Color(0xffffff);
	playerMat.emissiveIntensity = 0.4;

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
		dir: 0,
	};

	function snapToGrid() {
		const p = level.gridToWorld(state.gx, state.gy);
		mesh.position.set(p.x, CFG.playerY, p.z);
	}

	function setDirection(newDir) {
		state.dir = ((newDir % 4) + 4) % 4;
		mesh.rotation.y = state.dir * (Math.PI / 2);
	}

	function turnClockwise() {
		setDirection(state.dir + 1);
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
		state.t = 0;
		snapToGrid();
		setDirection(0);
	}

	snapToGrid();
	setDirection(0);
	return {
		mesh,
		state,
		tryMove,
		update,
		reset,
		setDirection,
		turnClockwise,
	};
}
