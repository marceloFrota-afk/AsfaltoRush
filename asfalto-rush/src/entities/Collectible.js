// =============================================================
// Collectible.js — engrenagens (pontos + moeda futura) e
// relógios de tempo (+3s / +5s no modo Contra o Tempo).
// =============================================================
import { Pickup } from './Pickup.js';
import { COLLECTIBLES } from '../config/balance.js';

export const COLLECTIBLE_KINDS = {
  gear: { texture: 'gear', anim: 'gear_spin', radius: 9, timeBonus: 0 },
  clock_s: { texture: 'clock_s', anim: null, radius: 12, timeBonus: COLLECTIBLES.TIME_PICKUP_SMALL },
  clock_l: { texture: 'clock_l', anim: null, radius: 12, timeBonus: COLLECTIBLES.TIME_PICKUP_BIG }
};

export class Collectible extends Pickup {
  spawnKind(kind, x, y) {
    const def = COLLECTIBLE_KINDS[kind];
    this.def = def;
    this.spawn(kind, def.texture, x, y, { anim: def.anim, radius: def.radius, magnetic: true, bob: kind === 'gear' ? 1.5 : 2.5 });
    // relógios pulsam para chamar atenção
    this.pulse = kind !== 'gear';
    return this;
  }

  update(dt, worldDy, magnet) {
    super.update(dt, worldDy, magnet);
    if (this.pulse) this.sprite.setScale(1 + Math.sin(this.t * 8) * 0.08);
  }
}
