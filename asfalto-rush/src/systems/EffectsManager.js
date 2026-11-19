// =============================================================
// EffectsManager.js — feedback visual centralizado:
// partículas (limitadas), screen shake, flash, textos flutuantes,
// brilho de combo. Respeita as opções de acessibilidade.
// =============================================================
import { DEPTH, FONT } from '../config/gameConfig.js';
import { FX } from '../config/balance.js';
import { StorageManager } from './StorageManager.js';

const FLOAT_POOL = 12;

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.settings = StorageManager.getSettings();
    const s = scene;
    const limit = Math.floor(FX.MAX_PARTICLES / 4);

    // Emissores reutilizáveis (Phaser 3.60+ API)
    this.dust = s.add.particles(0, 0, 'smoke', {
      speed: { min: 20, max: 60 }, angle: { min: 200, max: 340 }, lifespan: 380,
      scale: { start: 1, end: 0.2 }, alpha: { start: 0.5, end: 0 }, tint: 0xb8a98c,
      emitting: false, maxAliveParticles: limit
    }).setDepth(DEPTH.PARTICLES);

    this.sparks = s.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 200 }, lifespan: 420, scale: { start: 1, end: 0 },
      tint: [0xffd93d, 0xff9a3c, 0xffffff], gravityY: 300,
      emitting: false, maxAliveParticles: limit
    }).setDepth(DEPTH.PARTICLES);

    this.debris = s.add.particles(0, 0, 'px', {
      speed: { min: 80, max: 220 }, lifespan: 600, scale: { start: 3, end: 1 },
      tint: [0x5b6578, 0x8d92a6, 0xe4343f, 0x1b1b2f], gravityY: 380, rotate: { min: 0, max: 360 },
      emitting: false, maxAliveParticles: limit
    }).setDepth(DEPTH.PARTICLES);

    this.sparkle = s.add.particles(0, 0, 'spark', {
      speed: { min: 30, max: 90 }, lifespan: 350, scale: { start: 1.2, end: 0 },
      tint: [0xffffff, 0xfff275], emitting: false, maxAliveParticles: limit
    }).setDepth(DEPTH.PARTICLES);

    this.emitters = [this.dust, this.sparks, this.debris, this.sparkle];

    // textos flutuantes reciclados
    this.floats = [];
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = s.add.text(0, 0, '', {
        fontFamily: FONT.FAMILY, fontSize: FONT.SMALL, color: '#ffffff', stroke: '#14121f', strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH.FLOATING_TEXT).setVisible(false);
      t.life = 0;
      this.floats.push(t);
    }
  }

  get particlesOn() { return this.settings.particles; }

  _burst(emitter, n, x, y, tint) {
    if (!this.particlesOn) return;
    if (tint !== undefined) emitter.setParticleTint(tint);
    emitter.explode(n, x, y);
  }

  dustAt(x, y, n = 6) { this._burst(this.dust, n, x, y); }
  sparksAt(x, y, n = 10) { this._burst(this.sparks, n, x, y); }
  debrisAt(x, y, n = 14) { this._burst(this.debris, n, x, y); }
  sparkleAt(x, y, n = 6) { this._burst(this.sparkle, n, x, y); }

  explosion(x, y) {
    this.debrisAt(x, y, 26);
    this.sparksAt(x, y, 20);
    this.dustAt(x, y, 14);
  }

  shake(intensity = FX.SHAKE_HIT, duration = FX.SHAKE_DURATION) {
    const mode = this.settings.shake;
    if (mode === 'off') return;
    const k = mode === 'reduced' ? 0.3 : 1;
    this.scene.cameras.main.shake(duration, intensity * k);
  }

  flash(color = 0xffffff, duration = 90) {
    if (!this.settings.flashes) return;
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  floatText(x, y, text, color = '#ffffff') {
    const t = this.floats.find((o) => !o.visible) || this.floats[0];
    t.setText(text).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
    t.life = 0.8;
  }

  update(dt) {
    for (const t of this.floats) {
      if (!t.visible) continue;
      t.life -= dt;
      t.y -= 30 * dt;
      t.setAlpha(Math.min(1, t.life / 0.4));
      if (t.life <= 0) t.setVisible(false);
    }
  }
}
