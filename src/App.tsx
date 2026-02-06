import { useEffect, useRef, useState } from 'react';
import { mountGame } from './gameAdapter';
import { GameUI } from './components/GameUI';
import { Toast } from './components/Toast';

function App() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof mountGame> | null>(null);

  const [cleared, setCleared] = useState(false);
  const [selectedColor, setSelectedColor] = useState<'red' | 'yellow' | 'blue'>('red');
  const [speed, setSpeed] = useState(1);
  const [angle, setAngle] = useState(60);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const game = mountGame({
      canvasHost: canvasHostRef.current,
      selectedColor,
      speed,
      angle,
      onClearedChange: setCleared,
      onSelectedColorChange: (color) => setSelectedColor(color),
    });

    gameRef.current = game;

    return () => {
      gameRef.current?.destroy?.();
      gameRef.current = null;
    };
  }, []);

  const handleSelectColor = (color: 'red' | 'yellow' | 'blue') => {
    gameRef.current?.selectColor(color);
  };

  const handleRotate = (dir: number) => {
    gameRef.current?.setDirection(dir);
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    gameRef.current?.setSpeedMultiplier(value);
  };

  const handleAngleChange = (value: number) => {
    setAngle(value);
    gameRef.current?.setViewAngle(value);
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
