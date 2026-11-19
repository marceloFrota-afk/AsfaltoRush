// =============================================================
// CreditsScene — créditos e aviso de originalidade.
// =============================================================
import { SCENES, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS, GAME_TITLE, GAME_VERSION } from '../config/gameConfig.js';
import { InputManager } from '../systems/InputManager.js';
import { SFXManager } from '../systems/AudioManager.js';
import { pixelText, panel, footerHint, prepareCamera } from '../ui/UIFactory.js';

export class CreditsScene extends Phaser.Scene {
  constructor() { super(SCENES.CREDITS); }

  create() {
    prepareCamera(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14121f);
    panel(this, cx, 180, 500, 280);
    pixelText(this, cx, 22, 'CRÉDITOS', { size: FONT.MEDIUM, color: UI_COLORS.ACCENT });

    const lines = [
      [`${GAME_TITLE}  v${GAME_VERSION}`, UI_COLORS.TEXT],
      ['', null],
      ['GAME DESIGN E CÓDIGO', UI_COLORS.ACCENT],
      ['Projeto original em Phaser 3', UI_COLORS.TEXT],
      ['', null],
      ['PIXEL ART E ÁUDIO', UI_COLORS.ACCENT],
      ['Gerados proceduralmente (originais)', UI_COLORS.TEXT],
      ['', null],
      ['ENGINE', UI_COLORS.ACCENT],
      ['Phaser 3 (MIT License)', UI_COLORS.TEXT],
      ['', null],
      ['Inspirado no gênero arcade de "jogo rápido".', UI_COLORS.TEXT_DIM],
      ['Nenhum asset, código ou marca de terceiros.', UI_COLORS.TEXT_DIM]
    ];
    lines.forEach(([t, c], i) => {
      if (t) pixelText(this, cx, 60 + i * 18, t, { color: c, stroke: false });
    });

    const truck = this.add.sprite(-30, 330, 'truck', 0).setAngle(90);
    if (this.anims.exists('truck_drive')) truck.play('truck_drive');
    this.tweens.add({ targets: truck, x: GAME_WIDTH + 30, duration: 5000, repeat: -1 });

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
