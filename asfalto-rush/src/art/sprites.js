// =============================================================
// sprites.js — PIXEL ART ORIGINAL do Asfalto Rush, desenhada em
// código (mapas de caracteres + formas procedurais).
// Cada função retorna { frames: ArtCanvas[] }.
// Substituível por PNGs via config/assets.js.
// =============================================================
import { ArtCanvas, seededRandom, shade } from './ArtCanvas.js';

const K = '#1b1b2f'; // contorno padrão

// ---------------------------------------------------------------
// CAMINHÃO (vista de cima, frente para cima) 14x30
// ---------------------------------------------------------------
export const TRUCK_PALETTE = {
  k: K,
  r: '#e4343f', R: '#9e2335', h: '#ff7a6b',
  w: '#2c7fb8', W: '#9be7ff',
  y: '#ffd93d',
  c: '#e8ecf2', C: '#a7b2c4',
  g: '#5b6578',
  t: '#20222e', T: '#4a4f63',
  o: '#ff9a3c', O: '#fff275'
};

const TRUCK_BODY = [
  '..kkkkkkkkkk..',
  '.kykrrrrrrkyk.',
  '.krhhhhhhhhrk.',
  'tkrwwwwwwwwrkt',
  'tkrwWWwwwwwrkt',
  'tkrwwwwwwwwrkt',
  'gkrrrrrrrrrrkg',
  '.kRrrrrrrrrRk.',
  '.kRRRRRRRRRRk.',
  '..kkkkkkkkkk..',
  '....kggggk....',
  '.kkkkkkkkkkkk.',
  '.kcccccccccck.',
  'tkCCCCCCCCCCkt',
  'tkcccccccccckt',
  '.kccccrrcccck.',
  '.kcccrrrrccck.',
  '.kccrrccrrcck.',
  '.kcrrccccrrck.',
  '.kCCCCCCCCCCk.',
  '.kcccccccccck.',
  'tkCCCCCCCCCCkt',
  'tkcccccccccckt',
  'tkCCCCCCCCCCkt',
  '.kcccccccccck.',
  '.kkkkkkkkkkkk.'
];
const FLAME_A = ['....oOOOOo....', '.....oOOo.....', '......oo......', '..............'];
const FLAME_B = ['....oOOOOo....', '....oOOOOo....', '.....oOOo.....', '......oo......'];

function truckFrame(pal, { wheelPhase = 0, flame = null } = {}) {
  const a = new ArtCanvas(14, 30);
  const rows = TRUCK_BODY.map((row, y) =>
    row.replace(/t/g, ((y + wheelPhase) % 2 === 0) ? 't' : 'T'));
  a.map(rows, pal, 0, 0);
  if (flame) a.map(flame, pal, 0, 26);
  return a;
}

export function drawTruck(skinPalette = {}) {
  const pal = { ...TRUCK_PALETTE, ...skinPalette };
  const driveA = truckFrame(pal, { wheelPhase: 0 });
  const driveB = truckFrame(pal, { wheelPhase: 1 });
  const jump = truckFrame({ ...pal, y: '#ffffff', h: shade(pal.h, 1.15) }, { wheelPhase: 0 });
  const dashA = truckFrame(pal, { wheelPhase: 0, flame: FLAME_A });
  const dashB = truckFrame(pal, { wheelPhase: 1, flame: FLAME_B });
  const hit = driveA.clone().recolor((c) => (c === K ? '#ff4d4d' : '#ffffff'));
  const wreck = driveA.clone().recolor((c) => {
    if (c === K) return '#0d0d14';
    if (c === pal.w || c === pal.W) return '#1c1c24';
    return shade(c, 0.38);
  });
  // rachaduras no destruído
  [[4, 14], [5, 15], [6, 15], [7, 16], [9, 19], [8, 20], [3, 6], [10, 4]].forEach(([x, y]) => wreck.px(x, y, '#0d0d14'));
  return { frames: [driveA, driveB, jump, dashA, dashB, hit, wreck] };
}

export function drawTruckShadow() {
  const a = new ArtCanvas(16, 28);
  a.ellipse(8, 14, 7.5, 13.5, 'rgba(0,0,0,0.38)');
  return { frames: [a] };
}

