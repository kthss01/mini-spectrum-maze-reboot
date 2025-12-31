import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { CFG } from "./config.js";

// 미로 크기에 따라 카메라 viewSize와 radius 계산
export function computeCameraSettings(map) {
	const rows = map.length;
	const cols = map[0].length;
	const maxDim = Math.max(rows, cols);
	const viewSize = maxDim * CFG.tile * 0.6;
	const radius = maxDim * CFG.tile * 1.4;
	return { viewSize, radius };
}

// 씬, 렌더러, 카메라를 생성하고 resize 시 갱신 함수 제공
export function createThreeCore() {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0f1115);

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	document.body.appendChild(renderer.domElement);

	// 기본 조명
	scene.add(new THREE.AmbientLight(0xffffff, 0.55));
	const dir = new THREE.DirectionalLight(0xffffff, 0.95);
	dir.position.set(20, 30, 10);
	dir.castShadow = true;
	dir.shadow.mapSize.set(1024, 1024);
	scene.add(dir);

	// Orthographic 카메라 생성
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

	return { scene, renderer, camera, updateCamera };
}
