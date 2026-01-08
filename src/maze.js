// src/maze.js

// 1 = 벽
// 0 = 길
// 2 = 시작
// 3 = 목표

export function generateMaze(width, height) {
	// 홀수 크기 보정 (DFS 미로는 홀수가 안정적)
	if (width % 2 === 0) width += 1;
	if (height % 2 === 0) height += 1;

	// 전부 벽으로 초기화
	const maze = Array.from({ length: height }, () => Array(width).fill(1));

	const dirs = [
		{ x: 0, y: -2 }, // 북
		{ x: 2, y: 0 }, // 동
		{ x: 0, y: 2 }, // 남
		{ x: -2, y: 0 }, // 서
	];

	function shuffle(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function carve(x, y) {
		maze[y][x] = 0;
		shuffle(dirs);

		for (const d of dirs) {
			const nx = x + d.x;
			const ny = y + d.y;

			if (
				nx > 0 &&
				ny > 0 &&
				nx < width - 1 &&
				ny < height - 1 &&
				maze[ny][nx] === 1
			) {
				maze[y + d.y / 2][x + d.x / 2] = 0;
				carve(nx, ny);
			}
		}
	}

	// 시작 지점
	carve(1, 1);

	// 시작 / 목표 지정
	maze[1][1] = 2;
	maze[height - 2][width - 2] = 3;

	return maze;
}

/**
 * 타일 색상 그룹화
 * - 완전 랜덤이 아니라
 * - 인접 타일과 색이 이어질 확률을 높임
 */
export function assignTileColors(map) {
	const rows = map.length;
	const cols = map[0].length;
	const colorMap = Array.from({ length: rows }, () => Array(cols).fill(null));

	const availableColors = ["red", "yellow", "blue"];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			if (map[y][x] === 1) continue;

			let color = null;

			// 왼쪽 타일과 이어질 확률
			if (
				x > 0 &&
				map[y][x - 1] !== 1 &&
				colorMap[y][x - 1] &&
				Math.random() < 0.7
			) {
				color = colorMap[y][x - 1];
			}

			// 위 타일과 이어질 확률
			if (
				!color &&
				y > 0 &&
				map[y - 1][x] !== 1 &&
				colorMap[y - 1][x] &&
				Math.random() < 0.7
			) {
				color = colorMap[y - 1][x];
			}

			if (!color) {
				color =
					availableColors[
						Math.floor(Math.random() * availableColors.length)
					];
			}

			colorMap[y][x] = color;
		}
	}

	return colorMap;
}
