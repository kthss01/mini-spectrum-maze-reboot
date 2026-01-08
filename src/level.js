import * as THREE from "three";
import { CFG, COLOR_VALUES } from "./config.js";

// 미로 배열과 색상 맵을 기반으로 타일과 기둥을 생성
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

	const floorMats = {};
	for (const name in COLOR_VALUES) {
		floorMats[name] = new THREE.MeshStandardMaterial({
			color: COLOR_VALUES[name],
			roughness: 0.95,
			metalness: 0.0,
		});
	}

	const pillarHeight = CFG.tile * rows * 2;
	const topGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const pillarGeo = new THREE.BoxGeometry(CFG.tile, pillarHeight, CFG.tile);

	const floors = [];
	const pillars = [];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v !== 1) {
				const p = gridToWorld(x, y);
				const colorName = colorMap[y][x] ?? "gray";
				const topMat = floorMats[colorName] || floorMats.gray;
				const topMesh = new THREE.Mesh(topGeo, topMat);
				topMesh.position.set(p.x, -CFG.floorH * 0.5, p.z);
				topMesh.receiveShadow = true;
				topMesh.material.transparent = true;
				topMesh.material.opacity = 1;

				const pillarMat = new THREE.MeshStandardMaterial({
					color: COLOR_VALUES[colorName] || COLOR_VALUES.gray,
					roughness: 0.8,
					metalness: 0.0,
				});
				pillarMat.transparent = true;
				pillarMat.opacity = 1;
				const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
				pillarMesh.position.set(
					p.x,
					-CFG.floorH - pillarHeight * 0.5,
					p.z
				);
				pillarMesh.castShadow = true;
				pillarMesh.receiveShadow = true;

				topMesh.userData.color = colorName;
				topMesh.userData.gridX = x;
				topMesh.userData.gridY = y;
				topMesh.userData.originalMaterial = topMat;

				pillarMesh.userData.gridX = x;
				pillarMesh.userData.gridY = y;

				floors.push(topMesh);
				pillars.push(pillarMesh);
				group.add(topMesh);
				group.add(pillarMesh);
			}
		}
	}

	return {
		group,
		map,
		colorMap,
		floors,
		pillars,
		start,
		goal,
		gridToWorld,
		canWalk,
	};
}
