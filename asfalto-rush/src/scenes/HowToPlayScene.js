// =============================================================
// HowToPlayScene — controles e objetivo, com ícones do jogo.
// =============================================================
import { SCENES, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS } from '../config/gameConfig.js';
import { InputManager } from '../systems/InputManager.js';
import { SFXManager } from '../systems/AudioManager.js';
import { pixelText, panel, footerHint, prepareCamera } from '../ui/UIFactory.js';
import { firstFrame } from '../art/textureUtils.js';

export class HowToPlayScene extends Phaser.Scene {
  constructor() { super(SCENES.HOW_TO); }

  create() {
    prepareCamera(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14121f);
    panel(this, cx, 180, 560, 300);
    pixelText(this, cx, 22, 'COMO JOGAR', { size: FONT.MEDIUM, color: UI_COLORS.ACCENT });

    const controls = [
      ['SETAS / WASD', 'MOVER'],
      ['ESPAÇO', 'PULAR'],
      ['SHIFT', 'DASH'],
      ['ESC', 'PAUSA'],
      ['ENTER', 'SELECIONAR / REINICIAR']
    ];
    controls.forEach(([k, v], i) => {
      const y = 56 + i * 20;
      pixelText(this, cx - 30, y, k, { origin: 0, color: UI_COLORS.ACCENT, stroke: false }).setOrigin(1, 0.5);
      pixelText(this, cx - 10, y, '= ' + v, { origin: 0, color: UI_COLORS.TEXT, stroke: false }).setOrigin(0, 0.5);
    });

    pixelText(this, cx, 166,
      'OBJETIVO: Desvie dos obstáculos, percorra a maior\ndistância possível e consiga a maior pontuação.',
      { color: UI_COLORS.TEXT, stroke: false });

    // legenda visual
    const legend = [
      ['hole_m', 'BURACO: PULE'],
      ['cone', 'PEQUENO: PULÁVEL'],
      ['barrier', 'BARREIRA: DESVIE'],
      ['gear', 'ENGRENAGEM: PONTOS'],
      ['pu_shield', 'POWER-UP']
    ];
    legend.forEach(([key, label], i) => {
      const x = cx - 220 + i * 110;
      this.add.image(x, 214, key, firstFrame(this, key)).setScale(key === 'barrier' ? 0.8 : 1.2);
      pixelText(this, x, 240, label.replace(': ', ':\n'), { color: UI_COLORS.TEXT_DIM, stroke: false });
    });
    pixelText(this, cx, 290, 'Buracos só machucam se o caminhão estiver no chão.\nDesvios seguidos aumentam o COMBO (x2, x3, x4...).',
      { color: UI_COLORS.INFO, stroke: false });

    this.inputs = new InputManager(this);
    footerHint(this, 'ENTER / ESC  VOLTAR');
    this.input.once('pointerdown', () => this._back());
  }

  _back() {
    SFXManager.play('ui');
    this.scene.start(SCENES.MENU);
  }

  update() {
    this.inputs.update();
    if (this.inputs.justPressed('back') || this.inputs.justPressed('confirm')) this._back();
  }
}
