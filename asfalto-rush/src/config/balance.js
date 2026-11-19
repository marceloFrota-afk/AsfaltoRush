// =============================================================
// balance.js — TODOS os números de balanceamento do jogo.
// Ajuste aqui sem tocar na lógica. Velocidades em px/s,
// tempos em segundos, distâncias em pixels de tela.
// =============================================================

// ---------------- Caminhão ----------------
export const TRUCK = {
  HITBOX_W: 20,              // hitbox justa (sprite tem 28 px de largura)
  HITBOX_H: 44,              // sprite tem ~52 px de corpo
  HOME_Y: 285,               // posição vertical inicial
  MIN_Y: 190,                // limite superior (W)
  MAX_Y: 318,                // limite inferior (S)

  LATERAL_MAX: 270,          // velocidade lateral máxima
  LATERAL_ACCEL: 2100,       // aceleração lateral (responsivo)
  LATERAL_DECEL: 3000,       // desaceleração ao soltar (pequena inércia, ~12 px)
  VERTICAL_MAX: 150,
  VERTICAL_ACCEL: 1100,
  VERTICAL_DECEL: 1300,

  THROTTLE_UP: 1.15,         // W = acelera um pouco
  THROTTLE_DOWN: 0.82,       // S = freia um pouco
  SPEED_ACCEL: 260,          // aceleração suave da velocidade de avanço
  SPEED_DECEL: 420,          // desaceleração (freio / pancada)

  TILT_MAX_DEG: 9            // inclinação visual nas curvas laterais
};

// ---------------- Pulo ----------------
export const JUMP = {
  PREP_DURATION: 0.07,       // preparação (agacha)
  AIR_DURATION: 0.6,         // tempo no ar
  HEIGHT: 22,                // altura visual máxima (px)
  SCALE_BONUS: 0.22,         // quanto o sprite "cresce" no ápice
  COOLDOWN: 0.3,             // após aterrissar
  LAND_SQUASH: 0.12
};

// ---------------- Dash ----------------
export const DASH = {
  DURATION: 0.22,
  COOLDOWN: 1.6,
  SPEED_MULT: 1.7,           // multiplicador da velocidade de avanço
  LATERAL_SPEED: 620,        // reposicionamento lateral rápido
  TRAIL_INTERVAL: 0.03,
  CAMERA_KICK: 6             // "tranco" leve da câmera (px)
};

// ---------------- Dano / vidas ----------------
export const DAMAGE = {
  START_LIVES: 3,
  MAX_LIVES: 5,
  INVULNERABLE_TIME: 1.1,
  STUN_TIME: 0.45,           // perda breve de velocidade após batida
  STUN_SPEED_MULT: 0.55,
  SEVERE_IS_FATAL: true      // colisão grave = game over (modo Estrada Infinita)
};

// ---------------- Velocidade global ----------------
export const SPEED = {
  BASE: 180,                 // TRUCK_SPEED inicial
  MAX: 470,                  // MAX_SPEED
  BOOST_MULT: 1.35
};

