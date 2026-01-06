// WASD 회전, R 키 재시작, 숫자 키 1/2/3로 색 선택 기능을 포함한 입력 처리
export function bindInput({
	onMove,
	onRestart,
	isLocked,
	onRotate,
	onColorKey,
}) {
	function onKeyDown(e) {
		if (isLocked()) return;
		const key = e.key.toLowerCase();
		// 방향 전환: WASD
		if (key === "w") {
			onRotate && onRotate(0); // 북쪽
		} else if (key === "d") {
			onRotate && onRotate(1); // 동쪽
		} else if (key === "s") {
			onRotate && onRotate(2); // 남쪽
		} else if (key === "a") {
			onRotate && onRotate(3); // 서쪽
		} else if (key === "r") {
			onRestart && onRestart(); // 재시작
		} else if (key === "1") {
			onColorKey && onColorKey("red"); // 1번 키 → 빨간색 선택
		} else if (key === "2") {
			onColorKey && onColorKey("yellow"); // 2번 키 → 노란색 선택
		} else if (key === "3") {
			onColorKey && onColorKey("blue"); // 3번 키 → 파란색 선택
		}
	}

	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
