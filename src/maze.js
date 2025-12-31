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

// 무작위 색상 배정을 일정한 그룹 단위로 수행
export function assignTileColors(map) {
	const rows = map.length;
	const cols = map[0].length;
	const colorMap = Array.from({ length: rows }, () => Array(cols).fill(null));
	const availableColors = ["red", "yellow", "blue"];

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			if (map[y][x] !== 1) {
				let chosenColor = null;
				// 왼쪽 이웃이 같은 지점일 경우 색상 유지 가능
				if (
					x > 0 &&
					map[y][x - 1] !== 1 &&
					colorMap[y][x - 1] &&
					Math.random() < 0.7
				) {
					chosenColor = colorMap[y][x - 1];
				}
				// 위쪽 이웃이 같은 지점일 경우 색상 유지 가능
				if (
					y > 0 &&
					map[y - 1][x] !== 1 &&
					colorMap[y - 1][x] &&
					!chosenColor &&
					Math.random() < 0.7
				) {
					chosenColor = colorMap[y - 1][x];
				}
				// 결정되지 않았다면 무작위 색상
				if (!chosenColor) {
					chosenColor =
						availableColors[
							Math.floor(Math.random() * availableColors.length)
						];
				}
				colorMap[y][x] = chosenColor;
			}
		}
	}
	return colorMap;
}
