// =============================================================
// DifficultyManager.js — curva de dificuldade configurável.
// difficulty = (tempo*W_T + metros/M*W_D) * RATE
// Interpola valores numéricos entre keyframes de balance.js.
// Sem dependência do Phaser.
// =============================================================
import { DIFFICULTY, OBSTACLE_WEIGHTS, SPEED } from '../config/balance.js';

const NUMERIC = ['speed', 'rowTimeMin', 'rowTimeMax', 'maxBlocked', 'fill', 'jumpRowChance', 'animalChance'];

export class DifficultyManager {
  constructor(config = DIFFICULTY) {
    this.cfg = config;
    this.curve = [...config.CURVE].sort((a, b) => a.at - b.at);
    this.level = 0;
    this.stage = 0;
    this.params = {};
    this._poolCache = new Map();
    this.update(0, 0);
  }

  compute(time, meters) {
    const c = this.cfg;
    return (time * c.TIME_WEIGHT + (meters / c.METERS_PER_UNIT) * c.DISTANCE_WEIGHT) * c.RATE;
  }

  update(time, meters) {
    this.level = this.compute(time, meters);
    const curve = this.curve;
    let i = 0;
    while (i < curve.length - 1 && this.level >= curve[i + 1].at) i++;
    this.stage = i;
    const a = curve[i];
    const b = curve[Math.min(i + 1, curve.length - 1)];
    const span = b.at - a.at;
    const t = span > 0 ? Math.min(1, (this.level - a.at) / span) : 0;
    NUMERIC.forEach((k) => { this.params[k] = a[k] + (b[k] - a[k]) * t; });
    this.params.speed = Math.min(SPEED.MAX, this.params.speed);
    this.params.maxBlocked = Math.floor(this.params.maxBlocked + 1e-6);
    this.params.pool = this._pool(i);
    return this.params;
  }

  // Pool acumulativo de tipos liberados até o estágio i, com pesos
  _pool(i) {
    if (this._poolCache.has(i)) return this._poolCache.get(i);
    const ids = [];
    for (let s = 0; s <= i; s++) this.curve[s].pool.forEach((id) => { if (!ids.includes(id)) ids.push(id); });
    const pool = ids.map((id) => ({ id, weight: OBSTACLE_WEIGHTS[id] ?? 1 })).filter((p) => p.weight > 0);
    this._poolCache.set(i, pool);
    return pool;
  }

  get baseSpeed() { return this.params.speed; }

  // 0..1 para HUD / efeitos
  get speedRatio() { return this.params.speed / SPEED.MAX; }
}