export function drawShieldBubble() {
  const a = new ArtCanvas(22, 36);
  a.ellipse(11, 18, 10.5, 17.5, (nx, ny, d) => {
    if (d > 0.78) return 'rgba(108,199,255,0.85)';
    if (nx < -0.3 && ny < -0.4 && d > 0.5) return 'rgba(220,245,255,0.55)';
    return 'rgba(108,199,255,0.16)';
  });
  return { frames: [a] };
}

// ---------------------------------------------------------------
// BURACOS (procedurais)
// ---------------------------------------------------------------
function hole(w, h, seed) {
  const rnd = seededRandom(seed);
  const a = new ArtCanvas(w, h);
  const cx = w / 2, cy = h / 2;
  // borda irregular (asfalto quebrado)
  a.ellipse(cx, cy, w / 2, h / 2, (nx, ny, d) => {
    if (d > 0.72) return rnd() < 0.75 ? '#4b4f5e' : null;
    if (d > 0.5) return '#15151d';
    return ny < -0.1 ? '#0a0a10' : '#1d1b24';
  });
  // lascas / rachaduras
  for (let i = 0; i < 4; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    a.px(Math.round(cx + side * (w / 2 - 1)), Math.round(cy + (rnd() - 0.5) * h * 0.5), '#2a2c38');
  }
  // reflexo d'água no fundo
  a.px(Math.round(cx + 1), Math.round(cy + 1), '#3a5a7a');
  a.px(Math.round(cx + 2), Math.round(cy + 1), '#3a5a7a');
  return { frames: [a] };
}
export const drawHoleS = () => hole(14, 8, 11);
export const drawHoleM = () => hole(20, 10, 23);
export const drawHoleL = () => hole(26, 12, 37);

// ---------------------------------------------------------------
// OBSTÁCULOS
// ---------------------------------------------------------------
export function drawCone() {
  const a = new ArtCanvas(10, 10);
  a.map([
    '..kkkkkk..',
    '.kooooook.',
    'kooWWWWook',
    'koWooooWok',
    'koWoOOoWok',
    'koWoOOoWok',
    'koWooooWok',
    'kooWWWWook',
    '.kooooook.',
    '..kkkkkk..'
  ], { k: K, o: '#ff7b1c', O: '#ffc069', W: '#f4f4f4' });
  return { frames: [a] };
}

export function drawTire() {
  const a = new ArtCanvas(12, 12);
  a.ellipse(6, 6, 6, 6, (nx, ny, d) => {
    if (d < 0.18) return null;
    if (d < 0.3) return '#5b6578';
    if (d > 0.86) return K;
    return (Math.atan2(ny, nx) * 3) % 1 > 0.5 || (nx * ny > 0.1) ? '#2b2e3d' : '#3f4356';
  });
  return { frames: [a] };
}

export function drawRock() {
  const rnd = seededRandom(5);
  const a = new ArtCanvas(14, 11);
  a.ellipse(7, 6, 6.8, 5, (nx, ny, d) => {
    if (d > 0.82) return K;
    if (nx + ny < -0.6) return '#b8bccb';
    if (nx + ny > 0.5) return '#5f6476';
    return rnd() < 0.15 ? '#7d8296' : '#8d92a6';
  });
  a.px(5, 4, '#e0e3ee'); a.px(6, 4, '#e0e3ee');
  return { frames: [a] };
}

export function drawBox() {
  const a = new ArtCanvas(12, 12);
  a.rect(0, 0, 12, 12, K);
  a.rect(1, 1, 10, 10, '#a8692e');
  a.rect(2, 2, 8, 8, '#c98a43');
  for (let i = 0; i < 8; i++) { a.px(2 + i, 2 + i, '#a8692e'); a.px(9 - i, 2 + i, '#a8692e'); }
  a.px(1, 1, '#e5b06a'); a.px(2, 1, '#e5b06a'); a.px(1, 2, '#e5b06a');
  return { frames: [a] };
}

