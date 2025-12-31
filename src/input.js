// WASD 이동 및 R키 재시작 입력 처리
export function bindInput({ onMove, onRestart, isLocked }) {
	function onKeyDown(e) {
		const k = e.key.toLowerCase();
		if (isLocked()) return;
		if (k === "w") onMove(0, -1);
		else if (k === "s") onMove(0, 1);
		else if (k === "a") onMove(-1, 0);
		else if (k === "d") onMove(1, 0);
		else if (k === "r") onRestart();
	}
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
