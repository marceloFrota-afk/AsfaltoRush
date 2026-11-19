// =============================================================
// Pickup.js — base reciclável para itens SEM colisão física
// (coletáveis e power-ups). Flutua, pulsa e pode ser atraído
// pelo ímã.
// =============================================================
import { DEPTH } from '../config/gameConfig.js';
import { firstFrame } from '../art/textureUtils.js';

export class Pickup {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(-100, -100, 'gear').setVisible(false).setActive(false).setDepth(DEPTH.PICKUP);
    this.hitbox = new Phaser.Geom.Rectangle();
    this.active = false;
    this.kind = null;
    this.radius = 10;
  }

  spawn(kind, texture, x, y, { anim = null, radius = 10, magnetic = true, bob = 2 } = {}) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.t = Math.random() * Math.PI * 2;
    this.radius = radius;
    this.magnetic = magnetic;
    this.bob = bob;
    this.active = true;
    const s = this.sprite;
    s.setTexture(texture, firstFrame(this.scene, texture)).setPosition(x, y).setVisible(true).setActive(true).setAlpha(1).setScale(1);
    if (anim && this.scene.anims.exists(anim)) s.play(anim); else s.stop();
    this._hb();
    return this;
  }

  update(dt, worldDy, magnet = null) {
    this.t += dt;
    this.y += worldDy;
    if (magnet && this.magnetic) {
      const dx = magnet.x - this.x;
      const dy = magnet.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < magnet.radius && d > 1) {
        const pull = magnet.pull * dt;
        this.x += (dx / d) * Math.min(pull, d);
        this.y += (dy / d) * Math.min(pull, d);
      }
    }
    this.sprite.setPosition(this.x, this.y + Math.sin(this.t * 5) * this.bob);
    this._hb();
  }

  _hb() {
    const r = this.radius;
    this.hitbox.setTo(this.x - r, this.y - r, r * 2, r * 2);
  }

  release() {
    this.active = false;
    this.sprite.stop();
    this.sprite.setVisible(false).setActive(false);
  }
}
