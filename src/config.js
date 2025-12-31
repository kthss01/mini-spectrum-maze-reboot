// 게임 전역 설정과 색상 정의
export const CFG = {
	viewSize: 18,
	zoom: 1.25,
	tile: 2.2,
	wallH: 2.4,
	floorH: 0.4,
	playerY: 0.6,
	moveDuration: 0.18,
	radius: 40,
};

// 무작위 색상 목록 (흰/검 제외)
export const COLORS = ["gray", "red", "yellow", "blue"];

// 타일 색상 값
export const COLOR_VALUES = {
	gray: 0x1e2430,
	red: 0xd95763,
	yellow: 0xffd35c,
	blue: 0x5090e7,
	white: 0xffffff,
	black: 0x000000,
};

// 플레이어 색상
export const PLAYER_COLORS = {
	gray: 0xe8edf7,
	red: 0xd95763,
	yellow: 0xffd35c,
	blue: 0x5090e7,
	white: 0xffffff,
};
