// =============================================================
// HUDScene — HUD pixel art, sempre sobre a GameScene (cena
// paralela, sem ser afetada por shake/scroll da câmera do jogo).
// Lê GameScene.getHudState() a cada frame; só atualiza textos
// quando o valor muda.
// =============================================================
import { SCENES, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS, ROAD } from '../config/gameConfig.js';
import { ESCAPE } from '../config/balance.js';
import { StorageManager } from '../systems/StorageManager.js';
import { pixelText } from '../ui/UIFactory.js';

const L = 10;                       // coluna esquerda (sobre a grama)
const R = GAME_WIDTH - 10;          // coluna direita

export class HUDScene extends Phaser.Scene {
  constructor() { super(SCENES.HUD); }

  init(data) { this.modeId = data.mode; }

  create() {
    this.cameras.main.resetFX();
    this.scene.bringToTop();
    this.gs = this.scene.get(SCENES.GAME);
    this.settings = StorageManager.getSettings();
    this.cache = {};

    const small = { size: FONT.SMALL, origin: 0, align: 'left' };
    const g = this.add.graphics();
    // painéis translúcidos laterais
    g.fillStyle(0x14121f, 0.55);
    g.fillRect(4, 4, ROAD.X - 18, 96);
    g.fillRect(ROAD.RIGHT + 14, 4, GAME_WIDTH - ROAD.RIGHT - 18, 64);
    g.fillRect(4, GAME_HEIGHT - 44, 120, 40);

    pixelText(this, L, 10, 'SCORE', { ...small, color: UI_COLORS.TEXT_DIM, stroke: false });
    this.scoreT = pixelText(this, L, 22, '0', { ...small, size: FONT.MEDIUM, color: UI_COLORS.TEXT });
    this.bestT = pixelText(this, L, 44, 'RECORD 0', { ...small, color: UI_COLORS.ACCENT, stroke: false });
    this.distT = pixelText(this, L, 60, '0 m', { ...small, color: UI_COLORS.INFO, stroke: false });
    this.comboT = pixelText(this, L, 78, 'x1', { ...small, color: UI_COLORS.TEXT });
    this.streakT = pixelText(this, L + 36, 78, '', { ...small, color: UI_COLORS.TEXT_DIM, stroke: false });

    // ----- canto direito: vidas / cronômetro / ameaça -----
    const rx = ROAD.RIGHT + 20;
    if (this.modeId === 'endless') {
      pixelText(this, rx, 10, 'VIDAS', { ...small, color: UI_COLORS.TEXT_DIM, stroke: false });
      this.hearts = [];
      for (let i = 0; i < 5; i++) {
        this.hearts.push(this.add.image(rx + 8 + i * 22, 34, 'heart').setOrigin(0.5).setVisible(false));
      }
    } else if (this.modeId === 'timeattack') {
      pixelText(this, rx, 10, 'TEMPO', { ...small, color: UI_COLORS.TEXT_DIM, stroke: false });
      this.timerT = pixelText(this, rx, 24, '00.0', { ...small, size: FONT.LARGE, color: UI_COLORS.TEXT });
    } else {
      pixelText(this, rx, 10, 'TEMPESTADE', { ...small, color: UI_COLORS.TEXT_DIM, stroke: false });
      this.threatBar = this.add.graphics();
      this.threatT = pixelText(this, rx, 46, '', { ...small, color: UI_COLORS.TEXT, stroke: false });
    }

    // ----- power-ups ativos -----
    this.puGfx = this.add.graphics();
    this.puTexts = [0, 1, 2].map((i) => pixelText(this, rx, 80 + i * 22, '', { ...small, stroke: true }).setVisible(false));

    // ----- habilidades (canto inferior esquerdo) -----
    this.add.image(18, GAME_HEIGHT - 32, 'icon_dash').setOrigin(0.5);
    pixelText(this, 30, GAME_HEIGHT - 36, 'DASH', { ...small, color: UI_COLORS.TEXT, stroke: false });
    this.dashGfx = this.add.graphics();
    this.jumpIcon = this.add.image(18, GAME_HEIGHT - 14, 'icon_jump').setOrigin(0.5);
    this.jumpT = pixelText(this, 30, GAME_HEIGHT - 18, 'PULO', { ...small, color: UI_COLORS.TEXT, stroke: false });

    this.fpsT = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 10, '', { ...small, origin: 0.5, stroke: false, color: UI_COLORS.TEXT_DIM })
      .setVisible(!!this.settings.showFps);

