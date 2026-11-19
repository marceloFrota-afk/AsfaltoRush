// =============================================================
// Truck.js — SOMENTE o comportamento do caminhão (movimento,
// pulo, dash, estados de dano/power-up) + sua apresentação.
// Não conhece teclas: recebe ações do InputManager.
// Emite eventos na cena: truck:jump, truck:land, truck:dash, truck:edge
// =============================================================
import { TRUCK, JUMP, DASH, DAMAGE, SPEED } from '../config/balance.js';
import { ROAD, DEPTH } from '../config/gameConfig.js';

const GHOSTS = 6;

export class Truck {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = SPEED.BASE;      // velocidade de avanço (px/s) = rolagem do mundo
    this.z = 0;                   // altura do pulo

    this.jumpState = 'ground';    // ground | prep | air
    this.jumpTimer = 0;
    this.jumpCooldown = 0;
    this.landTimer = 0;

    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = 0;
    this.trailTimer = 0;

    this.invulnTimer = 0;
    this.stunTimer = 0;
    this.hitFlashTimer = 0;
    this.boostTimer = 0;
    this.shieldTimer = 0;
    this.magnetTimer = 0;
    this.alive = true;
    this.trailEnabled = true;
    this._edgeCooldown = 0;

    this.minX = ROAD.X + ROAD.EDGE_MARGIN + TRUCK.HITBOX_W / 2;
    this.maxX = ROAD.RIGHT - ROAD.EDGE_MARGIN - TRUCK.HITBOX_W / 2;

    this.hitbox = new Phaser.Geom.Rectangle(0, 0, TRUCK.HITBOX_W, TRUCK.HITBOX_H);

    // ---------- apresentação ----------
    this.shadow = scene.add.image(x, y, 'truck_shadow').setDepth(DEPTH.TRUCK_SHADOW);
    this.sprite = scene.add.sprite(x, y, 'truck', 0).setDepth(DEPTH.TRUCK);
    // origem no centro do CORPO (as 4 últimas linhas do frame são a chama do dash)
    const fh = this.sprite.frame.height || 60;
    this.sprite.setOrigin(0.5, fh >= 56 ? 26 / fh : 0.5);
    this._playAnim('truck_drive');
    this.shieldSprite = scene.add.image(x, y, 'shield_bubble').setDepth(DEPTH.TRUCK + 1).setVisible(false);

