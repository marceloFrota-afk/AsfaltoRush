// =============================================================
// gameConfig.js — constantes globais (resolução, layout, cores,
// chaves de armazenamento, fontes, profundidades de desenho).
// Valores de BALANCEAMENTO ficam em balance.js.
// =============================================================

export const GAME_TITLE = 'ASFALTO RUSH';
export const GAME_VERSION = '1.1';

// Resolução lógica (pixel art). O Phaser escala com FIT mantendo proporção.
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

// Cada "pixel de arte" vira PX x PX pixels de tela nas texturas geradas.
export const ART_PX = 2;

// Geometria da rodovia (em pixels de tela)
export const ROAD = {
  X: 160,              // borda esquerda do asfalto
  WIDTH: 320,          // largura do asfalto
  LANES: 5,            // número de faixas
  SHOULDER: 10,        // acostamento (cascalho) de cada lado
  EDGE_MARGIN: 4       // folga entre caminhão e a linha de borda
};
ROAD.LANE_WIDTH = ROAD.WIDTH / ROAD.LANES;   // 64
ROAD.RIGHT = ROAD.X + ROAD.WIDTH;             // 480

export const laneCenter = (lane) => ROAD.X + ROAD.LANE_WIDTH * (lane + 0.5);

// Linha onde novas fileiras de obstáculos nascem (acima da tela)
export const SPAWN_Y = -70;
// Abaixo disso objetos são reciclados
export const DESPAWN_Y = GAME_HEIGHT + 90;

export const PIXELS_PER_METER = 10;

// Ordem de desenho
export const DEPTH = {
  GRASS: 0,
  ROAD: 1,
  ROAD_MARKS: 2,
  DECAL: 3,
  HOLE: 4,
  SHADOW: 5,
  OBSTACLE: 6,
  PICKUP: 7,
  TRUCK_SHADOW: 8,
  TRAIL: 9,
  TRUCK: 10,
  TRUCK_AIR: 20,
  TREE: 22,
  SPEEDLINES: 25,
  PARTICLES: 30,
  FLOATING_TEXT: 35,
  THREAT: 40,
  TOUCH_UI: 60
};

export const FONT = {
  FAMILY: '"Press Start 2P", "Courier New", monospace',
  SMALL: '8px',
  MEDIUM: '16px',
  LARGE: '24px',
  HUGE: '32px'
};

// Paleta da interface (pixel art moderna)
export const UI_COLORS = {
  BG: 0x14121f,
  PANEL: 0x1f1d33,
  PANEL_BORDER: 0xf7c548,
  TEXT: '#f4f4f4',
  TEXT_DIM: '#9aa0b8',
  ACCENT: '#f7c548',
  ACCENT_HEX: 0xf7c548,
  DANGER: '#ff5a5a',
  GOOD: '#6ee7a0',
  INFO: '#6cc7ff',
  COMBO: ['#f4f4f4', '#9be7ff', '#6ee7a0', '#f7c548', '#ff9a3c', '#ff5a8a']
};

// Chaves usadas no localStorage
export const STORAGE_KEYS = {
  SETTINGS: 'asfaltoRush.settings.v1',
  RECORDS: 'asfaltoRush.records.v1',
  WALLET: 'asfaltoRush.wallet.v1',
  RANKING: 'asfaltoRush.ranking.endless.v1',
  PLAYER_NAME: 'asfaltoRush.playerName.v1'
};

// Estados globais do jogo (registrados no registry do Phaser)
export const GAME_STATE = {
  BOOT: 'BOOT',
  MENU: 'MENU',
  MODE_SELECT: 'MODE_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

export const SCENES = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  MODE_SELECT: 'ModeSelectScene',
  HOW_TO: 'HowToPlayScene',
  SETTINGS: 'SettingsScene',
  CREDITS: 'CreditsScene',
  GAME: 'GameScene',
  HUD: 'HUDScene',
  PAUSE: 'PauseScene',
  GAME_OVER: 'GameOverScene'
};

// Mapeamento padrão de teclas. Nomes = Phaser.Input.Keyboard.KeyCodes.
// Pode ser sobrescrito por settings.keyBindings (remapeamento futuro).
export const DEFAULT_KEY_BINDINGS = {
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  jump: ['SPACE'],
  dash: ['SHIFT'],
  pause: ['ESC', 'P'],
  confirm: ['ENTER', 'SPACE'],
  back: ['ESC', 'BACKSPACE']
};

// Mapeamento padrão de gamepad (layout "standard" do navegador).
// 0=A/Cruz 1=B/Círculo 2=X/Quadrado 3=Y/Triângulo 4=LB/L1 5=RB/R1
// 6=LT/L2 7=RT/R2 9=Start/Options 12..15 = D-pad
export const DEFAULT_PAD_BINDINGS = {
  jump: [0],
  dash: [5, 7, 2, 3],
  pause: [8, 9],
  confirm: [0, 9],
  back: [1, 8],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  stickDeadzone: 0.25
};

// Ordem bruta DragonRise 0079:0006: 0=Triângulo, 1=Círculo, 2=Cruz, 3=Quadrado.
export const DRAGONRISE_PAD_BINDINGS = {
  ...DEFAULT_PAD_BINDINGS,
  dash: [5, 3, 7],
  pause: [9],
  confirm: [2],
  back: [1]
};
