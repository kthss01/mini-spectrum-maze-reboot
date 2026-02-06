import * as THREE from "three";
import { CFG, COLOR_VALUES } from "./config";
import type { ColorMap, ColorName, GridPos, MazeMap } from "./types/game";

type TileMesh = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

export function createLevel(scene: THREE.Scene, map: MazeMap, colorMap: ColorMap) {
	const rows = map.length;
	const cols = map[0].length;

	const group = new THREE.Group();
	scene.add(group);

	const offsetX = (cols - 1) * CFG.tile * 0.5;
	const offsetZ = (rows - 1) * CFG.tile * 0.5;

	function gridToWorld(gx: number, gy: number) {
		return new THREE.Vector3(gx * CFG.tile - offsetX, 0, gy * CFG.tile - offsetZ);
	}

	function canWalk(gx: number, gy: number) {
		return map[gy]?.[gx] != null && map[gy][gx] !== 1;
	}

	function findTile(value: number): GridPos | null {
		for (let y = 0; y < rows; y++) {
			for (let x = 0; x < cols; x++) {
				if (map[y][x] === value) return { x, y };
			}
		}
		return null;
	}

	const start = findTile(2) ?? { x: 1, y: 1 };
	const goal = findTile(3) ?? { x: cols - 2, y: rows - 2 };

	const baseMats: Record<ColorName, THREE.MeshStandardMaterial> = {
		gray: new THREE.MeshStandardMaterial({ color: COLOR_VALUES.gray, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 1 }),
		red: new THREE.MeshStandardMaterial({ color: COLOR_VALUES.red, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 1 }),
		yellow: new THREE.MeshStandardMaterial({ color: COLOR_VALUES.yellow, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 1 }),
		blue: new THREE.MeshStandardMaterial({ color: COLOR_VALUES.blue, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 1 }),
		white: new THREE.MeshStandardMaterial({ color: COLOR_VALUES.white, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 1 }),
	};

	const pillarHeight = CFG.tile * rows * 2;

	const topGeo = new THREE.BoxGeometry(CFG.tile, CFG.floorH, CFG.tile);
	const pillarGeo = new THREE.BoxGeometry(CFG.tile, pillarHeight, CFG.tile);

	const floors: TileMesh[] = [];
	const pillars: TileMesh[] = [];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const v = map[y][x];
			if (v === 1) continue;

			const p = gridToWorld(x, y);
			const colorName = (colorMap[y][x] ?? "gray") as ColorName;

			const topMat = (baseMats[colorName] || baseMats.gray).clone();
			topMat.transparent = true;
			topMat.opacity = 1;

			const topMesh: TileMesh = new THREE.Mesh(topGeo, topMat);
			topMesh.position.set(p.x, -CFG.floorH * 0.5, p.z);
			topMesh.receiveShadow = true;

			const pillarMat = (baseMats[colorName] || baseMats.gray).clone();
			pillarMat.transparent = true;
			pillarMat.opacity = 1;

			const pillarMesh: TileMesh = new THREE.Mesh(pillarGeo, pillarMat);
			pillarMesh.position.set(p.x, -CFG.floorH - pillarHeight * 0.5, p.z);
			pillarMesh.castShadow = true;
			pillarMesh.receiveShadow = true;

			topMesh.userData.color = colorName;
			topMesh.userData.gridX = x;
			topMesh.userData.gridY = y;
			topMesh.userData.originalMaterial = topMat;
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

	return { group, map, colorMap, floors, pillars, start, goal, gridToWorld, canWalk };
}
