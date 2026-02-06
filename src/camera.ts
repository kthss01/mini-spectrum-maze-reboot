import * as THREE from "three";
import { CFG } from "./config";
import type { MazeMap } from "./types/game";

export function computeCameraSettings(map: MazeMap) {
	const rows = map.length;
	const cols = map[0].length;
	const maxDim = Math.max(rows, cols);
	const viewSize = maxDim * CFG.tile * 0.6;
	const radius = maxDim * CFG.tile * 1.4;
	return { viewSize, radius };
}

export function createThreeCore({ canvasHost }: { canvasHost?: HTMLElement } = {}) {
	const host = canvasHost ?? document.body;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0f1115);

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.shadowMap.enabled = true;
	host.appendChild(renderer.domElement);

	scene.add(new THREE.AmbientLight(0xffffff, 0.55));
	const dir = new THREE.DirectionalLight(0xffffff, 0.95);
	dir.position.set(20, 30, 10);
	dir.castShadow = true;
	dir.shadow.mapSize.set(1024, 1024);
	scene.add(dir);

	const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 200);
	camera.zoom = CFG.zoom;

	function getSize() {
		if (host === document.body) {
			return { width: window.innerWidth, height: window.innerHeight };
		}
		return {
			width: host.clientWidth || window.innerWidth,
			height: host.clientHeight || window.innerHeight,
		};
	}

	function updateCamera() {
		const { width, height } = getSize();
		const aspect = width / height;
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

	function resizeRenderer() {
		const { width, height } = getSize();
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		renderer.setSize(width, height);
		updateCamera();
	}

	resizeRenderer();
	window.addEventListener("resize", resizeRenderer);

	function destroy() {
		window.removeEventListener("resize", resizeRenderer);
		renderer.dispose();
		renderer.domElement.remove();
	}

	return { scene, renderer, camera, updateCamera, destroy };
}