    this.lastMult = 1;
    this.t = 0;
  }

  _set(textObj, key, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    textObj.setText(value);
  }

  update(time, delta) {
    if (!this.gs || !this.gs.sys.settings.active || !this.gs.getHudState) return;
    const dt = delta / 1000;
    this.t += dt;
    const h = this.gs.getHudState();

    this._set(this.scoreT, 'score', String(h.score).padStart(6, '0'));
    this._set(this.bestT, 'best', 'RECORD ' + h.best);
    this._set(this.distT, 'dist', h.distance + ' m');

    // combo: cor e pulso quando o multiplicador sobe
    const m = h.multiplier;
    this._set(this.comboT, 'mult', 'x' + m);
    this._set(this.streakT, 'streak', h.streak > 0 ? `COMBO ${h.streak}` : '');
    if (m !== this.lastMult) {
      this.comboT.setColor(UI_COLORS.COMBO[Math.min(m - 1, UI_COLORS.COMBO.length - 1)]);
      if (m > this.lastMult) {
        this.tweens.killTweensOf(this.comboT);
        this.comboT.setScale(1.8);
        this.tweens.add({ targets: this.comboT, scale: 1, duration: 260, ease: 'Back.out' });
      }
      this.lastMult = m;
    }
    if (m >= 4) this.comboT.setAlpha(0.75 + Math.sin(this.t * 12) * 0.25); else this.comboT.setAlpha(1);

    // modo
    if (this.hearts) {
      const maxShown = Math.max(h.maxLives || 3, h.lives || 0);
      this.hearts.forEach((img, i) => {
        img.setVisible(i < maxShown);
        img.setTexture(i < h.lives ? 'heart' : 'heart_empty');
      });
    }
    if (this.timerT) {
      const tl = Math.max(0, h.timeLeft || 0);
      this._set(this.timerT, 'timer', tl.toFixed(1).padStart(4, '0'));
      const danger = tl <= 10;
      this.timerT.setColor(danger ? UI_COLORS.DANGER : UI_COLORS.TEXT);
      if (danger) this.timerT.setScale(1 + Math.max(0, Math.sin(this.t * 10)) * 0.08); else this.timerT.setScale(1);
    }
    if (this.threatBar) {
      const rx = ROAD.RIGHT + 20;
      const ratio = Math.max(0, Math.min(1, h.threatGap / ESCAPE.MAX_GAP_M));
      const w = GAME_WIDTH - rx - 16;
      const gb = this.threatBar;
      gb.clear();
      gb.fillStyle(0x2b2d37, 1).fillRect(rx, 26, w, 10);
      const col = h.threatDanger ? (Math.floor(this.t * 6) % 2 ? 0xff5a5a : 0xffd93d) : 0xb57bff;
      gb.fillStyle(col, 1).fillRect(rx, 26, Math.max(2, w * ratio), 10);
      gb.lineStyle(2, 0xf4f4f4, 1).strokeRect(rx, 26, w, 10);
      this._set(this.threatT, 'threat', Math.max(0, Math.floor(h.threatGap)) + ' m');
      this.threatT.setColor(h.threatDanger ? UI_COLORS.DANGER : UI_COLORS.TEXT);
    }

    // power-ups com duração visível
    const pg = this.puGfx;
    pg.clear();
    const rx = ROAD.RIGHT + 20;
    this.puTexts.forEach((t, i) => {
      const p = h.powerups[i];
      if (!p) { t.setVisible(false); return; }
      t.setVisible(true);
      this._set(t, 'pu' + i, p.label);
      const y = 80 + i * 22;
      pg.fillStyle(0x2b2d37, 1).fillRect(rx, y + 11, 100, 4);
      pg.fillStyle(p.color, 1).fillRect(rx, y + 11, 100 * Math.max(0, Math.min(1, p.ratio)), 4);
    });

    // dash cooldown
    const dg = this.dashGfx;
    dg.clear();
    const ready = h.dashRatio >= 1;
    dg.fillStyle(0x2b2d37, 1).fillRect(66, GAME_HEIGHT - 36, 50, 8);
    dg.fillStyle(ready ? 0x6ee7a0 : 0xb57bff, 1).fillRect(66, GAME_HEIGHT - 36, 50 * h.dashRatio, 8);
    if (ready) dg.lineStyle(1, 0xffffff, 0.6 + Math.sin(this.t * 8) * 0.4).strokeRect(66, GAME_HEIGHT - 36, 50, 8);
    this.jumpIcon.setAlpha(h.jumpReady ? 1 : 0.3);
    this.jumpT.setAlpha(h.jumpReady ? 1 : 0.3);

    if (this.settings.showFps) this._set(this.fpsT, 'fps', Math.round(h.fps) + ' FPS');
  }
}
