import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CFG, COLOR_VALUES, PLAYER_COLORS } from '../config';
import { generateMaze, assignTileColors } from '../maze';
import { computeCameraSettings, createThreeCore } from '../camera';
import { createLevel } from '../level';
import { createPlayer } from '../player';
import { bindInput } from '../input';
import type { Direction, MazeMap, TileColor } from '../types/game';

type EngineOptions = {
  canvasHost: HTMLElement;
  selectedColor?: TileColor;
  speed?: number;
  angle?: number;
  onClearedChange?: (cleared: boolean) => void;
  onSelectedColorChange?: (color: TileColor) => void;
};

export class GameEngine {
  private readonly canvasHost: HTMLElement;
  private readonly onClearedChange?: (cleared: boolean) => void;
  private readonly onSelectedColorChange?: (color: TileColor) => void;

  private map: MazeMap = [];
  private level: ReturnType<typeof createLevel> | null = null;
  private player: ReturnType<typeof createPlayer> | null = null;
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private controls: OrbitControls | null = null;
  private destroyThreeCore: (() => void) | null = null;

  private cleanups: Array<() => void> = [];
  private rafId = 0;
  private clock = new THREE.Clock();

  private selectedColor: TileColor;
  private playerColor: TileColor | 'white' = 'white';
  private cleared = false;

  private readonly dirToDelta = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  private moveInterval = 0.6;
  private timeSinceLastMove = 0;
  private viewAngleDeg: number;

  private colorStart: THREE.Color | null = null;
  private colorTarget: THREE.Color | null = null;
  private colorAnimationStart: number | null = null;
  private readonly colorAnimationDuration = 0.4;

  private highlightMaterials: Record<string, THREE.MeshStandardMaterial> = {};
  private currentHighlightTile: THREE.Mesh | null = null;

  constructor({
    canvasHost,
    selectedColor = 'red',
    speed = 1,
    angle = 60,
    onClearedChange,
    onSelectedColorChange,
  }: EngineOptions) {
    this.canvasHost = canvasHost;
    this.selectedColor = selectedColor;
    this.viewAngleDeg = angle;
    this.onClearedChange = onClearedChange;
    this.onSelectedColorChange = onSelectedColorChange;
    this.setSpeedMultiplier(speed);
  }

  init() {
    const MAZE_WIDTH = 31;
    const MAZE_HEIGHT = 33;

    this.map = generateMaze(MAZE_WIDTH, MAZE_HEIGHT) as MazeMap;
    const colorMap = assignTileColors(this.map);

    const { startX, startY, goalX, goalY } = this.resolveStartGoal();
    colorMap[startY][startX] = 'white';
    colorMap[goalY][goalX] = 'gray';

    const { viewSize, radius } = computeCameraSettings(this.map);
    CFG.viewSize = viewSize;
    CFG.radius = radius;

    const threeCore = createThreeCore({ canvasHost: this.canvasHost });
    this.scene = threeCore.scene;
    this.renderer = threeCore.renderer;
    this.camera = threeCore.camera;
    this.destroyThreeCore = threeCore.destroy;

    this.level = createLevel(this.scene, this.map, colorMap);
    this.player = createPlayer(this.scene, this.level);

    this.player.mesh.material.color.set(PLAYER_COLORS.white);

    const light = new THREE.PointLight(0xffffff, 0.6, CFG.tile * 5);
    light.position.set(0, 1, 0);
    this.player.mesh.add(light);

    this.setInitialDirection(startX, startY);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 4;
    this.controls.update();

    this.registerWindowListeners();
    this.createHighlightMaterials();
    this.bindInputHandlers();

    this.updateVisibilityTargets();
    this.highlightAheadTile();
    this.setViewAngle(this.viewAngleDeg);
    this.selectColor(this.selectedColor);

    this.clock = new THREE.Clock();
    this.startLoop();
  }