export function drawSign() {
  const a = new ArtCanvas(14, 15);
  a.map([
    '......kk......',
    '.....kyyk.....',
    '....kyyyyk....',
    '...kyyKKyyk...',
    '..kyyyKKyyyk..',
    '.kyyyyKKyyyyk.',
    'kyyyyyKKyyyyyk',
    '.kyyyyyyyyyyk.',
    '..kyyyKKyyyk..',
    '...kyyKKyyk...',
    '....kyyyyk....',
    '.....kyyk.....',
    '......kk......',
    '..gg......ggg.',
    '...gg....gg...'
  ], { k: K, y: '#ffd93d', K: '#1b1b2f', g: '#8d92a6' });
  // rachadura (placa quebrada)
  [[3, 6], [4, 7], [5, 7], [6, 8]].forEach(([x, y]) => a.px(x, y, '#c79a1d'));
  return { frames: [a] };
}

export function drawBarrier() {
  const a = new ArtCanvas(28, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 28; x++) {
    let c = Math.floor((x + y) / 3) % 2 === 0 ? '#ff7b1c' : '#f4f4f4';
    if (y === 0 || y === 9 || x === 0 || x === 27) c = K;
    if ((x <= 2 || x >= 25) && y > 0 && y < 9) c = '#3f4356';
    a.px(x, y, c);
  }
  a.px(1, 1, '#ffd93d'); a.px(26, 1, '#ffd93d');
  return { frames: [a] };
}

export function drawLog() {
  const w = 56, h = 9;
  const a = new ArtCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 3; x < w - 3; x++) {
    let c = y < 2 ? '#a56b3a' : y > 6 ? '#5e3a1f' : '#7d4f2b';
    if ((x * 7 + y * 3) % 11 === 0) c = '#5e3a1f';
    a.px(x, y, c);
  }
  // extremidades (anéis)
  [3, w - 4].forEach((cx) => a.ellipse(cx + 0.5, 4.5, 3, 4.5, (nx, ny, d) =>
    d > 0.7 ? '#5e3a1f' : d > 0.35 ? '#e0b77d' : '#c99a5c'));
  // galhos
  a.rect(18, 0, 1, 1, '#5e3a1f'); a.rect(36, 8, 2, 1, '#5e3a1f');
  return { frames: [a.padded(1).outline(K)] };
}

export function drawFallenTree() {
  const w = 88, h = 22;
  const a = new ArtCanvas(w, h);
  const rnd = seededRandom(77);
  // tronco
  for (let y = 8; y < 15; y++) for (let x = 2; x < 60; x++) {
    let c = y < 10 ? '#a56b3a' : y > 13 ? '#5e3a1f' : '#7d4f2b';
    if ((x * 5 + y) % 9 === 0) c = '#5e3a1f';
    a.px(x, y, c);
  }
  a.ellipse(3, 11.5, 2.5, 3.5, (nx, ny, d) => (d > 0.5 ? '#5e3a1f' : '#e0b77d'));
  // galhos
  [[44, 6], [48, 5], [52, 16], [56, 17]].forEach(([x, y]) => a.rect(x, y, 4, 2, '#7d4f2b'));
  // copa (folhas)
  a.ellipse(72, 11, 15.5, 10.5, (nx, ny, d) => {
    if (d > 0.9 && rnd() < 0.4) return null;
    if (nx + ny < -0.5) return '#7ccf5a';
    if (nx + ny > 0.6) return '#2f6b2f';
    return rnd() < 0.22 ? '#3f8a3a' : '#52a843';
  });
  a.ellipse(62, 6, 6, 4.5, (nx, ny) => (ny < 0 ? '#7ccf5a' : '#52a843'));
  a.ellipse(64, 17, 6, 4, (nx, ny) => (ny < 0 ? '#52a843' : '#2f6b2f'));
  return { frames: [a.padded(1).outline(K)] };
}

const CAPY_PAL = { k: K, b: '#a86d3f', B: '#7b4b28', K: '#1b1b2f', n: '#3a2414' };
export function drawCapybara() {
  const body = [
    '..kkkkkkkk......',
    '.kbbbbbbbbkkkk..',
    'kbbBbbbbbbbbbbk.',
    'kbbbbbbbbbbbbKbk',
    'kbbbbbbbbbbbbbnk',
    'kBbbbbbbbbbbbbk.',
    '.kBBBBBBBBBBBk..'
  ];
  const legsA = ['..kbk.kbk.kbk...', '..kk...kk..kk...'];
  const legsB = ['...kbk..kbk.kbk.', '...kk...kk...kk.'];
  const f1 = new ArtCanvas(16, 10).map(body, CAPY_PAL).map(legsA, CAPY_PAL, 0, 7);
  const f2 = new ArtCanvas(16, 10).map(body, CAPY_PAL).map(legsB, CAPY_PAL, 0, 7);
  return { frames: [f1, f2] };
}

