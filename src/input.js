// WASD 방향 회전 + R 키 재시작 입력 처리
export function bindInput({ onMove, onRestart, isLocked, onRotate }) {
	function onKeyDown(e) {
		const k = e.key.toLowerCase();
		if (isLocked()) return;
		if (k === "w") {
			onRotate && onRotate(0); // 북쪽
		} else if (k === "d") {
			onRotate && onRotate(1); // 동쪽
		} else if (k === "s") {
			onRotate && onRotate(2); // 남쪽
		} else if (k === "a") {
			onRotate && onRotate(3); // 서쪽
		} else if (k === "r") {
			onRestart && onRestart();
		}
	}
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
