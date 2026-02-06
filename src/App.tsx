import { useEffect, useRef } from 'react';
import { mountGame } from './gameAdapter';

function App() {
  const canvasHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const game = mountGame({ canvasHost: canvasHostRef.current });
    return () => game?.destroy?.();
  }, []);

  return (
    <div className="app-shell">
      <div ref={canvasHostRef} className="canvas-host" />

      <div id="ui">
        <div>
          <b>조작</b>: 색(red/yellow/blue) 선택 → 전진 / 화살표 버튼 또는 WASD → 방향 회전 / 1·2·3 키: 색 선택 / R 키: 다시 시작
        </div>
        <div>목표: Start(흰색) → Goal(회색)</div>

        <div id="color-buttons">
          <button className="color-btn" data-color="red" />
          <button className="color-btn" data-color="yellow" />
          <button className="color-btn" data-color="blue" />
        </div>

        <div id="direction-buttons">
          <button className="arrow-btn dir-north" data-dir="0"><span>▲</span></button>
          <button className="arrow-btn dir-east" data-dir="1"><span>▲</span></button>
          <button className="arrow-btn dir-south" data-dir="2"><span>▲</span></button>
          <button className="arrow-btn dir-west" data-dir="3"><span>▲</span></button>
        </div>

        <div id="speedContainer">
          <label htmlFor="speedSlider">Speed:</label>
          <input type="range" id="speedSlider" min="0.2" max="2.0" step="0.1" defaultValue="1" />
        </div>

        <div id="angleContainer">
          <label htmlFor="angleSlider">View Angle:</label>
          <input type="range" id="angleSlider" min="10" max="180" step="5" defaultValue="60" />
        </div>
      </div>

      <div id="toast">CLEAR!</div>
    </div>
  );
}

export default App;
