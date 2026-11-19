// =============================================================
// assets.js — chaves de textura e manifesto de assets externos.
//
// O jogo SEMPRE funciona sem arquivos: BootScene gera pixel art
// procedural para qualquer chave que não tenha sido carregada.
//
// Para trocar por sprites definitivos:
//   1. Coloque o PNG em assets/sprites/
//   2. Adicione uma entrada em EXTERNAL_ASSETS com a MESMA key
//   3. Respeite o tamanho de frame e a ordem dos frames indicados
// Nenhuma mecânica precisa ser alterada.
// =============================================================

export const TEX = {
  TRUCK: 'truck',            // spritesheet 28x60, frames: 0-1 dirigindo, 2 pulo, 3-4 dash, 5 batida, 6 destruído
  TRUCK_SHADOW: 'truck_shadow',
  SHIELD: 'shield_bubble',
  HOLE_S: 'hole_s', HOLE_M: 'hole_m', HOLE_L: 'hole_l',
  CONE: 'cone', TIRE: 'tire', ROCK: 'rock', BOX: 'box', SIGN: 'sign',
  BARRIER: 'barrier', LOG: 'log', FALLEN_TREE: 'fallen_tree',
  CAPYBARA: 'capybara',      // spritesheet 2 frames (andando)
  TREE_ROUND: 'tree_round', TREE_PINE: 'tree_pine', BUSH: 'bush',
  FLOWERS: 'flowers', TUFT: 'tuft', STONE: 'stone', KM_POST: 'km_post',
  ASPHALT: 'asphalt', GRASS: 'grass', GRAVEL: 'gravel',
  LANE_DASH: 'lane_dash', EDGE_LINE: 'edge_line',
  GEAR: 'gear',              // spritesheet 2 frames (girando)
  CLOCK_S: 'clock_s', CLOCK_L: 'clock_l',
  PU_SHIELD: 'pu_shield', PU_BOOST: 'pu_boost', PU_REPAIR: 'pu_repair',
  PU_DASH: 'pu_dash', PU_MAGNET: 'pu_magnet',
  PX: 'px', SPARK: 'spark', SMOKE: 'smoke', SPEEDLINE: 'speedline',
  STORM_EDGE: 'storm_edge', RAIN: 'rain',
  HEART: 'heart', HEART_EMPTY: 'heart_empty',
  ICON_DASH: 'icon_dash', ICON_JUMP: 'icon_jump',
  TOUCH_BTN: 'touch_btn'
};

// Texturas que recebem variante de ALTO CONTRASTE (sufixo _hc)
export const HIGH_CONTRAST_KEYS = [
  'hole_s', 'hole_m', 'hole_l', 'cone', 'tire', 'rock', 'box', 'sign',
  'barrier', 'log', 'fallen_tree', 'capybara'
];

// Manifesto de arquivos opcionais. Deixe vazio para usar só placeholders.
// Exemplos (descomente quando os arquivos existirem):
export const EXTERNAL_ASSETS = [
  // { type: 'spritesheet', key: 'truck', url: 'assets/sprites/truck.png', frameWidth: 28, frameHeight: 60 },
  // { type: 'image', key: 'cone', url: 'assets/sprites/cone.png' },
  // { type: 'spritesheet', key: 'capybara', url: 'assets/sprites/capybara.png', frameWidth: 32, frameHeight: 20 },
  // { type: 'image', key: 'asphalt', url: 'assets/sprites/asphalt.png' },
];
