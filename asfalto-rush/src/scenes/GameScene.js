// =============================================================
// GameScene — estado PLAYING. ORQUESTRA os sistemas:
//   InputManager → Truck → DifficultyManager → RoadManager
//   ObstacleManager/PickupManager → CollisionSystem
//   ScoreManager → ModeRules → EffectsManager/Audio → HUD
// Não contém regras de pontuação, geração ou controle direto.
// =============================================================
import {
  SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, DEPTH, FONT, UI_COLORS,
  PIXELS_PER_METER, laneCenter
} from '../config/gameConfig.js';
import { TRUCK, DASH, FX, POWERUPS, SPEED, ESCAPE } from '../config/balance.js';
import { MODES } from '../config/modes.js';
import { Truck } from '../entities/Truck.js';
import { InputManager } from '../systems/InputManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { DifficultyManager } from '../systems/DifficultyManager.js';
import { ObstacleManager } from '../systems/ObstacleManager.js';
import { PickupManager } from '../systems/PickupManager.js';
import { CollisionSystem, CATEGORY } from '../systems/CollisionSystem.js';
import { RoadManager } from '../systems/RoadManager.js';
import { EffectsManager } from '../systems/EffectsManager.js';
import { createRules } from '../systems/ModeRules.js';
import { StorageManager } from '../systems/StorageManager.js';
import { AudioManager, SFXManager, MusicManager } from '../systems/AudioManager.js';
import { pixelText, prepareCamera } from '../ui/UIFactory.js';

