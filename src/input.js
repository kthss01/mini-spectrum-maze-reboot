export function bindInput({ onRestart, isLocked, onRotate, onColorKey }) {
	function onKeyDown(e) {
		const key = e.key.toLowerCase();

		if (key === "r") {
			onRestart && onRestart();
			return;
		}

		if (isLocked()) return;

		if (key === "w") {
			onRotate && onRotate(0);
		} else if (key === "d") {
			onRotate && onRotate(1);
		} else if (key === "s") {
			onRotate && onRotate(2);
		} else if (key === "a") {
			onRotate && onRotate(3);
		} else if (key === "1") {
			onColorKey && onColorKey("red");
		} else if (key === "2") {
			onColorKey && onColorKey("yellow");
		} else if (key === "3") {
			onColorKey && onColorKey("blue");
		}
	}
	window.addEventListener("keydown", onKeyDown);
	return () => window.removeEventListener("keydown", onKeyDown);
}
