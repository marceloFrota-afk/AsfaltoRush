// =============================================================
// MenuList.js — lista de opções navegável por teclado, gamepad
// e mouse/toque. Itens podem ter valor ajustável (◀ ▶).
//
// item = { label: string | () => string, onSelect?(), onLeft?(), onRight?(), disabled? }
// =============================================================
import { FONT, UI_COLORS } from '../config/gameConfig.js';
import { pixelText } from './UIFactory.js';
import { SFXManager } from '../systems/AudioManager.js';

export class MenuList {
  constructor(scene, x, y, items, { spacing = 22, size = FONT.SMALL, inputs, onBack = null, startIndex = 0 } = {}) {
    this.scene = scene;
    this.items = items;
    this.inputs = inputs;
    this.onBack = onBack;
    this.index = Math.min(startIndex, items.length - 1);
    this.texts = items.map((it, i) => {
      const t = pixelText(scene, x, y + i * spacing, this._label(it), { size });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i, true));
      t.on('pointerdown', (pointer) => {
        this.select(i, false);
        // clique nas laterais de itens ajustáveis altera o valor
        if ((it.onLeft || it.onRight) && pointer) {
          const local = pointer.x - (t.x - t.width / 2);
          if (local < t.width * 0.3 && it.onLeft) { it.onLeft(); this._refresh(); SFXManager.play('uiMove'); return; }
          if (local > t.width * 0.7 && it.onRight) { it.onRight(); this._refresh(); SFXManager.play('uiMove'); return; }
        }
        this.activate();
      });
      return t;
    });
    this.cursor = pixelText(scene, 0, 0, '>', { size, color: UI_COLORS.ACCENT });
    this.cursorT = 0;
    this._refresh();
  }

  _label(it) { return typeof it.label === 'function' ? it.label() : it.label; }

  select(i, silent = false) {
    if (i === this.index) return;
    this.index = i;
    if (!silent) SFXManager.play('uiMove');
    this._refresh();
  }

  move(d) {
    const n = this.items.length;
    let i = this.index;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.items[i].disabled) break;
    }
    this.index = i;
    SFXManager.play('uiMove');
    this._refresh();
  }

  activate() {
    const it = this.items[this.index];
    if (!it || it.disabled) return;
    SFXManager.play('ui');
    if (it.onSelect) it.onSelect();
    else if (it.onRight) it.onRight();
    this._refresh();
  }

  _refresh() {
    this.texts.forEach((t, i) => {
      const it = this.items[i];
      t.setText(this._label(it));
      t.setColor(it.disabled ? UI_COLORS.TEXT_DIM : i === this.index ? UI_COLORS.ACCENT : UI_COLORS.TEXT);
    });
    const sel = this.texts[this.index];
    if (sel) this.cursor.setPosition(Math.round(sel.x - sel.width / 2 - 14), sel.y);
  }

  update(dt = 0.016) {
    const inp = this.inputs;
    if (inp) {
      if (inp.justPressed('up')) this.move(-1);
      if (inp.justPressed('down')) this.move(1);
      const it = this.items[this.index];
      if (it && inp.justPressed('left') && it.onLeft) { it.onLeft(); SFXManager.play('uiMove'); this._refresh(); }
      if (it && inp.justPressed('right') && it.onRight) { it.onRight(); SFXManager.play('uiMove'); this._refresh(); }
      if (inp.justPressed('confirm')) this.activate();
      else if (inp.justPressed('back') && this.onBack) { SFXManager.play('ui'); this.onBack(); }
    }
    // cursor pulsando
    this.cursorT += dt;
    const sel = this.texts[this.index];
    if (sel) this.cursor.x = Math.round(sel.x - sel.width / 2 - 14 + Math.sin(this.cursorT * 8) * 2);
  }

  refresh() { this._refresh(); }

  destroy() {
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
