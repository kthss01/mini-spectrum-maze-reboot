import { ColorButtons } from './ColorButtons';
import { DirectionPad } from './DirectionPad';

type GameUIProps = {
  selectedColor: string;
  speed: number;
  angle: number;
  onSelectColor: (color: 'red' | 'yellow' | 'blue') => void;
  onRotate: (dir: number) => void;
  onSpeedChange: (value: number) => void;
  onAngleChange: (value: number) => void;
};

export function GameUI({
  selectedColor,
  speed,
  angle,
  onSelectColor,
  onRotate,
  onSpeedChange,
  onAngleChange,
}: GameUIProps) {
  return (
    <div className="ui-panel">
      <div>
        <b>조작</b>: 색(red/yellow/blue) 선택 → 전진 / 화살표 버튼 또는 WASD → 방향 회전 / 1·2·3 키: 색 선택 / R 키: 다시 시작
      </div>
      <div>목표: Start(흰색) → Goal(회색)</div>

      <ColorButtons selectedColor={selectedColor} onSelectColor={onSelectColor} />
      <DirectionPad onRotate={onRotate} />

      <div className="slider-group">
        <label htmlFor="speedSlider">Speed:</label>
        <input
          type="range"
          id="speedSlider"
          min="0.2"
          max="2.0"
          step="0.1"
          value={speed}
          onChange={(event) => onSpeedChange(parseFloat(event.target.value))}
        />
      </div>

      <div className="slider-group">
        <label htmlFor="angleSlider">View Angle:</label>
        <input
          type="range"
          id="angleSlider"
          min="10"
          max="180"
          step="5"
          value={angle}
          onChange={(event) => onAngleChange(parseFloat(event.target.value))}
        />
      </div>
    </div>
  );
}