// ---------------- Dificuldade ----------------
// difficulty = tempo * TIME_WEIGHT + (metros / METERS_PER_UNIT) * DISTANCE_WEIGHT
// Multiplicado por RATE (DIFFICULTY_RATE). Unidade ≈ segundos.
export const DIFFICULTY = {
  RATE: 1.0,
  TIME_WEIGHT: 0.6,
  DISTANCE_WEIGHT: 0.4,
  METERS_PER_UNIT: 22,

  // Curva configurável. Valores numéricos são interpolados entre
  // keyframes; listas (pool) são acumulativas pelo keyframe atual.
  // rowTimeMin/Max = SEGUNDOS entre fileiras de obstáculos (gap em px = tempo * velocidade)
  CURVE: [
    { at: 0,   speed: 180, rowTimeMin: 1.70, rowTimeMax: 2.10, maxBlocked: 1, fill: 0.6,
      jumpRowChance: 0,    animalChance: 0,    pool: ['hole_s', 'cone'] },
    { at: 30,  speed: 235, rowTimeMin: 1.25, rowTimeMax: 1.55, maxBlocked: 2, fill: 0.7,
      jumpRowChance: 0,    animalChance: 0.04, pool: ['hole_m', 'rock', 'box', 'tire'] },
    { at: 60,  speed: 295, rowTimeMin: 1.00, rowTimeMax: 1.25, maxBlocked: 3, fill: 0.8,
      jumpRowChance: 0.10, animalChance: 0.06, pool: ['hole_l', 'barrier', 'sign', 'log'] },
    { at: 120, speed: 370, rowTimeMin: 0.85, rowTimeMax: 1.05, maxBlocked: 3, fill: 0.9,
      jumpRowChance: 0.14, animalChance: 0.07, pool: ['fallen_tree'] },
    { at: 210, speed: 430, rowTimeMin: 0.78, rowTimeMax: 0.95, maxBlocked: 4, fill: 1.0,
      jumpRowChance: 0.16, animalChance: 0.08, pool: [] },
    { at: 320, speed: 470, rowTimeMin: 0.72, rowTimeMax: 0.88, maxBlocked: 4, fill: 1.0,
      jumpRowChance: 0.18, animalChance: 0.08, pool: [] }
  ]
};

// ---------------- Geração procedural ----------------
export const SPAWN = {
  FIRST_ROW_DELAY_PX: 420,   // pista livre no início (px)
  REACH_SAFETY: 0.7,         // fração da velocidade lateral considerada "alcançável"
  ROW_CLEARANCE_PX: 80,      // hitbox do caminhão + maior obstáculo + folga (px)
  JUMP_ROW_MIN_INTERVAL: 3.2,// segundos mínimos entre fileiras de buraco total
  JUMP_ROW_LEAD_TIME: 0.95,  // tempo mínimo de leitura antes de uma fileira de pulo
  JUMP_ROW_EXIT_TIME: 1.15,  // tempo livre após fileira de pulo
  ANIMAL_EXIT_TIME: 1.0,
  LANE_JITTER: 6,            // deslocamento horizontal aleatório (fica na faixa)
  MAX_OBSTACLES: 48          // tamanho do pool
};

// ---------------- Tipos de obstáculo ----------------
// lanes: quantas faixas ocupa | jumpable: evitável com pulo
// severity: 'light' (-1 vida) | 'severe' (grave)
// hit: proporção da hitbox em relação ao sprite (colisão justa)
export const OBSTACLE_TYPES = {
  hole_s:      { texture: 'hole_s',      category: 'HOLE',     lanes: 1, jumpable: true,  severity: 'light',  hit: [0.7, 0.6] },
  hole_m:      { texture: 'hole_m',      category: 'HOLE',     lanes: 1, jumpable: true,  severity: 'light',  hit: [0.72, 0.6] },
  hole_l:      { texture: 'hole_l',      category: 'HOLE',     lanes: 1, jumpable: true,  severity: 'light',  hit: [0.9, 0.6] },
  cone:        { texture: 'cone',        category: 'OBSTACLE', lanes: 1, jumpable: true,  severity: 'light',  hit: [0.7, 0.7] },
  tire:        { texture: 'tire',        category: 'OBSTACLE', lanes: 1, jumpable: true,  severity: 'light',  hit: [0.75, 0.75] },
  rock:        { texture: 'rock',        category: 'OBSTACLE', lanes: 1, jumpable: false, severity: 'light',  hit: [0.75, 0.7] },
  box:         { texture: 'box',         category: 'OBSTACLE', lanes: 1, jumpable: false, severity: 'light',  hit: [0.8, 0.8] },
  sign:        { texture: 'sign',        category: 'OBSTACLE', lanes: 1, jumpable: false, severity: 'light',  hit: [0.7, 0.7] },
  barrier:     { texture: 'barrier',     category: 'OBSTACLE', lanes: 1, jumpable: false, severity: 'light',  hit: [0.88, 0.7] },
  log:         { texture: 'log',         category: 'OBSTACLE', lanes: 2, jumpable: true,  severity: 'light',  hit: [0.94, 0.55] },
  fallen_tree: { texture: 'fallen_tree', category: 'OBSTACLE', lanes: 3, jumpable: false, severity: 'severe', hit: [0.92, 0.6] },
  animal:      { texture: 'capybara',    category: 'OBSTACLE', lanes: 1, jumpable: false, severity: 'light',  hit: [0.75, 0.7],
                 anim: 'capy_walk', walkSpeed: 55 }
};

