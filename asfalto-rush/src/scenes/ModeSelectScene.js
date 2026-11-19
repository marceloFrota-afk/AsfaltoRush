// =============================================================
// ModeSelectScene — estado MODE_SELECT. Três cartões de modo.
// ◀ ▶ escolhe, ENTER inicia, ESC volta.
// =============================================================
import { SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS } from '../config/gameConfig.js';
import { MODES, MODE_ORDER } from '../config/modes.js';
import { InputManager } from '../systems/InputManager.js';
import { StorageManager } from '../systems/StorageManager.js';
import { SFXManager } from '../systems/AudioManager.js';
import { pixelText, panel, footerHint, prepareCamera } from '../ui/UIFactory.js';
import { firstFrame } from '../art/textureUtils.js';

const CARD_W = 184;
const CARD_H = 196;

export class ModeSelectScene extends Phaser.Scene {
  constructor() { super(SCENES.MODE_SELECT); }

  init(data) {
    this.index = Math.max(0, MODE_ORDER.indexOf(this.registry.get('lastMode') || 'endless'));
    this.infoMode = !!(data && data.info);
  }

  create() {
    this.registry.set('state', GAME_STATE.MODE_SELECT);
    prepareCamera(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14121f);
    this._stripes();

    pixelText(this, GAME_WIDTH / 2, 30, this.infoMode ? 'MODOS DE JOGO' : 'ESCOLHA O MODO', { size: FONT.MEDIUM, color: UI_COLORS.ACCENT });

    this.cards = MODE_ORDER.map((id, i) => this._card(id, 116 + i * 204, 170));
    this.inputs = new InputManager(this);

    footerHint(this, '< > ESCOLHER   ENTER JOGAR   ESC VOLTAR');
    this.starting = false;
    this._highlight();
  }

  _stripes() {
    const g = this.add.graphics();
    g.fillStyle(0x1f1d33, 1);
    for (let i = -GAME_HEIGHT; i < GAME_WIDTH; i += 32) {
      g.fillTriangle(i, GAME_HEIGHT, i + 16, GAME_HEIGHT, i + GAME_HEIGHT + 16, 0);
      g.fillTriangle(i, GAME_HEIGHT, i + GAME_HEIGHT, 0, i + GAME_HEIGHT + 16, 0);
    }
    g.setAlpha(0.35);
  }

  _card(id, x, y) {
    const mode = MODES[id];
    const c = this.add.container(x, y);
    const g = panel(this, 0, 0, CARD_W, CARD_H, { border: mode.color });
    const title = pixelText(this, 0, -CARD_H / 2 + 22, mode.name, { color: UI_COLORS.TEXT, wrap: CARD_W - 16 });
    const iconKey = id === 'timeattack' ? 'clock_l' : id === 'escape' ? 'storm_edge' : 'truck';
    const icon = this.add.sprite(0, -42, iconKey, firstFrame(this, iconKey));
    icon.setScale(id === 'timeattack' ? 2 : id === 'escape' ? 0.9 : 0.8);
    const desc = pixelText(this, 0, 20, mode.description.join('\n'), { color: UI_COLORS.TEXT_DIM, stroke: false });
    desc.setLineSpacing(6);
    const rec = StorageManager.getRecord(id);
    const recT = pixelText(this, 0, CARD_H / 2 - 22, `RECORDE ${rec.score}\n${rec.distance} m`, { color: UI_COLORS.ACCENT, stroke: false });
    c.add([g, title, icon, desc, recT]);
    // setSize + setInteractive() padrão: área de clique = cartão inteiro
    c.setSize(CARD_W, CARD_H);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { const i = MODE_ORDER.indexOf(id); if (i !== this.index) { this.index = i; SFXManager.play('uiMove'); this._highlight(); } });
    c.on('pointerdown', () => { this.index = MODE_ORDER.indexOf(id); this._start(); });
    return c;
  }

  _highlight() {
    this.cards.forEach((c, i) => {
      const sel = i === this.index;
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: sel ? 1.06 : 0.94, alpha: sel ? 1 : 0.6, duration: 120 });
    });
  }

  _start() {
    if (this.starting) return;
    this.starting = true;
    SFXManager.play('ui');
    const mode = MODE_ORDER[this.index];
    this.registry.set('lastMode', mode);
    this.cameras.main.fadeOut(180, 11, 10, 20);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENES.GAME, { mode }));
  }

  update() {
    this.inputs.update();
    if (this.starting) return;
    const n = MODE_ORDER.length;
    if (this.inputs.justPressed('left') || this.inputs.justPressed('up')) {
      this.index = (this.index - 1 + n) % n; SFXManager.play('uiMove'); this._highlight();
    }
    if (this.inputs.justPressed('right') || this.inputs.justPressed('down')) {
      this.index = (this.index + 1) % n; SFXManager.play('uiMove'); this._highlight();
    }
    if (this.inputs.justPressed('confirm')) this._start();
    if (this.inputs.justPressed('back')) {
      SFXManager.play('ui');
      this.scene.start(SCENES.MENU);
    }
  }
}