    this.ghosts = [];
    for (let i = 0; i < GHOSTS; i++) {
      const g = scene.add.image(0, 0, 'truck', 0).setDepth(DEPTH.TRAIL).setVisible(false)
        .setOrigin(this.sprite.originX, this.sprite.originY);
      g.life = 0;
      this.ghosts.push(g);
    }
    this._syncView();
  }

  // ---------------- estados ----------------
  get isJumping() { return this.jumpState === 'air'; }
  get isGrounded() { return this.jumpState !== 'air'; }
  get isDashing() { return this.dashTimer > 0; }
  get isInvulnerable() { return this.invulnTimer > 0; }
  get hasShield() { return this.shieldTimer > 0; }
  get isBoosting() { return this.boostTimer > 0; }
  get hasMagnet() { return this.magnetTimer > 0; }
  get dashReadyRatio() { return 1 - Math.max(0, this.dashCooldown) / DASH.COOLDOWN; }
  get jumpReady() { return this.jumpState === 'ground' && this.jumpCooldown <= 0; }

  // ---------------- ações ----------------
  tryJump() {
    if (!this.alive || !this.jumpReady) return false;
    this.jumpState = 'prep';
    this.jumpTimer = JUMP.PREP_DURATION;
    return true;
  }

  tryDash(dirX = 0) {
    if (!this.alive || this.dashCooldown > 0 || this.isDashing) return false;
    this.dashTimer = DASH.DURATION;
    this.dashCooldown = DASH.COOLDOWN;
    this.dashDir = Math.sign(dirX);
    this.trailTimer = 0;
    this.scene.events.emit('truck:dash', this);
    return true;
  }

  resetDash() { this.dashCooldown = 0; }

  applyHit(stunTime = DAMAGE.STUN_TIME, invuln = DAMAGE.INVULNERABLE_TIME) {
    this.invulnTimer = invuln;
    this.stunTimer = stunTime;
    this.hitFlashTimer = 0.25;
    this.speed *= DAMAGE.STUN_SPEED_MULT;
    this.vx *= 0.3;
  }

  // Usado quando o escudo absorve: sem perda de velocidade
  absorbHit() {
    this.shieldTimer = 0;
    this.invulnTimer = 0.6;
  }

  wreck() {
    this.alive = false;
    this.dashTimer = 0;
    this.vx = 0;
    this.shieldTimer = 0;
    this._playAnim('truck_wreck');
  }

  // Para sem destruir (tempo esgotado / alcançado pela tempestade)
  halt() {
    this.alive = false;
    this.dashTimer = 0;
    this.vx = 0;
  }

  setShield(d) { this.shieldTimer = d; }
  setBoost(d) { this.boostTimer = d; }
  setMagnet(d) { this.magnetTimer = d; }

  // ---------------- simulação ----------------
  /**
   * @param dt segundos
   * @param input InputManager (moveX/moveY)
   * @param baseSpeed velocidade base vinda do DifficultyManager
   * @param speedMult multiplicador extra do modo (ex.: lentidão na Fuga)
   */
  update(dt, input, baseSpeed, speedMult = 1) {
    // timers
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);
    this._edgeCooldown = Math.max(0, this._edgeCooldown - dt);

    const mx = this.alive ? input.moveX : 0;
    const my = this.alive ? input.moveY : 0;

    // ----- velocidade de avanço (aceleração suave) -----
    let throttle = 1;
    if (my < 0) throttle = 1 + (TRUCK.THROTTLE_UP - 1) * -my;
    else if (my > 0) throttle = 1 - (1 - TRUCK.THROTTLE_DOWN) * my;
    let target = baseSpeed * throttle * speedMult;
    if (this.isBoosting) target *= SPEED.BOOST_MULT;
    if (this.stunTimer > 0) target *= DAMAGE.STUN_SPEED_MULT;
    if (!this.alive) target = 0;

    if (this.isDashing) {
      // impulso imediato
      this.speed = Math.max(this.speed, baseSpeed * speedMult * DASH.SPEED_MULT);
    } else if (this.speed < target) {
      this.speed = Math.min(target, this.speed + TRUCK.SPEED_ACCEL * dt);
    } else {
      this.speed = Math.max(target, this.speed - TRUCK.SPEED_DECEL * dt);
    }

    // ----- lateral (arcade com pequena inércia) -----
    if (this.isDashing && this.dashDir !== 0) {
      this.vx = this.dashDir * DASH.LATERAL_SPEED;
    } else {
      const targetVx = mx * TRUCK.LATERAL_MAX;
      const accel = mx !== 0 ? TRUCK.LATERAL_ACCEL : TRUCK.LATERAL_DECEL;
      this.vx = approach(this.vx, targetVx, accel * dt);
    }
    this.x += this.vx * dt;
    if (this.x < this.minX || this.x > this.maxX) {
      this.x = Phaser.Math.Clamp(this.x, this.minX, this.maxX);
      if (Math.abs(this.vx) > 60 && this._edgeCooldown <= 0) {
        this.scene.events.emit('truck:edge', this);
        this._edgeCooldown = 0.12;
      }
      this.vx = 0;
    }

    // ----- vertical (posição na tela) -----
    const targetVy = my * TRUCK.VERTICAL_MAX;
    this.vy = approach(this.vy, targetVy, (my !== 0 ? TRUCK.VERTICAL_ACCEL : TRUCK.VERTICAL_DECEL) * dt);
    this.y = Phaser.Math.Clamp(this.y + this.vy * dt, TRUCK.MIN_Y, TRUCK.MAX_Y);
    if (this.y === TRUCK.MIN_Y || this.y === TRUCK.MAX_Y) this.vy = 0;

    // ----- pulo -----
    if (this.jumpState === 'prep') {
      this.jumpTimer -= dt;
      if (this.jumpTimer <= 0) {
        this.jumpState = 'air';
        this.jumpTimer = JUMP.AIR_DURATION;
        this.scene.events.emit('truck:jump', this);
      }
    } else if (this.jumpState === 'air') {
      this.jumpTimer -= dt;
      const p = 1 - Math.max(0, this.jumpTimer) / JUMP.AIR_DURATION;
      this.z = Math.sin(p * Math.PI) * JUMP.HEIGHT;
      if (this.jumpTimer <= 0) {
        this.z = 0;
        this.jumpState = 'ground';
        this.jumpCooldown = JUMP.COOLDOWN;
        this.landTimer = JUMP.LAND_SQUASH;
        this.scene.events.emit('truck:land', this);
      }
    }

    // ----- dash -----
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = DASH.TRAIL_INTERVAL;
        if (this.trailEnabled) this._spawnGhost();
      }
      if (this.dashTimer === 0 && Math.abs(this.vx) > TRUCK.LATERAL_MAX) {
        this.vx = Math.sign(this.vx) * TRUCK.LATERAL_MAX;
      }
    }

    // hitbox justa centrada na posição no CHÃO
    this.hitbox.setTo(this.x - TRUCK.HITBOX_W / 2, this.y - TRUCK.HITBOX_H / 2, TRUCK.HITBOX_W, TRUCK.HITBOX_H);
  }

  // ---------------- apresentação ----------------
  _playAnim(key) {
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  _spawnGhost() {
    const g = this.ghosts.find((o) => !o.visible);
    if (!g) return;
    g.setTexture('truck', this.sprite.frame.name)
      .setPosition(this.sprite.x, this.sprite.y)
      .setScale(this.sprite.scaleX, this.sprite.scaleY)
      .setAngle(this.sprite.angle)
      .setTint(0x9be7ff)
      .setAlpha(0.55)
      .setVisible(true);
    g.life = 0.22;
  }

  updateView(dt, worldDy) {
    // fantasmas do dash descem com o mundo e somem
    for (const g of this.ghosts) {
      if (!g.visible) continue;
      g.life -= dt;
      g.y += worldDy * 0.6;
      g.alpha = Math.max(0, g.life / 0.22) * 0.55;
      if (g.life <= 0) g.setVisible(false);
    }
    this._syncView();
  }

  _syncView() {
    const s = this.sprite;
    const zN = this.z / JUMP.HEIGHT;
    let sx = 1 + zN * JUMP.SCALE_BONUS;
    let sy = sx;
    if (this.jumpState === 'prep') { sx *= 1.08; sy *= 0.9; }
    if (this.landTimer > 0) { sx *= 1.06; sy *= 0.93; }
    s.setPosition(this.x, this.y - this.z);
    s.setScale(sx, sy);
    s.setAngle(this.alive ? (this.vx / TRUCK.LATERAL_MAX) * TRUCK.TILT_MAX_DEG * 0.6 : s.angle);
    s.setDepth(this.isJumping ? DEPTH.TRUCK_AIR : DEPTH.TRUCK);

    // animação
    if (this.alive) {
      if (this.hitFlashTimer > 0) this._playAnim('truck_hit');
      else if (this.isDashing) this._playAnim('truck_dash');
      else if (this.isJumping) this._playAnim('truck_jump');
      else this._playAnim('truck_drive');
      s.anims.timeScale = Phaser.Math.Clamp(this.speed / SPEED.BASE, 0.3, 3);
      // piscar durante invulnerabilidade
      s.setAlpha(this.invulnTimer > 0 && Math.floor(this.invulnTimer * 18) % 2 === 0 ? 0.35 : 1);
    } else {
      s.setAlpha(1);
    }

    // sombra fica no chão
    this.shadow.setPosition(this.x + 3, this.y + 4);
    this.shadow.setScale(1 - zN * 0.25);
    this.shadow.setAlpha(1 - zN * 0.45);

    // escudo (pisca nos últimos 2s)
    const showShield = this.shieldTimer > 0 && (this.shieldTimer > 2 || Math.floor(this.shieldTimer * 8) % 2 === 0);
    this.shieldSprite.setVisible(showShield).setPosition(s.x, s.y).setScale(sx);
    this.shieldSprite.setDepth(s.depth + 1);
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0; this.z = 0;
    this.speed = SPEED.BASE;
    this.jumpState = 'ground';
    this.alive = true;
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.shieldSprite.destroy();
    this.ghosts.forEach((g) => g.destroy());
  }
}

function approach(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  if (v > target) return Math.max(target, v - step);
  return v;
}
