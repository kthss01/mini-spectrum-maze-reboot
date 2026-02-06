import { createGame } from './game.js';

type MountOptions = {
  canvasHost: HTMLElement;
};

export function mountGame({ canvasHost }: MountOptions) {
  return createGame({ canvasHost });
}