// ---------------------------------------------------------------
// CENÁRIO
// ---------------------------------------------------------------
export function drawTreeRound() {
  const rnd = seededRandom(3);
  const a = new ArtCanvas(26, 26);
  a.ellipse(15, 16, 10, 9, 'rgba(0,0,0,0.28)'); // sombra
  a.ellipse(12, 12, 11.5, 11.5, (nx, ny, d) => {
    if (d > 0.92) return '#1f4a24';
    if (nx + ny < -0.7) return '#8fdc68';
    if (nx + ny < -0.2) return rnd() < 0.3 ? '#8fdc68' : '#5fb64a';
    if (nx + ny > 0.7) return '#2a6430';
    return rnd() < 0.25 ? '#2f7a36' : '#43933f';
  });
  // tufos
  [[6, 7], [15, 5], [9, 15], [17, 13]].forEach(([x, y]) => a.ellipse(x, y, 2.5, 2.5, '#6cc455'));
  return { frames: [a] };
}

export function drawTreePine() {
  const a = new ArtCanvas(22, 22);
  a.ellipse(13, 13, 8, 8, 'rgba(0,0,0,0.28)');
  for (let ring = 0; ring < 3; ring++) {
    const r = 10 - ring * 3;
    const col = ['#1f5a3a', '#2c7a4c', '#3f9b5f'][ring];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + ring * 0.4;
      a.ellipse(11 + Math.cos(ang) * r * 0.55, 11 + Math.sin(ang) * r * 0.55, r * 0.5, r * 0.5, col);
    }
  }
  a.ellipse(11, 11, 2, 2, '#6cc77f');
  return { frames: [a.outline('#123622')] };
}

export function drawBush() {
  const a = new ArtCanvas(12, 9);
  a.ellipse(4, 5, 4, 3.5, (nx, ny) => (ny < -0.2 ? '#6cc455' : '#3f8a3a'));
  a.ellipse(8, 4.5, 4, 4, (nx, ny) => (ny < -0.2 ? '#7ccf5a' : '#43933f'));
  a.px(3, 3, '#ff5a8a'); a.px(8, 2, '#ffd93d');
  return { frames: [a] };
}

export function drawFlowers() {
  const a = new ArtCanvas(7, 5);
  [[1, 1, '#ffd93d'], [4, 0, '#f4f4f4'], [5, 3, '#ff5a8a'], [2, 4, '#b57bff']].forEach(([x, y, c]) => a.px(x, y, c));
  return { frames: [a] };
}

export function drawTuft() {
  const a = new ArtCanvas(6, 4);
  a.map(['.g..g.', 'g.gg.g', '.GGGG.', '..GG..'], { g: '#7ccf5a', G: '#3f8a3a' });
  return { frames: [a] };
}

export function drawStone() {
  const a = new ArtCanvas(5, 4);
  a.map(['.ll..', 'lllm.', 'mmmmm', '.mmm.'], { l: '#b8bccb', m: '#7d8296' });
  return { frames: [a] };
}

export function drawKmPost() {
  const a = new ArtCanvas(4, 9);
  a.map(['kkkk', 'krrk', 'kwwk', 'kwwk', 'kwwk', 'kwwk', 'kwwk', 'kkkk', '.gg.'],
    { k: K, r: '#e4343f', w: '#f4f4f4', g: 'rgba(0,0,0,0.3)' });
  return { frames: [a] };
}

// ---------------------------------------------------------------
// ESTRADA (tiles repetíveis)
// ---------------------------------------------------------------
export function drawAsphalt() {
  const rnd = seededRandom(9);
  const a = new ArtCanvas(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const r = rnd();
    a.px(x, y, r < 0.08 ? '#3a3d4a' : r < 0.16 ? '#2b2d37' : '#33353f');
  }
  // remendos e rachaduras sutis
  [[5, 6], [6, 7], [7, 7], [8, 8], [22, 20], [23, 21], [23, 22]].forEach(([x, y]) => a.px(x, y, '#26272f'));
  a.rect(18, 4, 5, 3, '#2e3039');
  return { frames: [a] };
}

