import * as THREE from "three";
import { CFG, COLOR_VALUES } from "./config.js";

// 미로 배열과 색상 맵을 기반으로 타일과 마커, 기둥을 생성
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

	// 색상별 재질 미리 생성
	const floorMats = {};
	for (const name in COLOR_VALUES) {
		floorMats[name] = new THREE.MeshStandardMaterial({
			color: COLOR_VALUES[name],
			roughness: 0.95,
			metalness: 0.0,
		});
	}

	// 기둥 높이를 크게 설정하여 하단이 보이지 않도록
	const pillarHeight = CFG.tile * rows * 2;

	const topGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const pillarGeo = new THREE.BoxGeometry(CFG.tile, pillarHeight, CFG.tile);

	const floors = [];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v !== 1) {
				const p = gridToWorld(x, y);
				const colorName = colorMap[y][x] ?? "gray";
				const topMat = floorMats[colorName] || floorMats.gray;

				// 상단 타일 부분
				const topMesh = new THREE.Mesh(topGeo, topMat);
				topMesh.position.set(p.x, -CFG.floorH * 0.5, p.z);
				topMesh.receiveShadow = true;

				// 하단 기둥 부분: 타일 색과 동일한 색상 사용
				const pillarMat = new THREE.MeshStandardMaterial({
					color: COLOR_VALUES[colorName] || COLOR_VALUES.gray,
					roughness: 0.8,
					metalness: 0.0,
				});
				const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
				pillarMesh.position.set(
					p.x,
					-CFG.floorH - pillarHeight * 0.5,
					p.z
				);
				pillarMesh.castShadow = true;
				pillarMesh.receiveShadow = true;

				// userData 설정 (상단 타일)
				topMesh.userData.color = colorName;
				topMesh.userData.gridX = x;
				topMesh.userData.gridY = y;
				topMesh.userData.originalMaterial = topMat;

				floors.push(topMesh);
				group.add(topMesh);
				group.add(pillarMesh);
			}
		}
	}

	// 시작/목표 마커 (start: white, goal: gray)
	const startMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		roughness: 0.6,
		metalness: 0.0,
	});
	const goalMat = new THREE.MeshStandardMaterial({
		color: COLOR_VALUES.gray,
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

	// 목표 기둥 (gray)
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
