import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import type { Direction, TileColor } from './types/game';
import { GameUI } from './components/GameUI';
import { Toast } from './components/Toast';

function App() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [cleared, setCleared] = useState(false);
  const [selectedColor, setSelectedColor] = useState<TileColor>('red');
  const [speed, setSpeed] = useState(1);
  const [angle, setAngle] = useState(60);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const engine = new GameEngine({
      canvasHost: canvasHostRef.current,
      selectedColor,
      speed,
      angle,
      onClearedChange: setCleared,
      onSelectedColorChange: setSelectedColor,
    });

    engine.init();
    engineRef.current = engine;

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectColor = (color: TileColor) => {
    engineRef.current?.selectColor(color);
  };

  const handleRotate = (dir: Direction) => {
    engineRef.current?.setDirection(dir);
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    engineRef.current?.setSpeedMultiplier(value);
  };

  const handleAngleChange = (value: number) => {
    setAngle(value);
    engineRef.current?.setViewAngle(value);
  };

  return (
    <div className="app-shell">
      <div ref={canvasHostRef} className="canvas-host" />

      <GameUI
        selectedColor={selectedColor}
        speed={speed}
        angle={angle}
        onSelectColor={handleSelectColor}
        onRotate={handleRotate}
        onSpeedChange={handleSpeedChange}
        onAngleChange={handleAngleChange}
      />

      <Toast cleared={cleared} />
    </div>
  );
}

export default App;