// Pesos de sorteio por tipo (quanto maior, mais frequente)
export const OBSTACLE_WEIGHTS = {
  hole_s: 3, hole_m: 3, hole_l: 2, cone: 3, tire: 2, rock: 2, box: 2,
  sign: 1.5, barrier: 2, log: 1.2, fallen_tree: 0.8, animal: 0
};

// ---------------- Pontuação ----------------
export const SCORE = {
  METERS_PER_POINT: 1,       // +1 ponto por metro
  POINTS_PER_SECOND: 2,      // bônus por tempo sobrevivido
  DODGE: 10,
  JUMP_HOLE: 20,
  GEAR: 15,
  POWERUP: 25,
  COMBO_STEP: 5,             // a cada N desvios seguidos, multiplicador +1
  COMBO_MAX_MULT: 8,
  TIME_BONUS_PER_SECOND: 25  // modo Contra o Tempo
};

// ---------------- Power-ups ----------------
export const POWERUPS = {
  MIN_INTERVAL: 11,          // segundos mínimos entre power-ups
  CHANCE_PER_ROW: 0.18,
  TYPES: {
    shield:     { texture: 'pu_shield', duration: 10, label: 'ESCUDO',  color: 0x6cc7ff, weight: 3 },
    boost:      { texture: 'pu_boost',  duration: 4,  label: 'BOOST',   color: 0xff9a3c, weight: 3 },
    repair:     { texture: 'pu_repair', duration: 0,  label: 'REPARO',  color: 0x6ee7a0, weight: 2, livesOnly: true },
    dash_reset: { texture: 'pu_dash',   duration: 0,  label: 'DASH!',   color: 0xb57bff, weight: 2 },
    magnet:     { texture: 'pu_magnet', duration: 8,  label: 'ÍMÃ',     color: 0xff5a8a, weight: 2 }
  },
  MAGNET_RADIUS: 130,
  MAGNET_PULL: 520
};

// ---------------- Coletáveis ----------------
export const COLLECTIBLES = {
  GEAR_LINE_CHANCE: 0.45,
  GEAR_LINE_MIN: 3,
  GEAR_LINE_MAX: 6,
  GEAR_SPACING: 26,
  MAX_ACTIVE: 40,
  TIME_PICKUP_INTERVAL: 6.5, // modo Contra o Tempo
  TIME_PICKUP_SMALL: 3,
  TIME_PICKUP_BIG: 5,
  TIME_PICKUP_BIG_CHANCE: 0.3
};

// ---------------- Modos ----------------
export const TIME_ATTACK = {
  START_TIME: 45,
  COLLISION_PENALTY: 3,
  SEVERE_PENALTY: 6,
  MAX_TIME: 99
};

export const ESCAPE = {
  START_GAP_M: 90,           // distância inicial da tempestade (m)
  MAX_GAP_M: 140,
  DANGER_GAP_M: 30,
  THREAT_FACTOR_START: 0.9,  // velocidade da tempestade relativa à base
  THREAT_FACTOR_END: 1.1,
  THREAT_RAMP_TIME: 180,
  STUN_TIME: 0.9,
  SEVERE_STUN_TIME: 1.6
};

// ---------------- Efeitos ----------------
export const FX = {
  MAX_PARTICLES: 120,
  SHAKE_HIT: 0.012,
  SHAKE_FATAL: 0.025,
  SHAKE_DURATION: 160,
  SPEEDLINE_THRESHOLD: 0.62  // fração de MAX_SPEED para mostrar linhas de velocidade
};