export class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  init(data) {
    this.modeId = (data && MODES[data.mode]) ? data.mode : 'endless';
    this.mode = MODES[this.modeId];
  }

  create() {
    this.registry.set('state', GAME_STATE.PLAYING);
    this.settings = StorageManager.getSettings();
    const hc = this.settings.highContrast;
    prepareCamera(this);

    // ---------- sistemas ----------
    this.road = new RoadManager(this, { highContrast: hc, speedLines: this.settings.particles });
    this.effects = new EffectsManager(this);
    this.inputs = new InputManager(this, { touchControls: true });
    this.difficulty = new DifficultyManager();
    this.rules = createRules(this.modeId);
    this.score = new ScoreManager(this.modeId, { onMultiplierUp: (m) => this._onMultiplier(m) });

    this.truck = new Truck(this, laneCenter(2), TRUCK.HOME_Y);
    this.truck.trailEnabled = this.settings.particles;

    this.pickups = new PickupManager(this, { allowRepair: this.mode.allowRepair, timePickups: this.mode.usesTimer });
    this.pickups.livesProvider = () => this.rules.lives;
    this.pickups.maxLives = this.rules.maxLives;

    this.obstacles = new ObstacleManager(this, {
      highContrast: hc,
      onRowSpawned: (row, y, gap) => this.pickups.onRow(row, y, gap)
    });

    this.collisions = new CollisionSystem({
      onHit: (o) => this._onHit(o),
      onDodge: (o) => this._onDodge(o),
      onJumpOver: (o) => this._onJumpOver(o),
      onCollect: (c) => this._onCollect(c),
      onPowerUp: (p) => this._onPowerUp(p)
    });

    this.storm = this.mode.usesThreat ? this._createStorm() : null;

    // ---------- eventos do caminhão (feedback) ----------
    this._truckHandlers = {
      'truck:jump': () => {
        SFXManager.play('jump');
        this.effects.dustAt(this.truck.x, this.truck.y + 20, 5);
      },
      'truck:land': () => {
        SFXManager.play('land');
        this.effects.dustAt(this.truck.x, this.truck.y + 22, 8);
      },
      'truck:dash': () => {
        SFXManager.play('dash');
        this.camKick = DASH.CAMERA_KICK;
      },
      'truck:edge': () => this.effects.dustAt(this.truck.x, this.truck.y, 3)
    };
    Object.entries(this._truckHandlers).forEach(([ev, fn]) => this.events.on(ev, fn));

    // ---------- estado ----------
    this.gameOverPending = false;
    this.camKick = 0;
    this.comboFxTimer = 0;
    this.gearPitch = 0;
    this.gearPitchTimer = 0;
    this.dangerTimer = 0;
    this._magnet = { x: 0, y: 0, radius: POWERUPS.MAGNET_RADIUS, pull: POWERUPS.MAGNET_PULL };
    this._hud = { powerups: [] };

    // ---------- HUD e áudio ----------
    this.scene.launch(SCENES.HUD, { mode: this.modeId });
    MusicManager.play('game');
    MusicManager.duck(false);
    AudioManager.core.whenUnlocked(() => { if (this.sys.isActive() && !this.gameOverPending) SFXManager.startEngine(); });

    this._onResume = () => {
      this.registry.set('state', GAME_STATE.PLAYING);
      MusicManager.duck(false);
    };
    this.events.on('resume', this._onResume);
    this.events.once('shutdown', () => this._cleanup());

    this._banner(this.mode.name, 'VAI!');
  }

  // ===========================================================
  // LOOP PRINCIPAL
  // ===========================================================
  update(time, delta) {
    const dt = Math.min(delta / 1000, 1 / 20);   // evita saltos após troca de aba
    this.inputs.update();

    if (!this.gameOverPending) {
      if (this.inputs.justPressed('pause')) { this._pause(); return; }
      if (this.inputs.justPressed('jump')) this.truck.tryJump();
      if (this.inputs.justPressed('dash')) this.truck.tryDash(this.inputs.moveX);
    }

    const params = this.difficulty.update(this.score.time, this.score.meters);
    const base = params.speed;

    this.truck.update(dt, this.inputs, base, this.rules.speedMultiplier());
    const dy = this.truck.speed * dt;

    this.road.update(dt, dy, this.truck.speed, this.score.meters);
    this.obstacles.update(dt, dy, params);

    let magnet = null;
    if (this.truck.hasMagnet) {
      this._magnet.x = this.truck.x; this._magnet.y = this.truck.y;
      magnet = this._magnet;
    }
    this.pickups.update(dt, dy, magnet);

    if (!this.gameOverPending) {
      this.collisions.update(this.truck, this.obstacles, this.pickups);
      this.score.tick(dt, dy / PIXELS_PER_METER);
      const res = this.rules.update(dt, { baseSpeed: base, truckSpeed: this.truck.speed, sfx: SFXManager });
      if (res && res.gameOver) {
        const caught = this.modeId === 'escape';
        this._triggerGameOver(res.reason, { wreck: caught, fatal: false });
      }
    }

    this.truck.updateView(dt, dy);
    this.effects.update(dt);
    if (this.storm) this._updateStorm(dt);
    this._updateComboFx(dt);
    this._updateCamera(dt);

    SFXManager.updateEngine(this.truck.speed / SPEED.MAX, !this.gameOverPending);
    this.gearPitchTimer -= dt;
    if (this.gearPitchTimer <= 0) this.gearPitch = 0;
  }

  // ===========================================================
  // COLISÕES / EVENTOS DE JOGO
  // ===========================================================
  _onHit(o) {
    const t = this.truck;
    const isHole = o.category === CATEGORY.HOLE;

    if (t.hasShield) {
      t.absorbHit();
      if (!isHole) this.obstacles.destroyObstacle(o);
      this.effects.sparksAt(t.x, t.y - 20, 12);
      this.effects.flash(0x6cc7ff, 80);
      this.effects.floatText(t.x, t.y - 40, 'ESCUDO!', UI_COLORS.INFO);
      SFXManager.play('land');
      return;
    }

    this.score.onCollision();
    const res = this.rules.onCollision(o.def.severity);
    t.applyHit();

    this.effects.shake(FX.SHAKE_HIT);
    this.effects.flash(0xff5a5a, 90);
    this.effects.debrisAt(o.x, o.y, isHole ? 8 : 16);
    this.effects.dustAt(t.x, t.y, 6);
    SFXManager.play('hit');
    if (res.label) this.effects.floatText(t.x, t.y - 40, res.label, UI_COLORS.DANGER);
    if (!isHole) this.obstacles.destroyObstacle(o);

    if (res.gameOver) this._triggerGameOver(res.reason, { wreck: true, fatal: !!res.fatal });
  }

  _onDodge(o) {
    if (!o.onRoad && o.id !== 'animal') return;
    const pts = this.score.onDodge();
    if (Math.abs(o.x - this.truck.x) < 72) {
      this.effects.floatText(o.x, o.y - 10, '+' + pts, UI_COLORS.TEXT);
    }
  }

  _onJumpOver(o) {
    const pts = this.score.onHoleJumped();
    this.effects.floatText(o.x, o.y - 14, `+${pts} PULO!`, UI_COLORS.GOOD);
    this.effects.sparkleAt(o.x, o.y, 6);
  }

  _onCollect(c) {
    if (c.kind === 'gear') {
      this.score.onGear();
      SFXManager.play('collect', { pitch: Math.min(12, this.gearPitch) });
      this.gearPitch += 2;
      this.gearPitchTimer = 0.6;
      this.effects.sparkleAt(c.x, c.y, 5);
    } else {
      const s = c.def.timeBonus;
      this.rules.onTimePickup(s);
      SFXManager.play('time');
      this.effects.floatText(c.x, c.y - 12, `+${s}s`, UI_COLORS.INFO);
      this.effects.sparkleAt(c.x, c.y, 10);
    }
  }

  _onPowerUp(p) {
    const t = this.truck;
    const def = p.def;
    this.score.onPowerUp();
    SFXManager.play('powerup');
    this.effects.flash(def.color, 120);
    this.effects.sparkleAt(p.x, p.y, 14);
    let label = def.label;
    switch (p.type) {
      case 'shield': t.setShield(def.duration); break;
      case 'boost': t.setBoost(def.duration); SFXManager.play('accel'); break;
      case 'repair': if (!this.rules.addLife()) label = '+PONTOS'; break;
      case 'dash_reset': t.resetDash(); break;
      case 'magnet': t.setMagnet(def.duration); break;
      default: break;
    }
    this.effects.floatText(t.x, t.y - 44, label, '#' + def.color.toString(16).padStart(6, '0'));
  }

  _onMultiplier(m) {
    SFXManager.play('combo', { level: m });
    this.effects.floatText(this.truck.x, this.truck.y - 52, `COMBO x${m}!`, UI_COLORS.COMBO[Math.min(m - 1, UI_COLORS.COMBO.length - 1)]);
  }

  // ===========================================================
  // GAME OVER / PAUSA
  // ===========================================================
  _triggerGameOver(reason, { wreck = true, fatal = false } = {}) {
    if (this.gameOverPending) return;
    this.gameOverPending = true;
    this.obstacles.enabled = false;
    const t = this.truck;

    if (wreck) {
      t.wreck();
      this.effects.explosion(t.x, t.y);
      this.effects.shake(fatal ? FX.SHAKE_FATAL : FX.SHAKE_HIT * 1.5, 320);
      this.effects.flash(0xff7a3c, 160);
      SFXManager.play('crash');
      this.tweens.add({ targets: t.sprite, angle: t.sprite.angle + (Math.random() < 0.5 ? -35 : 35), duration: 600, ease: 'Cubic.out' });
    } else {
      t.halt();
    }
    SFXManager.stopEngine();
    MusicManager.stop();
    this.time.delayedCall(450, () => SFXManager.play('gameover'));
    this._banner(reason, '', UI_COLORS.DANGER);
    this.time.delayedCall(1500, () => this._finish(reason));
  }

  _finish(reason) {
    const bonus = this.rules.finalBonus();
    if (bonus > 0) this.score.addTimeBonus(bonus);
    const results = this.score.finalize(reason);
    this.registry.set('state', GAME_STATE.GAME_OVER);
    this.scene.stop(SCENES.HUD);
    this.scene.start(SCENES.GAME_OVER, results);
  }

  _pause() {
    this.registry.set('state', GAME_STATE.PAUSED);
    MusicManager.duck(true);
    SFXManager.updateEngine(0, false);
    this.scene.launch(SCENES.PAUSE, { mode: this.modeId });
    this.scene.pause();
  }

  _cleanup() {
    SFXManager.stopEngine();
    Object.entries(this._truckHandlers).forEach(([ev, fn]) => this.events.off(ev, fn));
    this.events.off('resume', this._onResume);
  }

  // ===========================================================
  // VISUAIS AUXILIARES
  // ===========================================================
  _banner(title, subtitle = '', color = UI_COLORS.ACCENT) {
    const t1 = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { size: FONT.MEDIUM, color })
      .setDepth(DEPTH.FLOATING_TEXT + 5).setScrollFactor(0).setScale(0.6).setAlpha(0);
    const objs = [t1];
    if (subtitle) {
      objs.push(pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, subtitle, { size: FONT.LARGE, color: UI_COLORS.TEXT })
        .setDepth(DEPTH.FLOATING_TEXT + 5).setScrollFactor(0).setScale(0.6).setAlpha(0));
    }
    this.tweens.add({ targets: objs, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: objs, alpha: 0, delay: 1100, duration: 300, onComplete: () => objs.forEach((o) => o.destroy()) });
  }

  _updateComboFx(dt) {
    if (this.score.multiplier < 4 || !this.truck.alive) return;
    this.comboFxTimer -= dt;
    if (this.comboFxTimer <= 0) {
      this.comboFxTimer = 0.12 - Math.min(0.08, (this.score.multiplier - 4) * 0.02);
      this.effects.sparkleAt(this.truck.x + Phaser.Math.Between(-10, 10), this.truck.y + 26, 1);
    }
  }

  _updateCamera(dt) {
    const cam = this.cameras.main;
    const targetX = (this.truck.x - GAME_WIDTH / 2) * 0.06;   // acompanha suavemente
    cam.scrollX += (targetX - cam.scrollX) * Math.min(1, dt * 6);
    this.camKick = Math.max(0, this.camKick - dt * 40);
    cam.scrollY = -this.camKick;                               // "tranco" do dash
  }

  // ---------- Tempestade (modo Fuga) ----------
  _createStorm() {
    const c = this.add.container(0, GAME_HEIGHT + 40).setDepth(DEPTH.THREAT);
    const edge = this.add.tileSprite(-20, 0, GAME_WIDTH + 40, 48, 'storm_edge').setOrigin(0, 0);
    const body = this.add.rectangle(-20, 46, GAME_WIDTH + 40, GAME_HEIGHT + 60, 0x2c2350).setOrigin(0, 0);
    const bolt = this.add.graphics();
    c.add([body, edge, bolt]);
    const rain = this.add.particles(0, 0, 'rain', {
      x: { min: 0, max: GAME_WIDTH }, y: -10, lifespan: 700, speedY: { min: 380, max: 520 }, speedX: -60,
      quantity: 1, frequency: 40, alpha: { start: 0.6, end: 0.2 }, maxAliveParticles: 40
    }).setDepth(DEPTH.THREAT - 1);
    if (!this.settings.particles) rain.stop();
    return { c, edge, body, bolt, rain, y: GAME_HEIGHT + 40, boltTimer: 1.5 };
  }

  _updateStorm(dt) {
    const s = this.storm;
    const gap = this.rules.gap;
    const show = 60;  // metros a partir dos quais a tempestade aparece na tela
    const reach = this.truck.y - 16;
    const k = Math.max(0, Math.min(1, 1 - gap / show));
    const targetY = GAME_HEIGHT + 40 - k * (GAME_HEIGHT + 40 - reach);
    s.y += (targetY - s.y) * Math.min(1, dt * 4);
    s.c.y = s.y;
    s.edge.tilePositionX += dt * 40;
    s.edge.y = Math.sin(this.score.time * 3) * 2;

    // relâmpagos
    s.boltTimer -= dt;
    s.bolt.clear();
    if (s.boltTimer <= 0) {
      s.boltTimer = 1 + Math.random() * 2.5;
      if (s.y < GAME_HEIGHT) {
        s.bolt.lineStyle(2, 0xfff6a8, 1);
        let x = Phaser.Math.Between(40, GAME_WIDTH - 40), y = 10;
        s.bolt.beginPath(); s.bolt.moveTo(x, y);
        for (let i = 0; i < 5; i++) { x += Phaser.Math.Between(-12, 12); y += 14; s.bolt.lineTo(x, y); }
        s.bolt.strokePath();
        if (this.settings.flashes) this.cameras.main.flash(60, 180, 170, 255);
      }
    }

    // alerta de perigo
    if (gap < ESCAPE.DANGER_GAP_M && !this.gameOverPending) {
      this.dangerTimer -= dt;
      if (this.dangerTimer <= 0) {
        this.dangerTimer = 0.9;
        SFXManager.play('warning');
        this.effects.shake(0.004, 120);
      }
    }
  }

  // Dados lidos pela HUDScene a cada frame (objeto reaproveitado)
  getHudState() {
    const h = this._hud;
    const sc = this.score;
    h.mode = this.modeId;
    h.score = sc.displayScore;
    h.best = Math.max(sc.bestScore, sc.displayScore);
    h.distance = sc.distance;
    h.multiplier = sc.multiplier;
    h.streak = sc.streak;
    h.dashRatio = this.truck.dashReadyRatio;
    h.jumpReady = this.truck.jumpReady;
    Object.assign(h, this.rules.hud());
    h.powerups.length = 0;
    const T = POWERUPS.TYPES;
    if (this.truck.hasShield) h.powerups.push({ label: T.shield.label, color: T.shield.color, ratio: this.truck.shieldTimer / T.shield.duration });
    if (this.truck.isBoosting) h.powerups.push({ label: T.boost.label, color: T.boost.color, ratio: this.truck.boostTimer / T.boost.duration });
    if (this.truck.hasMagnet) h.powerups.push({ label: T.magnet.label, color: T.magnet.color, ratio: this.truck.magnetTimer / T.magnet.duration });
    h.fps = this.game.loop.actualFps;
    return h;
  }
}
