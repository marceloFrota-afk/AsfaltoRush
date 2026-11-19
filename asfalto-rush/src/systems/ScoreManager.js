// =============================================================
// ScoreManager.js — pontuação, combo/multiplicador e recordes.
// Sem dependência do Phaser (testável no Node).
// =============================================================
import { SCORE } from '../config/balance.js';
import { StorageManager } from './StorageManager.js';

export class ScoreManager {
  constructor(mode, { onMultiplierUp = null } = {}) {
    this.mode = mode;
    this.onMultiplierUp = onMultiplierUp;
    this.reset();
    const rec = StorageManager.getRecord(mode);
    this.bestScore = rec.score;
    this.bestDistance = rec.distance;
  }

  reset() {
    this.score = 0;
    this.meters = 0;
    this.time = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.multiplier = 1;
    this.dodges = 0;
    this.holesJumped = 0;
    this.gears = 0;
    this.collisions = 0;
    this.timeBonus = 0;
    this._meterAcc = 0;
    this._timeAcc = 0;
  }

  // Pontos sempre passam pelo multiplicador
  add(points) {
    const v = Math.round(points * this.multiplier);
    this.score += v;
    return v;
  }

  // Chamado todo frame com metros percorridos no frame
  tick(dt, metersDelta) {
    this.time += dt;
    this.meters += metersDelta;
    this._meterAcc += metersDelta;
    while (this._meterAcc >= SCORE.METERS_PER_POINT) {
      this._meterAcc -= SCORE.METERS_PER_POINT;
      this.add(1);
    }
    this._timeAcc += dt;
    while (this._timeAcc >= 1) {
      this._timeAcc -= 1;
      this.add(SCORE.POINTS_PER_SECOND);
    }
  }

  _incStreak() {
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const newMult = Math.min(SCORE.COMBO_MAX_MULT, 1 + Math.floor(this.streak / SCORE.COMBO_STEP));
    if (newMult > this.multiplier) {
      this.multiplier = newMult;
      if (this.onMultiplierUp) this.onMultiplierUp(newMult);
    }
  }

  onDodge() {
    this.dodges++;
    this._incStreak();
    return this.add(SCORE.DODGE);
  }

  onHoleJumped() {
    this.holesJumped++;
    this._incStreak();
    return this.add(SCORE.JUMP_HOLE);
  }

  onGear() {
    this.gears++;
    return this.add(SCORE.GEAR);
  }

  onPowerUp() { return this.add(SCORE.POWERUP); }

  onCollision() {
    this.collisions++;
    this.streak = 0;
    this.multiplier = 1;
  }

  addTimeBonus(seconds) {
    const v = Math.round(seconds * SCORE.TIME_BONUS_PER_SECOND);
    this.timeBonus += v;
    this.score += v;
    return v;
  }

  get distance() { return Math.floor(this.meters); }

  get displayScore() { return Math.floor(this.score); }

  // Salva recordes e retorna o resumo da partida
  finalize(reason = '') {
    const score = Math.floor(this.score);
    const distance = Math.floor(this.meters);
    const res = StorageManager.submitRecord(this.mode, score, distance);
    StorageManager.addGears(this.gears);
    return {
      mode: this.mode,
      reason,
      score,
      distance,
      time: this.time,
      gears: this.gears,
      dodges: this.dodges,
      holesJumped: this.holesJumped,
      bestStreak: this.bestStreak,
      timeBonus: this.timeBonus,
      newScoreRecord: res.newScore && score > 0,
      newDistanceRecord: res.newDistance && distance > 0,
      bestScore: res.best.score,
      bestDistance: res.best.distance
    };
  }
}
