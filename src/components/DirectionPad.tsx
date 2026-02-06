const DIRECTIONS = [
  { dir: 0, className: 'dir-north', label: 'North' },
  { dir: 1, className: 'dir-east', label: 'East' },
  { dir: 2, className: 'dir-south', label: 'South' },
  { dir: 3, className: 'dir-west', label: 'West' },
] as const;

type DirectionPadProps = {
  onRotate: (dir: number) => void;
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
