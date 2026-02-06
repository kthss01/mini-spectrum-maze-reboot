import type { ColorName, GameConfig } from "./types/game";

export const CFG: GameConfig = {
	viewSize: 18,
	zoom: 1.25,
	tile: 2.2,
	wallH: 2.4,
	floorH: 0.4,
	playerY: 0.6,
	moveDuration: 0.18,
	radius: 40,
};

export const COLOR_VALUES: Record<ColorName | "black", number> = {
	gray: 0x1e2430,
	red: 0xd95763,
	yellow: 0xffd35c,
	blue: 0x5090e7,
	white: 0xffffff,
	black: 0x000000,
};

export const PLAYER_COLORS: Record<ColorName, number> = {
	gray: 0xe8edf7,
	red: 0xd95763,
	yellow: 0xffd35c,
	blue: 0x5090e7,
	white: 0xffffff,
};
