// WASD 이동 제거, R키만 재시작 처리
export function bindInput({ onMove, onRestart, isLocked }) {
	function onKeyDown(e) {
		const k = e.key.toLowerCase();
		if (isLocked()) return;
		// 이동 키는 무시, R키만 재시작
		if (k === "r") onRestart();
	}
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
