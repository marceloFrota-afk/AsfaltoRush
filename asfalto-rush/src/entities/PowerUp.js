// =============================================================
// PowerUp.js — escudo, boost, reparo, dash instantâneo, ímã.
// Definições/durações em balance.js → POWERUPS.TYPES
// =============================================================
import { Pickup } from './Pickup.js';
import { POWERUPS } from '../config/balance.js';

export class PowerUp extends Pickup {
  spawnType(type, x, y) {
    const def = POWERUPS.TYPES[type];
    this.def = def;
    this.type = type;
    this.spawn(type, def.texture, x, y, { radius: 13, magnetic: false, bob: 3 });
    return this;
  }

  update(dt, worldDy) {
    super.update(dt, worldDy, null);
    // brilho pulsante + leve rotação
    this.sprite.setScale(1 + Math.sin(this.t * 6) * 0.1);
    this.sprite.setAngle(Math.sin(this.t * 3) * 8);
  }
}
