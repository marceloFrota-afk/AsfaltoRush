// =============================================================
// ModeRules.js — regras específicas de cada modo de jogo
// (Strategy). A GameScene chama sempre a mesma interface:
//   update(dt, ctx)           -> { gameOver, reason } | null
//   onCollision(severity)     -> { gameOver, reason, label }
//   onTimePickup(seconds)
//   speedMultiplier()         -> multiplicador de velocidade do caminhão
//   hud()                     -> dados extras para o HUD
//   finalBonus(score)         -> bônus final
// =============================================================
import { DAMAGE, TIME_ATTACK, ESCAPE } from '../config/balance.js';
import { PIXELS_PER_METER } from '../config/gameConfig.js';

// ---------------- Estrada Infinita ----------------
export class EndlessRules {
  constructor() {
    this.lives = DAMAGE.START_LIVES;
    this.maxLives = DAMAGE.MAX_LIVES;
  }

  update() { return null; }

  onCollision(severity) {
    if (severity === 'severe' && DAMAGE.SEVERE_IS_FATAL) {
      this.lives = 0;
      return { gameOver: true, reason: 'ACIDENTE GRAVE', fatal: true, label: 'ACIDENTE!' };
    }
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives <= 0) return { gameOver: true, reason: 'SEM VIDAS', fatal: false, label: '-1' };
    return { gameOver: false, label: '-1 VIDA' };
  }

  addLife() {
    if (this.lives >= this.maxLives) return false;
    this.lives++;
    return true;
  }

  onTimePickup() {}
  speedMultiplier() { return 1; }
  hud() { return { lives: this.lives, maxLives: Math.max(DAMAGE.START_LIVES, this.lives) }; }
  finalBonus() { return 0; }
}

// ---------------- Contra o Tempo ----------------
export class TimeAttackRules {
  constructor() {
    this.timeLeft = TIME_ATTACK.START_TIME;
    this.timeGained = 0;
    this.lives = 0;
    this.maxLives = 0;
    this._lastWarn = -1;
  }

  update(dt, ctx) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const sec = Math.ceil(this.timeLeft);
    if (this.timeLeft <= 5 && sec !== this._lastWarn && this.timeLeft > 0) {
      this._lastWarn = sec;
      ctx.sfx.play('warning');
    }
    if (this.timeLeft <= 0) return { gameOver: true, reason: 'TEMPO ESGOTADO' };
    return null;
  }

  onCollision(severity) {
    const p = severity === 'severe' ? TIME_ATTACK.SEVERE_PENALTY : TIME_ATTACK.COLLISION_PENALTY;
    this.timeLeft = Math.max(0, this.timeLeft - p);
    if (this.timeLeft <= 0) return { gameOver: true, reason: 'TEMPO ESGOTADO', label: `-${p}s` };
    return { gameOver: false, label: `-${p}s` };
  }

  onTimePickup(seconds) {
    this.timeLeft = Math.min(TIME_ATTACK.MAX_TIME, this.timeLeft + seconds);
    this.timeGained += seconds;
  }

  addLife() { return false; }
  speedMultiplier() { return 1; }
  hud() { return { timeLeft: this.timeLeft }; }
  // Bônus pelo tempo extra conquistado durante a corrida
  finalBonus() { return this.timeGained; }
}

// ---------------- Fuga da Tempestade ----------------
export class EscapeRules {
  constructor() {
    this.gap = ESCAPE.START_GAP_M;   // metros entre a tempestade e o caminhão
    this.elapsed = 0;
    this.lives = 0;
    this.maxLives = 0;
    this.slowTimer = 0;
  }

  get threatFactor() {
    const t = Math.min(1, this.elapsed / ESCAPE.THREAT_RAMP_TIME);
    return ESCAPE.THREAT_FACTOR_START + (ESCAPE.THREAT_FACTOR_END - ESCAPE.THREAT_FACTOR_START) * t;
  }

  update(dt, ctx) {
    this.elapsed += dt;
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    const threatSpeed = ctx.baseSpeed * this.threatFactor;          // px/s
    const delta = (ctx.truckSpeed - threatSpeed) * dt / PIXELS_PER_METER;
    this.gap = Math.min(ESCAPE.MAX_GAP_M, this.gap + delta);
    if (this.gap <= 0) {
      this.gap = 0;
      return { gameOver: true, reason: 'A TEMPESTADE TE ALCANÇOU' };
    }
    return null;
  }

  onCollision(severity) {
    this.slowTimer = severity === 'severe' ? ESCAPE.SEVERE_STUN_TIME : ESCAPE.STUN_TIME;
    return { gameOver: false, label: 'DEVAGAR!' };
  }

  addLife() { return false; }
  onTimePickup() {}
  // após batida o caminhão fica mais lento por um tempo (a tempestade se aproxima)
  speedMultiplier() { return this.slowTimer > 0 ? 0.6 : 1; }
  hud() { return { threatGap: this.gap, threatDanger: this.gap < ESCAPE.DANGER_GAP_M }; }
  finalBonus() { return 0; }
}

export function createRules(modeId) {
  switch (modeId) {
    case 'timeattack': return new TimeAttackRules();
    case 'escape': return new EscapeRules();
    default: return new EndlessRules();
  }
}
