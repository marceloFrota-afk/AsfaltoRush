// =============================================================
// PauseScene — estado PAUSED. A GameScene fica pausada (física,
// spawning, cronômetro, movimento e pontuação congelados).
// =============================================================
import { SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS } from '../config/gameConfig.js';
import { InputManager } from '../systems/InputManager.js';
import { MusicManager } from '../systems/AudioManager.js';
import { MenuList } from '../ui/MenuList.js';
import { pixelText, panel, dimBackground, footerHint } from '../ui/UIFactory.js';

export class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }

  init(data) { this.modeId = (data && data.mode) || 'endless'; }

  create() {
    this.registry.set('state', GAME_STATE.PAUSED);
    this.cameras.main.resetFX();
    this.scene.bringToTop();
    dimBackground(this, 0.65);
    panel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 260, 170);
    const title = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 56, 'PAUSADO', { size: FONT.LARGE, color: UI_COLORS.ACCENT });
    this.tweens.add({ targets: title, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });

    this.inputs = new InputManager(this);
    this.menu = new MenuList(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, [
      { label: 'CONTINUAR', onSelect: () => this._resume() },
      { label: 'REINICIAR', onSelect: () => this._restart() },
      { label: 'MENU PRINCIPAL', onSelect: () => this._toMenu() }
    ], { inputs: this.inputs, spacing: 24 });
    footerHint(this, 'ESC CONTINUAR');
    this.closing = false;
  }

  _resume() {
    if (this.closing) return;
    this.closing = true;
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }

  _restart() {
    if (this.closing) return;
    this.closing = true;
    this.scene.stop(SCENES.HUD);
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.GAME, { mode: this.modeId });
  }

  _toMenu() {
    if (this.closing) return;
    this.closing = true;
    MusicManager.duck(false);
    this.scene.stop(SCENES.HUD);
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.MENU);
  }

  update(time, delta) {
    this.inputs.update();
    if (this.closing) return;
    if (this.inputs.justPressed('pause')) { this._resume(); return; }
    this.menu.update(delta / 1000);
  }
}
