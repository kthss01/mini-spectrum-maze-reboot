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

	// "색상별 베이스 머티리얼" (여기서는 base로만 쓰고, 실제 Mesh에는 clone해서 씀)
	const baseMats = {};
	for (const name in COLOR_VALUES) {
		const m = new THREE.MeshStandardMaterial({
			color: COLOR_VALUES[name],
			roughness: 0.95,
			metalness: 0.0,
			transparent: true,
			opacity: 1,
		});
		baseMats[name] = m;
	}

	// 기둥 높이를 크게 설정 (하단이 화면 밖)
	const pillarHeight = CFG.tile * rows * 2;

	const topGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const pillarGeo = new THREE.BoxGeometry(CFG.tile, pillarHeight, CFG.tile);

	const floors = [];
	const pillars = [];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v === 1) continue;

			const p = gridToWorld(x, y);
			const colorName = colorMap[y][x] ?? "gray";

			// ✅ 핵심: Mesh마다 material을 clone해서 "개별 인스턴스"로 만든다
			const topMat = (baseMats[colorName] || baseMats.gray).clone();
			topMat.transparent = true;
			topMat.opacity = 1;

			const topMesh = new THREE.Mesh(topGeo, topMat);
			topMesh.position.set(p.x, -CFG.floorH * 0.5, p.z);
			topMesh.receiveShadow = true;

			const pillarMat = (baseMats[colorName] || baseMats.gray).clone();
			pillarMat.transparent = true;
			pillarMat.opacity = 1;

			const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
			pillarMesh.position.set(p.x, -CFG.floorH - pillarHeight * 0.5, p.z);
			pillarMesh.castShadow = true;
			pillarMesh.receiveShadow = true;

			// userData
			topMesh.userData.color = colorName;
			topMesh.userData.gridX = x;
			topMesh.userData.gridY = y;
			topMesh.userData.originalMaterial = topMat; // highlight 복구용
			topMesh.userData.targetOpacity = 1;

			pillarMesh.userData.gridX = x;
			pillarMesh.userData.gridY = y;
			pillarMesh.userData.targetOpacity = 1;

			floors.push(topMesh);
			pillars.push(pillarMesh);

			group.add(topMesh);
			group.add(pillarMesh);
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