export function drawGrass() {
  const rnd = seededRandom(21);
  const a = new ArtCanvas(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const r = rnd();
    a.px(x, y, r < 0.1 ? '#4c9a3f' : r < 0.2 ? '#3a7d34' : '#43893a');
  }
  for (let i = 0; i < 10; i++) a.px(Math.floor(rnd() * 32), Math.floor(rnd() * 32), '#5fb64a');
  return { frames: [a] };
}

export function drawGravel() {
  const rnd = seededRandom(31);
  const a = new ArtCanvas(5, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 5; x++) {
    const r = rnd();
    a.px(x, y, r < 0.3 ? '#8a7f6a' : r < 0.6 ? '#6f6656' : '#a39782');
  }
  return { frames: [a] };
}

export function drawLaneDash() {
  const a = new ArtCanvas(2, 24);
  a.rect(0, 0, 2, 12, '#e8e8e8');
  return { frames: [a] };
}

export function drawEdgeLine() {
  const a = new ArtCanvas(2, 8);
  a.rect(0, 0, 2, 8, '#f2d14b');
  return { frames: [a] };
}

// ---------------------------------------------------------------
// COLETÁVEIS E POWER-UPS
// ---------------------------------------------------------------
export function drawGear() {
  const mk = (diag) => {
    const a = new ArtCanvas(11, 11);
    const teeth = diag
      ? [[1, 1], [8, 1], [1, 8], [8, 8]]
      : [[4, 0], [4, 9], [0, 4], [9, 4]];
    teeth.forEach(([x, y]) => a.rect(x, y, 2, 2, '#c9921f'));
    a.ellipse(5.5, 5.5, 4, 4, (nx, ny, d) => (d < 0.2 ? '#5a3d0a' : nx + ny < -0.3 ? '#fff1a8' : '#f7c548'));
    return a.outline('#5a3d0a');
  };
  return { frames: [mk(false), mk(true)] };
}

function pickupBox(color, icon, iconPal = {}) {
  const a = new ArtCanvas(14, 14);
  a.rect(1, 0, 12, 14, K); a.rect(0, 1, 14, 12, K);
  a.rect(1, 1, 12, 12, color);
  a.rect(1, 1, 12, 1, shade(color, 1.35));
  a.rect(1, 12, 12, 1, shade(color, 0.6));
  a.map(icon, { w: '#ffffff', k: K, g: '#c0c6d6', ...iconPal }, 3, 3);
  return { frames: [a] };
}

const ICONS = {
  shield: ['.wwwwww.', 'wwwwwwww', 'wwwkkwww', 'wwwkkwww', '.wwwwww.', '.wwwwww.', '..wwww..', '...ww...'],
  boost: ['...ww...', '..wwww..', '.ww..ww.', 'w..ww..w', '..wwww..', '.ww..ww.', 'ww....ww', '........'],
  repair: ['...ww...', '...ww...', '...ww...', 'wwwwwwww', 'wwwwwwww', '...ww...', '...ww...', '...ww...'],
  dash: ['....ww..', '...ww...', '..ww....', '.wwwwww.', '....ww..', '...ww...', '..ww....', '.w......'],
  magnet: ['gg....gg', 'ww....ww', 'ww....ww', 'ww....ww', 'ww....ww', '.ww..ww.', '..wwww..', '........'],
  clock: ['..wwww..', '.wkkkkw.', 'wkkwkkkw', 'wkkwkkkw', 'wkkwwwkw', 'wkkkkkkw', '.wkkkkw.', '..wwww..']
};

export const drawPuShield = () => pickupBox('#2f8fd8', ICONS.shield);
export const drawPuBoost = () => pickupBox('#e8701c', ICONS.boost);
export const drawPuRepair = () => pickupBox('#2fa866', ICONS.repair);
export const drawPuDash = () => pickupBox('#8a4fd8', ICONS.dash);
export const drawPuMagnet = () => pickupBox('#d83a6a', ICONS.magnet);
export const drawClockS = () => pickupBox('#1fa6b8', ICONS.clock);
export const drawClockL = () => pickupBox('#d8a21f', ICONS.clock);

