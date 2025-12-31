import { COLORS } from "./config.js";

// DFS 백트래커를 사용해 미로를 생성 (0=길, 1=벽, 2=시작, 3=목표)
export function generateMaze(width, height) {
	const maze = Array.from({ length: height }, () => Array(width).fill(1));
	const stack = [];
	maze[1][1] = 0;
	stack.push([1, 1]);
	const dirs = [
		[0, -2],
		[2, 0],
		[0, 2],
		[-2, 0],
	];
	while (stack.length) {
		const [x, y] = stack[stack.length - 1];
		const neighbors = dirs
			.map(([dx, dy]) => [x + dx, y + dy, x + dx / 2, y + dy / 2])
			.filter(([nx, ny]) => {
				return (
					nx > 0 &&
					ny > 0 &&
					nx < width - 1 &&
					ny < height - 1 &&
					maze[ny][nx] === 1
				);
			});
		if (neighbors.length) {
			const [nx, ny, wx, wy] =
				neighbors[Math.floor(Math.random() * neighbors.length)];
			maze[ny][nx] = 0;
			maze[wy][wx] = 0;
			stack.push([nx, ny]);
		} else {
			stack.pop();
		}
	}
	maze[1][1] = 2;
	maze[height - 2][width - 2] = 3;
	return maze;
}

// 통로(0), 시작(2), 목표(3) 타일에 색상 지정 (무작위)
export function assignTileColors(map) {
	return map.map((row) =>
		row.map((v) => {
			if (v === 1) return null;
			if (v === 2 || v === 3) return "gray";
			// COLORS[0]은 gray이므로 제외하고 random
			const idx = 1 + Math.floor(Math.random() * (COLORS.length - 1));
			return COLORS[idx];
		})
	);
}
