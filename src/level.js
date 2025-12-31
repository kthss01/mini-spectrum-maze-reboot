import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { CFG, COLOR_VALUES } from "./config.js";

// 미로 배열과 색상 맵을 기반으로 타일과 마커를 생성
export function createLevel(scene, map, colorMap) {
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

	// 색상별 재질 재사용을 위해 한 번만 생성
	const floorMats = {};
	for (const name in COLOR_VALUES) {
		floorMats[name] = new THREE.MeshStandardMaterial({
			color: COLOR_VALUES[name],
			roughness: 0.95,
			metalness: 0.0,
		});
	}

	const floorGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const floors = [];

	// 통로(1이 아닌 타일)만 바닥 생성
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v !== 1) {
				const p = gridToWorld(x, y);
				const colorName = colorMap[y][x] ?? "gray";
				const mat = floorMats[colorName] || floorMats.gray;
				const floor = new THREE.Mesh(floorGeo, mat);
				floor.position.set(p.x, -CFG.floorH * 0.5, p.z);
				floor.receiveShadow = true;
				floor.userData.color = colorName;
				floors.push(floor);
				group.add(floor);
			}
		}
	}

	// 시작/도착 마커와 목표 기둥
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
