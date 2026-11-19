// =============================================================
// ArtCanvas.js — grade de pixels independente do Phaser.
// Usada para desenhar a pixel art ORIGINAL do jogo em código
// (placeholders "bonitos"). Pode ser testada no Node.
// =============================================================

export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ArtCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Array(w * h).fill(null);
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y) { return this.inBounds(x, y) ? this.data[y * this.w + x] : null; }

  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (this.inBounds(x, y)) this.data[y * this.w + x] = c;
    return this;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  // Elipse preenchida; colorFn(nx, ny) recebe coordenadas normalizadas (-1..1)
  ellipse(cx, cy, rx, ry, colorOrFn) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d <= 1) {
          const c = typeof colorOrFn === 'function' ? colorOrFn(nx, ny, d) : colorOrFn;
          if (c) this.px(x, y, c);
        }
      }
    }
    return this;
  }

  // Desenha um mapa de strings. palette: { char: '#rrggbb' }, '.' = transparente
  map(rows, palette, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c) this.px(ox + x, oy + y, c);
      }
    });
    return this;
  }

  // Contorno de 1 px em volta dos pixels opacos (borda externa)
  outline(color, onlyTransparent = true) {
    const copy = this.data.slice();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (onlyTransparent && copy[y * this.w + x]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const xx = x + dx, yy = y + dy;
          return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && copy[yy * this.w + xx];
        });
        if (n) this.data[y * this.w + x] = color;
      }
    }
    return this;
  }

  // Retorna nova grade com margem extra
  padded(p) {
    const out = new ArtCanvas(this.w + p * 2, this.h + p * 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      out.data[(y + p) * out.w + (x + p)] = this.data[y * this.w + x];
    }
    return out;
  }

  clone() {
    const c = new ArtCanvas(this.w, this.h);
    c.data = this.data.slice();
    return c;
  }

  // Troca cores via função (para variantes: batida, destruído, skins)
  recolor(fn) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i]) this.data[i] = fn(this.data[i]);
    }
    return this;
  }

  countOpaque() { return this.data.reduce((n, c) => n + (c ? 1 : 0), 0); }
}

// Utilitários de cor
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function shade(hex, f) {
  if (!hex || !hex.startsWith('#')) return hex;
  const [r, g, b] = hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
