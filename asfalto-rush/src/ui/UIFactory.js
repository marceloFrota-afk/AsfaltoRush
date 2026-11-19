// =============================================================
// UIFactory.js — helpers de interface em estilo pixel art
// (textos, painéis com borda, fundo animado).
// =============================================================
import { FONT, UI_COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

export function pixelText(scene, x, y, text, { size = FONT.SMALL, color = UI_COLORS.TEXT, align = 'center',
  origin = 0.5, stroke = true, wrap = 0 } = {}) {
  const style = {
    fontFamily: FONT.FAMILY,
    fontSize: size,
    color,
    align,
    lineSpacing: 6
  };
  if (stroke) { style.stroke = '#14121f'; style.strokeThickness = 4; }
  if (wrap) style.wordWrap = { width: wrap };
  return scene.add.text(Math.round(x), Math.round(y), text, style).setOrigin(origin);
}

export function panel(scene, x, y, w, h, { fill = UI_COLORS.PANEL, border = UI_COLORS.PANEL_BORDER, alpha = 0.92 } = {}) {
  const g = scene.add.graphics();
  const L = Math.round(x - w / 2), T = Math.round(y - h / 2);
  g.fillStyle(0x000000, 0.35).fillRect(L + 4, T + 4, w, h);           // sombra
  g.fillStyle(fill, alpha).fillRect(L, T, w, h);
  g.lineStyle(2, border, 1).strokeRect(L + 1, T + 1, w - 2, h - 2);
  g.fillStyle(border, 1);                                               // cantos "pixelados"
  [[L, T], [L + w - 4, T], [L, T + h - 4], [L + w - 4, T + h - 4]].forEach(([cx, cy]) => g.fillRect(cx, cy, 4, 4));
  return g;
}

export function dimBackground(scene, alpha = 0.6) {
  return scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0a14, alpha);
}

// Rodapé com dica de controles
export function footerHint(scene, text) {
  return pixelText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 14, text, { color: UI_COLORS.TEXT_DIM, stroke: false });
}

// Reseta efeitos de câmera (fade/shake de cenas anteriores) e faz fade-in
export function prepareCamera(scene, fadeMs = 200) {
  const cam = scene.cameras.main;
  cam.resetFX();
  cam.setScroll(0, 0);
  if (fadeMs > 0) cam.fadeIn(fadeMs, 11, 10, 20);
  return cam;
}
