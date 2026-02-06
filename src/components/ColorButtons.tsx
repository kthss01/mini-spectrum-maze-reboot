import type { TileColor } from '../types/game';

const COLORS: ReadonlyArray<{ name: TileColor; label: string }> = [
  { name: 'red', label: 'Red' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'blue', label: 'Blue' },
];

type ColorName = TileColor;

type ColorButtonsProps = {
  selectedColor: TileColor;
  onSelectColor: (color: ColorName) => void;
};

export function ColorButtons({ selectedColor, onSelectColor }: ColorButtonsProps) {
  return (
    <div className="color-buttons">
      {COLORS.map((color) => (
        <button
          key={color.name}
          className={`color-btn color-${color.name} ${selectedColor === color.name ? 'is-active' : ''}`}
          onClick={() => onSelectColor(color.name)}
          aria-label={color.label}
          type="button"
        />
      ))}
    </div>
  );
}
