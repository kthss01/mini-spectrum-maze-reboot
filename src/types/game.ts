export type ColorName = "gray" | "red" | "yellow" | "blue" | "white";

export const DIRECTION = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];

export type GridPos = {
  x: number;
  y: number;
};

export type PlayerState = {
  gx: number;
  gy: number;
  isMoving: boolean;
  t: number;
  from: import("three").Vector3;
  to: import("three").Vector3;
  dir: Direction;
};

export type GameConfig = {
  viewSize: number;
  zoom: number;
  tile: number;
  wallH: number;
  floorH: number;
  playerY: number;
  moveDuration: number;
  radius: number;
};

export type MazeCell = 0 | 1 | 2 | 3;
export type MazeMap = MazeCell[][];
export type TileColor = Extract<ColorName, "red" | "yellow" | "blue">;
export type ColorMap = Array<Array<TileColor | "white" | "gray" | null>>;
