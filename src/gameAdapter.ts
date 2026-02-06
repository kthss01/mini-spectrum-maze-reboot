import { createGame } from './game.js';

type MountOptions = {
  canvasHost: HTMLElement;
  selectedColor: 'red' | 'yellow' | 'blue';
  speed: number;
  angle: number;
  onClearedChange: (cleared: boolean) => void;
  onSelectedColorChange: (color: 'red' | 'yellow' | 'blue') => void;
};

export function mountGame(options: MountOptions) {
  return createGame(options);
}
