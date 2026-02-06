import { DIRECTION, type Direction } from '../types/game';

const DIRECTIONS: ReadonlyArray<{
  dir: Direction;
  className: string;
  label: string;
}> = [
  { dir: DIRECTION.NORTH, className: 'dir-north', label: 'North' },
  { dir: DIRECTION.EAST, className: 'dir-east', label: 'East' },
  { dir: DIRECTION.SOUTH, className: 'dir-south', label: 'South' },
  { dir: DIRECTION.WEST, className: 'dir-west', label: 'West' },
];

type DirectionPadProps = {
  onRotate: (dir: Direction) => void;
};

export function DirectionPad({ onRotate }: DirectionPadProps) {
  return (
    <div className="direction-buttons">
      {DIRECTIONS.map((item) => (
        <button
          key={item.dir}
          className={`arrow-btn ${item.className}`}
          onClick={() => onRotate(item.dir)}
          aria-label={item.label}
          type="button"
        >
          <span>▲</span>
        </button>
      ))}
    </div>
  );
}
