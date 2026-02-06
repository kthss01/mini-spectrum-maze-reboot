import { DIRECTION, type Direction, type TileColor } from "./types/game";

type InputHandlers = {
	onRestart?: () => void;
	isLocked: () => boolean;
	onRotate?: (dir: Direction) => void;
	onColorKey?: (color: TileColor) => void;
};

export function bindInput({ onRestart, isLocked, onRotate, onColorKey }: InputHandlers) {
	function onKeyDown(e: KeyboardEvent) {
		const key = e.key.toLowerCase();

		if (key === "r") {
			onRestart && onRestart();
			return;
		}

		if (isLocked()) return;

		if (key === "w") {
			onRotate && onRotate(DIRECTION.NORTH);
		} else if (key === "d") {
			onRotate && onRotate(DIRECTION.EAST);
		} else if (key === "s") {
			onRotate && onRotate(DIRECTION.SOUTH);
		} else if (key === "a") {
			onRotate && onRotate(DIRECTION.WEST);
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
