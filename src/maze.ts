import type { ColorMap, MazeMap, TileColor } from "./types/game";

// 0 = 길, 1 = 벽, 2 = 시작, 3 = 목표
export function generateMaze(width: number, height: number): MazeMap {
	if (width % 2 === 0) width += 1;
	if (height % 2 === 0) height += 1;

	const maze: MazeMap = Array.from({ length: height }, () => Array(width).fill(1));

	const dirs = [
		{ x: 0, y: -2 },
		{ x: 2, y: 0 },
		{ x: 0, y: 2 },
		{ x: -2, y: 0 },
	] as const;

	function shuffle<T>(array: T[]) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function carve(x: number, y: number) {
		maze[y][x] = 0;
		const shuffledDirs = [...dirs];
		shuffle(shuffledDirs);

		for (const d of shuffledDirs) {
			const nx = x + d.x;
			const ny = y + d.y;

			if (nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && maze[ny][nx] === 1) {
				maze[y + d.y / 2][x + d.x / 2] = 0;
				carve(nx, ny);
			}
		}
	}

	carve(1, 1);
	maze[1][1] = 2;
	maze[height - 2][width - 2] = 3;

	return maze;
}

export function assignTileColors(map: MazeMap): ColorMap {
	const rows = map.length;
	const cols = map[0].length;
	const colorMap: ColorMap = Array.from({ length: rows }, () => Array(cols).fill(null));

	const availableColors: readonly TileColor[] = ["red", "yellow", "blue"];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			if (map[y][x] === 1) continue;

			let color: TileColor | "white" | "gray" | null = null;

			if (x > 0 && map[y][x - 1] !== 1 && colorMap[y][x - 1] && Math.random() < 0.7) {
				color = colorMap[y][x - 1];
			}

			if (!color && y > 0 && map[y - 1][x] !== 1 && colorMap[y - 1][x] && Math.random() < 0.7) {
				color = colorMap[y - 1][x];
			}

			if (!color || color === "gray" || color === "white") {
				color = availableColors[Math.floor(Math.random() * availableColors.length)];
			}

			colorMap[y][x] = color;
		}
	}

	return colorMap;
}
