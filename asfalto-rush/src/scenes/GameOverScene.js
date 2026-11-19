// =============================================================
// GameOverScene — estado GAME_OVER. Mostra resultado, recordes
// e "NOVO RECORDE!". ENTER reinicia imediatamente.
// =============================================================
import { SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS } from '../config/gameConfig.js';
import { MODES } from '../config/modes.js';
import { InputManager } from '../systems/InputManager.js';
import { SFXManager, MusicManager } from '../systems/AudioManager.js';
import { StorageManager } from '../systems/StorageManager.js';
import { MenuList } from '../ui/MenuList.js';
import { pixelText, panel, prepareCamera } from '../ui/UIFactory.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME_OVER); }

  init(data) { this.r = data || {}; }

  create() {
    this.registry.set('state', GAME_STATE.GAME_OVER);
    prepareCamera(this, 250);
    const r = this.r;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14121f);
    panel(this, cx, 176, 340, 300);

    const title = pixelText(this, cx, 44, 'GAME OVER', { size: FONT.LARGE, color: UI_COLORS.DANGER });
    title.setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 380, ease: 'Back.out' });
    const mode = MODES[r.mode] || MODES.endless;
    pixelText(this, cx, 70, `${mode.name}${r.reason ? '  -  ' + r.reason : ''}`, { color: UI_COLORS.TEXT_DIM, stroke: false });

    const rows = [
      ['PONTUAÇÃO', r.score ?? 0],
      ['DISTÂNCIA', (r.distance ?? 0) + ' m'],
      ['MELHOR PONTUAÇÃO', r.bestScore ?? 0],
      ['MELHOR DISTÂNCIA', (r.bestDistance ?? 0) + ' m'],
      ['ENGRENAGENS', `${r.gears ?? 0}  (TOTAL ${StorageManager.getWallet().gears})`],
      ['MAIOR COMBO', r.bestStreak ?? 0]
    ];
    if (r.timeBonus) rows.push(['BÔNUS DE TEMPO', '+' + r.timeBonus]);
    rows.forEach(([k, v], i) => {
      const y = 96 + i * 18;
      pixelText(this, cx - 150, y, k, { origin: 0, align: 'left', color: i < 2 ? UI_COLORS.TEXT : UI_COLORS.TEXT_DIM, stroke: false });
      const vt = pixelText(this, cx + 150, y, String(v), { origin: 0, color: i < 2 ? UI_COLORS.ACCENT : UI_COLORS.TEXT, stroke: false });
      vt.setOrigin(1, 0);
    });

    // NOVO RECORDE!
    if (r.newScoreRecord || r.newDistanceRecord) {
      const label = r.newScoreRecord ? 'NOVO RECORDE!' : 'NOVO RECORDE DE DISTÂNCIA!';
      const rec = pixelText(this, cx, 232, label, { size: FONT.MEDIUM, color: UI_COLORS.ACCENT });
      this.tweens.add({ targets: rec, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.addEvent({ delay: 160, loop: true, callback: () => rec.setColor(rec.style.color === UI_COLORS.ACCENT ? '#ffffff' : UI_COLORS.ACCENT) });
      if (StorageManager.getSettings().particles) {
        const conf = this.add.particles(0, 0, 'spark', {
          x: { min: cx - 160, max: cx + 160 }, y: 20, lifespan: 1600, speedY: { min: 40, max: 110 },
          speedX: { min: -30, max: 30 }, scale: { start: 1.4, end: 0.4 },
          tint: [0xf7c548, 0x6ee7a0, 0x6cc7ff, 0xff5a8a], frequency: 70, maxAliveParticles: 40
        });
        this.time.delayedCall(2600, () => conf.stop());
      }
      this.time.delayedCall(300, () => SFXManager.play('record'));
    }

    this.inputs = new InputManager(this);
    this.menu = new MenuList(this, cx, 270, [
      { label: 'JOGAR NOVAMENTE', onSelect: () => this._go(SCENES.GAME, { mode: r.mode || 'endless' }) },
      { label: 'MENU PRINCIPAL', onSelect: () => this._go(SCENES.MENU) }
    ], { inputs: this.inputs, spacing: 22 });
    this.leaving = false;
    MusicManager.play('menu');
  }

  _go(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, data);
  }

  update(time, delta) {
    this.inputs.update();
    if (!this.leaving) this.menu.update(delta / 1000);
  }
}
