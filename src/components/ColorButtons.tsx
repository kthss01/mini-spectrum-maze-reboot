const COLORS = [
  { name: 'red', label: 'Red' },
  { name: 'yellow', label: 'Yellow' },
  { name: 'blue', label: 'Blue' },
] as const;

type ColorName = (typeof COLORS)[number]['name'];

type ColorButtonsProps = {
  selectedColor: string;
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