// ---------------------------------------------------------------
// PARTÍCULAS / EFEITOS / UI
// ---------------------------------------------------------------
export const drawPx = () => ({ frames: [new ArtCanvas(1, 1).px(0, 0, '#ffffff')] });
export const drawSpark = () => ({ frames: [new ArtCanvas(2, 2).rect(0, 0, 2, 2, '#ffffff')] });
export function drawSmoke() {
  const a = new ArtCanvas(5, 5);
  a.ellipse(2.5, 2.5, 2.5, 2.5, '#ffffff');
  return { frames: [a] };
}
export function drawSpeedline() {
  const a = new ArtCanvas(1, 16);
  for (let y = 0; y < 16; y++) a.px(0, y, `rgba(255,255,255,${(0.15 + 0.5 * (y / 16)).toFixed(2)})`);
  return { frames: [a] };
}
export function drawStormEdge() {
  const rnd = seededRandom(55);
  const a = new ArtCanvas(64, 24);
  for (let i = 0; i < 9; i++) {
    const cx = i * 8 + rnd() * 4;
    const r = 5 + rnd() * 5;
    a.ellipse(cx, 16, r, r * 0.8, (nx, ny) => (ny < -0.4 ? '#6b5a9e' : ny < 0.2 ? '#4a3d78' : '#2c2350'));
    a.ellipse(cx - 64, 16, r, r * 0.8, (nx, ny) => (ny < -0.4 ? '#6b5a9e' : '#4a3d78'));
  }
  a.rect(0, 20, 64, 4, '#2c2350');
  return { frames: [a] };
}
export function drawRain() {
  const a = new ArtCanvas(1, 5);
  a.rect(0, 0, 1, 5, 'rgba(170,200,255,0.7)');
  return { frames: [a] };
}
export function drawHeart(empty = false) {
  const a = new ArtCanvas(9, 8);
  const rows = ['.kk...kk.', 'krrk.krrk', 'krhrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'];
  a.map(rows, empty
    ? { k: '#5b6578', r: '#2b2d37', h: '#2b2d37' }
    : { k: K, r: '#ff4d5e', h: '#ffd0d5' });
  return { frames: [a] };
}
export const drawHeartEmpty = () => drawHeart(true);
export function drawIconDash() {
  const a = new ArtCanvas(8, 8);
  a.map(ICONS.dash, { w: '#ffffff' });
  return { frames: [a] };
}
export function drawIconJump() {
  const a = new ArtCanvas(8, 8);
  a.map(['...ww...', '..wwww..', '.wwwwww.', '...ww...', '...ww...', '........', '.wwwwww.', '........'], { w: '#ffffff' });
  return { frames: [a] };
}
export function drawTouchBtn() {
  const a = new ArtCanvas(24, 24);
  a.ellipse(12, 12, 12, 12, (nx, ny, d) => (d > 0.82 ? 'rgba(255,255,255,0.6)' : 'rgba(20,18,31,0.45)'));
  return { frames: [a] };
}

// Lista usada pela BootScene: chave -> função de desenho
export const ART_REGISTRY = {
  truck_shadow: drawTruckShadow,
  shield_bubble: drawShieldBubble,
  hole_s: drawHoleS, hole_m: drawHoleM, hole_l: drawHoleL,
  cone: drawCone, tire: drawTire, rock: drawRock, box: drawBox, sign: drawSign,
  barrier: drawBarrier, log: drawLog, fallen_tree: drawFallenTree, capybara: drawCapybara,
  tree_round: drawTreeRound, tree_pine: drawTreePine, bush: drawBush, flowers: drawFlowers,
  tuft: drawTuft, stone: drawStone, km_post: drawKmPost,
  asphalt: drawAsphalt, grass: drawGrass, gravel: drawGravel, lane_dash: drawLaneDash, edge_line: drawEdgeLine,
  gear: drawGear, clock_s: drawClockS, clock_l: drawClockL,
  pu_shield: drawPuShield, pu_boost: drawPuBoost, pu_repair: drawPuRepair, pu_dash: drawPuDash, pu_magnet: drawPuMagnet,
  px: drawPx, spark: drawSpark, smoke: drawSmoke, speedline: drawSpeedline, storm_edge: drawStormEdge, rain: drawRain,
  heart: drawHeart, heart_empty: drawHeartEmpty, icon_dash: drawIconDash, icon_jump: drawIconJump, touch_btn: drawTouchBtn
};