  update(dt: number) {
    if (!this.player || !this.level || !this.controls) return;

    this.animatePlayerColor();

    const finishedMove = this.player.update(dt);
    if (finishedMove) {
      this.updateVisibilityTargets();
    }

    if (!this.cleared && !this.player.state.isMoving) {
      this.timeSinceLastMove += dt;
    }

    if (
      !this.player.state.isMoving &&
      !this.cleared &&
      this.playerColor === this.selectedColor &&
      ['red', 'yellow', 'blue'].includes(this.selectedColor)
    ) {
      if (this.timeSinceLastMove >= this.moveInterval) {
        const dirIdx = this.player.state.dir;
        const { dx, dy } = this.dirToDelta[dirIdx];
        const nx = this.player.state.gx + dx;
        const ny = this.player.state.gy + dy;

        if (this.level.canWalk(nx, ny)) {
          const tileColor = this.level.colorMap[ny][nx] || 'gray';
          if (tileColor === this.selectedColor || tileColor === 'gray') {
            const started = this.player.tryMove(dx, dy);
            if (started) {
              this.timeSinceLastMove = 0;
              this.updateVisibilityTargets();
            }
          }
        }
      }
    }

    for (const floor of this.level.floors) {
      const target = floor.userData.targetOpacity ?? 0;
      floor.material.opacity += (target - floor.material.opacity) * 0.1;
      floor.visible = floor.material.opacity > 0.03;
    }

    for (const pillar of this.level.pillars) {
      const target = pillar.userData.targetOpacity ?? 0;
      pillar.material.opacity += (target - pillar.material.opacity) * 0.1;
      pillar.visible = pillar.material.opacity > 0.03;
    }

    if (!this.cleared && this.map[this.player.state.gy][this.player.state.gx] === 3) {
      this.setCleared(true);
    }

    this.controls.target.copy(this.player.mesh.position);
    this.controls.update();
    this.highlightAheadTile();
  }

  dispose() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.clearHighlight();

    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    this.disposeHighlightMaterials();
    this.disposeSceneResources();

    this.destroyThreeCore?.();

