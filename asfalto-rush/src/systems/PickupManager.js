// =============================================================
// PickupManager.js — coletáveis (engrenagens, relógios) e
// power-ups. Só posiciona itens em faixas SEGURAS informadas
// pelo ObstacleManager. Pooling + frequência controlada.
// =============================================================
import { Collectible } from '../entities/Collectible.js';
import { PowerUp } from '../entities/PowerUp.js';
import { COLLECTIBLES, POWERUPS } from '../config/balance.js';
import { DESPAWN_Y, laneCenter } from '../config/gameConfig.js';

const POWERUP_POOL = 4;

export class PickupManager {
  constructor(scene, { allowRepair = true, timePickups = false } = {}) {
    this.scene = scene;
    this.allowRepair = allowRepair;
    this.timePickups = timePickups;
    this.collectibles = [];
    this.powerups = [];
    for (let i = 0; i < COLLECTIBLES.MAX_ACTIVE; i++) this.collectibles.push(new Collectible(scene));
    for (let i = 0; i < POWERUP_POOL; i++) this.powerups.push(new PowerUp(scene));
    this.timeSincePowerUp = 0;
    this.timeSinceClock = 0;
    this.livesProvider = () => 0;
    this.maxLives = 0;
  }

  update(dt, worldDy, magnet) {
    this.timeSincePowerUp += dt;
    this.timeSinceClock += dt;
    for (const c of this.collectibles) {
      if (!c.active) continue;
      c.update(dt, worldDy, magnet);
      if (c.y > DESPAWN_Y) c.release();
    }
    for (const p of this.powerups) {
      if (!p.active) continue;
      p.update(dt, worldDy);
      if (p.y > DESPAWN_Y) p.release();
    }
  }

  // Chamado a cada fileira gerada
  onRow(row, rowY, gapAfter) {
    const lanes = row.safeLanes.length ? row.safeLanes : [];
    if (!lanes.length) return;
    const pick = () => lanes[Math.floor(Math.random() * lanes.length)];

    // ---- relógios (Contra o Tempo) ----
    if (this.timePickups && this.timeSinceClock >= COLLECTIBLES.TIME_PICKUP_INTERVAL && row.type === 'normal') {
      const kind = Math.random() < COLLECTIBLES.TIME_PICKUP_BIG_CHANCE ? 'clock_l' : 'clock_s';
      this._spawnCollectible(kind, laneCenter(pick()), rowY);
      this.timeSinceClock = 0;
    } else if (row.type === 'normal' && this.timeSincePowerUp >= POWERUPS.MIN_INTERVAL
      && Math.random() < POWERUPS.CHANCE_PER_ROW) {
      // ---- power-up na própria fileira, em faixa livre ----
      const type = this._rollPowerUp();
      if (type) {
        const p = this.powerups.find((o) => !o.active);
        if (p) {
          p.spawnType(type, laneCenter(pick()), rowY);
          this.timeSincePowerUp = 0;
        }
      }
    }

    // ---- linha de engrenagens ENTRE esta fileira e a próxima ----
    if (Math.random() < COLLECTIBLES.GEAR_LINE_CHANCE && row.type !== 'jump') {
      const lane = pick();
      const n = COLLECTIBLES.GEAR_LINE_MIN
        + Math.floor(Math.random() * (COLLECTIBLES.GEAR_LINE_MAX - COLLECTIBLES.GEAR_LINE_MIN + 1));
      const span = (n - 1) * COLLECTIBLES.GEAR_SPACING;
      // centraliza no meio do gap, sem invadir a próxima fileira
      const usable = Math.max(0, gapAfter - 90);
      if (span <= usable) {
        const startY = rowY - 45 - (usable - span) / 2;
        for (let i = 0; i < n; i++) {
          this._spawnCollectible('gear', laneCenter(lane), startY - i * COLLECTIBLES.GEAR_SPACING);
        }
      }
    }
  }

  _spawnCollectible(kind, x, y) {
    const c = this.collectibles.find((o) => !o.active);
    if (c) c.spawnKind(kind, x, y);
  }

  _rollPowerUp() {
    const lives = this.livesProvider();
    const entries = Object.entries(POWERUPS.TYPES).filter(([, d]) => {
      if (d.livesOnly) return this.allowRepair && lives < this.maxLives;
      return true;
    });
    if (!entries.length) return null;
    const total = entries.reduce((s, [, d]) => s + d.weight, 0);
    let r = Math.random() * total;
    for (const [k, d] of entries) { if ((r -= d.weight) <= 0) return k; }
    return entries[entries.length - 1][0];
  }

  reset() {
    this.collectibles.forEach((c) => c.active && c.release());
    this.powerups.forEach((p) => p.active && p.release());
    this.timeSincePowerUp = 0;
    this.timeSinceClock = 0;
  }
}