    this.level = null;
    this.player = null;
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.destroyThreeCore = null;
  }

  setDirection(dir: Direction) {
    if (!this.player) return;
    this.player.setDirection(dir);
    this.updateVisibilityTargets();
    this.highlightAheadTile();
  }

  selectColor(color: TileColor) {
    if (!this.player) return;
    this.selectedColor = color;
    this.playerColor = color;
    this.onSelectedColorChange?.(color);

    this.colorStart = this.player.mesh.material.color.clone();
    this.colorTarget = new THREE.Color(PLAYER_COLORS[color]);
    this.colorAnimationStart = performance.now();
  }

  setSpeedMultiplier(speedMultiplier: number) {
    const baseMoveInterval = 0.6;
    const baseMoveDuration = 0.18;
    this.moveInterval = baseMoveInterval * speedMultiplier;
    CFG.moveDuration = baseMoveDuration * speedMultiplier;
  }

  setViewAngle(angleDeg: number) {
    this.viewAngleDeg = angleDeg;
    this.updateVisibilityTargets();
  }

  restart() {
    if (!this.player) return;
    this.setCleared(false);
    this.player.reset();
    this.selectColor('red');
    this.timeSinceLastMove = 0;
    this.updateVisibilityTargets();
    this.highlightAheadTile();
  }

  private setCleared(v: boolean) {
    this.cleared = v;
    this.onClearedChange?.(v);
  }

  private resolveStartGoal() {
    const MAZE_WIDTH = this.map[0].length;
    const MAZE_HEIGHT = this.map.length;
    let startX = 1;
    let startY = 1;
    let goalX = MAZE_WIDTH - 2;
    let goalY = MAZE_HEIGHT - 2;

    for (let y = 0; y < this.map.length; y += 1) {
      for (let x = 0; x < this.map[0].length; x += 1) {
        if (this.map[y][x] === 2) {
          startX = x;
          startY = y;
        } else if (this.map[y][x] === 3) {
          goalX = x;
          goalY = y;
        }
      }
    }

    return { startX, startY, goalX, goalY };
  }

  private setInitialDirection(startX: number, startY: number) {
    if (!this.player || !this.level) return;

    const dirs = [
      { dx: 1, dy: 0, dir: 1 },
      { dx: 0, dy: 1, dir: 2 },
      { dx: -1, dy: 0, dir: 3 },
      { dx: 0, dy: -1, dir: 0 },
    ];

    for (const { dx, dy, dir } of dirs) {
      if (this.level.canWalk(startX + dx, startY + dy)) {
        this.player.setDirection(dir);
        return;
      }
    }

    this.player.setDirection(0);
  }

  private registerWindowListeners() {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener('contextmenu', preventContextMenu);
    this.cleanups.push(() => window.removeEventListener('contextmenu', preventContextMenu));
  }

  private bindInputHandlers() {
    const unbindInput = bindInput({
      isLocked: () => this.cleared || Boolean(this.player?.state.isMoving),
      onRestart: () => this.restart(),
      onRotate: (dir) => this.setDirection(dir),
      onColorKey: (color) => this.selectColor(color),
    });

    this.cleanups.push(unbindInput);
  }

  private createHighlightMaterials() {
    this.highlightMaterials = {};
    for (const name in COLOR_VALUES) {
      const base = new THREE.Color(COLOR_VALUES[name]);
      const hl = base.clone().lerp(new THREE.Color(0xffffff), 0.4);
      this.highlightMaterials[name] = new THREE.MeshStandardMaterial({
        color: hl.getHex(),
        roughness: 0.4,
        metalness: 0,
        transparent: true,
        opacity: 1,
      });
    }
  }

  private disposeHighlightMaterials() {
    Object.values(this.highlightMaterials).forEach((material) => material.dispose());
    this.highlightMaterials = {};
  }

  private computeTargetVisibility() {
    if (!this.player) return () => true;

    const dirIdx = this.player.state.dir;
    const dirVec = new THREE.Vector2(this.dirToDelta[dirIdx].dx, this.dirToDelta[dirIdx].dy).normalize();
    const halfAngleRad = THREE.MathUtils.degToRad(this.viewAngleDeg / 2);
    const cosThreshold = Math.cos(halfAngleRad);

    return (obj: THREE.Object3D) => {
      const gx = obj.userData.gridX;
      const gy = obj.userData.gridY;
      if (gx === this.player?.state.gx && gy === this.player?.state.gy) return true;

      const to = new THREE.Vector2(gx - (this.player?.state.gx ?? 0), gy - (this.player?.state.gy ?? 0));
      if (to.lengthSq() === 0) return true;
      to.normalize();
      return dirVec.dot(to) >= cosThreshold;
    };
  }

  private updateVisibilityTargets() {
    if (!this.level) return;

    const isVisible = this.computeTargetVisibility();
    for (const floor of this.level.floors) {
      floor.userData.targetOpacity = isVisible(floor) ? 1 : 0;
    }
    for (const pillar of this.level.pillars) {
      pillar.userData.targetOpacity = isVisible(pillar) ? 1 : 0;
    }
  }

  private clearHighlight() {
    if (!this.currentHighlightTile) return;
    this.currentHighlightTile.material = this.currentHighlightTile.userData.originalMaterial;
    this.currentHighlightTile = null;
  }

  private highlightAheadTile() {
    if (!this.level || !this.player) return;

    this.clearHighlight();
    if (this.cleared) return;

    const dirIdx = this.player.state.dir;
    const { dx, dy } = this.dirToDelta[dirIdx];
    const nx = this.player.state.gx + dx;
    const ny = this.player.state.gy + dy;

    const tile = this.level.floors.find(
      (floor) => floor.userData.gridX === nx && floor.userData.gridY === ny,
    );

    if (tile) {
      const colorName = tile.userData.color;
      tile.material = this.highlightMaterials[colorName] || this.highlightMaterials.gray;
      this.currentHighlightTile = tile;
    }
  }

  private animatePlayerColor() {
    if (!this.player || this.colorAnimationStart === null || !this.colorStart || !this.colorTarget) return;

    const elapsed = performance.now() - this.colorAnimationStart;
    const t = Math.min(elapsed / (this.colorAnimationDuration * 1000), 1);
    this.player.mesh.material.color.copy(this.colorStart).lerp(this.colorTarget, t);

    if (t >= 1) {
      this.colorAnimationStart = null;
    }
  }

  private startLoop() {
    const frame = () => {
      this.rafId = requestAnimationFrame(frame);
      const dt = this.clock.getDelta();
      this.update(dt);
      if (this.scene && this.camera && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    frame();
  }

  private disposeSceneResources() {
    if (!this.scene) return;

    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else if (material) {
        material.dispose();
      }
    });
  }
}
