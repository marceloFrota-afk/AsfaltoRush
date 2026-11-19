// =============================================================
// RoadManager.js — rodovia infinita e cenário.
//  - tiles rolantes (grama, acostamento, asfalto, faixas)
//  - árvores/vegetação laterais recicladas (pooling)
//  - marcos de quilometragem e linhas de velocidade
// Usado na GameScene e como fundo animado do menu.
// =============================================================
import { ROAD, GAME_WIDTH, GAME_HEIGHT, DEPTH, DESPAWN_Y } from '../config/gameConfig.js';
import { FX, SPEED } from '../config/balance.js';
import { firstFrame } from '../art/textureUtils.js';

const TREE_POOL = 28;
const DECAL_POOL = 40;
const SPEEDLINE_POOL = 14;

export class RoadManager {
  constructor(scene, { highContrast = false, speedLines = true } = {}) {
    this.scene = scene;
    this.highContrast = highContrast;
    this.speedLinesEnabled = speedLines;
    this.time = 0;
    const H = GAME_HEIGHT;
    const sh = ROAD.SHOULDER;

    // ---------- camadas rolantes ----------
    // margem extra horizontal para o leve movimento da câmera
    this.grassL = scene.add.tileSprite(-20, 0, ROAD.X - sh + 20, H, 'grass').setOrigin(0).setDepth(DEPTH.GRASS);
    this.grassR = scene.add.tileSprite(ROAD.RIGHT + sh, 0, GAME_WIDTH - ROAD.RIGHT - sh + 20, H, 'grass').setOrigin(0).setDepth(DEPTH.GRASS);
    this.gravelL = scene.add.tileSprite(ROAD.X - sh, 0, sh, H, 'gravel').setOrigin(0).setDepth(DEPTH.ROAD);
    this.gravelR = scene.add.tileSprite(ROAD.RIGHT, 0, sh, H, 'gravel').setOrigin(0).setDepth(DEPTH.ROAD);
    this.asphalt = scene.add.tileSprite(ROAD.X, 0, ROAD.WIDTH, H, 'asphalt').setOrigin(0).setDepth(DEPTH.ROAD);

    this.edges = [
      scene.add.tileSprite(ROAD.X + 2, 0, 4, H, 'edge_line').setOrigin(0).setDepth(DEPTH.ROAD_MARKS),
      scene.add.tileSprite(ROAD.RIGHT - 6, 0, 4, H, 'edge_line').setOrigin(0).setDepth(DEPTH.ROAD_MARKS)
    ];
    this.dashes = [];
    for (let i = 1; i < ROAD.LANES; i++) {
      const x = ROAD.X + i * ROAD.LANE_WIDTH - 2;
      this.dashes.push(scene.add.tileSprite(x, 0, 4, H, 'lane_dash').setOrigin(0).setDepth(DEPTH.ROAD_MARKS));
    }
    this.scrolling = [this.grassL, this.grassR, this.gravelL, this.gravelR, this.asphalt, ...this.edges, ...this.dashes];

    // ---------- pools de cenário ----------
    this.trees = [];
    for (let i = 0; i < TREE_POOL; i++) {
      const t = scene.add.image(0, 0, 'tree_round').setVisible(false).setDepth(DEPTH.TREE);
      t.active = false; t.phase = 0;
      this.trees.push(t);
    }
    this.decals = [];
    for (let i = 0; i < DECAL_POOL; i++) {
      const d = scene.add.image(0, 0, 'tuft').setVisible(false).setDepth(DEPTH.DECAL);
      d.active = false;
      this.decals.push(d);
    }
    this.speedLines = [];
    for (let i = 0; i < SPEEDLINE_POOL; i++) {
      const s = scene.add.image(0, 0, 'speedline').setVisible(false).setDepth(DEPTH.SPEEDLINES).setScale(1, 2);
      s.active = false;
      this.speedLines.push(s);
    }
    this.kmPost = scene.add.image(ROAD.RIGHT + 5, GAME_HEIGHT + 100, 'km_post').setDepth(DEPTH.DECAL);
    this.kmText = scene.add.text(ROAD.RIGHT + 12, GAME_HEIGHT + 100, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#ffffff'
    }).setDepth(DEPTH.DECAL).setOrigin(0, 0.5);
    this.nextKm = 100;

    this.treeTimerL = 0;
    this.treeTimerR = 0;
    this.decalTimer = 0;
    this.applyContrast(highContrast);
    this._prewarm();
  }

  // popula a tela inteira no início para não começar vazio
  _prewarm() {
    for (let y = -40; y < GAME_HEIGHT + 40; y += 46) {
      this._spawnTree('L', y + Math.random() * 30);
      this._spawnTree('R', y + Math.random() * 30);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 22) this._spawnDecal(y + Math.random() * 20);
  }

  _spawnTree(side, y) {
    const t = this.trees.find((o) => !o.active);
    if (!t) return;
    const key = Math.random() < 0.55 ? 'tree_round' : 'tree_pine';
    const margin = 30;
    const x = side === 'L'
      ? Phaser.Math.Between(4, ROAD.X - ROAD.SHOULDER - margin)
      : Phaser.Math.Between(ROAD.RIGHT + ROAD.SHOULDER + margin, GAME_WIDTH - 4);
    t.setTexture(key, firstFrame(this.scene, key)).setPosition(x, y).setVisible(true).setAngle(0);
    t.setScale(0.85 + Math.random() * 0.3);
    t.baseScale = t.scaleX;
    t.phase = Math.random() * Math.PI * 2;
    t.active = true;
  }

  _spawnDecal(y) {
    const d = this.decals.find((o) => !o.active);
    if (!d) return;
    const r = Math.random();
    const key = r < 0.4 ? 'tuft' : r < 0.65 ? 'flowers' : r < 0.85 ? 'bush' : 'stone';
    const left = Math.random() < 0.5;
    const x = left
      ? Phaser.Math.Between(4, ROAD.X - ROAD.SHOULDER - 8)
      : Phaser.Math.Between(ROAD.RIGHT + ROAD.SHOULDER + 8, GAME_WIDTH - 4);
    d.setTexture(key, firstFrame(this.scene, key)).setPosition(x, y).setVisible(true);
    d.active = true;
  }

  /**
   * @param dt segundos
   * @param dy deslocamento do mundo (px)
   * @param speed velocidade atual (para linhas de velocidade)
   * @param meters distância total (marcos de km)
   */
  update(dt, dy, speed = 0, meters = 0) {
    this.time += dt;
    for (const s of this.scrolling) s.tilePositionY -= dy;

    // árvores: balanço sutil + reciclagem
    for (const t of this.trees) {
      if (!t.active) continue;
      t.y += dy;
      t.setAngle(Math.sin(this.time * 1.6 + t.phase) * 2);
      t.setScale(t.baseScale * (1 + Math.sin(this.time * 2.1 + t.phase) * 0.02));
      if (t.y > DESPAWN_Y) { t.active = false; t.setVisible(false); }
    }
    for (const d of this.decals) {
      if (!d.active) continue;
      d.y += dy;
      if (d.y > DESPAWN_Y) { d.active = false; d.setVisible(false); }
    }

    this.treeTimerL -= dy;
    this.treeTimerR -= dy;
    this.decalTimer -= dy;
    if (this.treeTimerL <= 0) { this._spawnTree('L', -40); this.treeTimerL = Phaser.Math.Between(34, 70); }
    if (this.treeTimerR <= 0) { this._spawnTree('R', -40); this.treeTimerR = Phaser.Math.Between(34, 70); }
    if (this.decalTimer <= 0) { this._spawnDecal(-20); this.decalTimer = Phaser.Math.Between(14, 30); }

    // marco de distância a cada 100 m
    this.kmPost.y += dy;
    this.kmText.y = this.kmPost.y;
    if (meters + 30 >= this.nextKm && this.kmPost.y > GAME_HEIGHT + 20) {
      this.kmPost.y = -30;
      this.kmText.y = -30;
      this.kmText.setText(this.nextKm + 'm');
      this.nextKm += 100;
    }

    this._updateSpeedLines(dt, dy, speed);
  }

  _updateSpeedLines(dt, dy, speed) {
    const ratio = speed / SPEED.MAX;
    const show = this.speedLinesEnabled && ratio > FX.SPEEDLINE_THRESHOLD;
    for (const s of this.speedLines) {
      if (!s.active) continue;
      s.y += dy * 1.6;
      if (s.y > GAME_HEIGHT + 40) { s.active = false; s.setVisible(false); }
    }
    if (show && Math.random() < (ratio - FX.SPEEDLINE_THRESHOLD) * 3) {
      const s = this.speedLines.find((o) => !o.active);
      if (s) {
        const left = Math.random() < 0.5;
        const x = left ? Phaser.Math.Between(10, ROAD.X - 20) : Phaser.Math.Between(ROAD.RIGHT + 20, GAME_WIDTH - 10);
        s.setPosition(x, -30).setVisible(true).setAlpha(0.35 + Math.random() * 0.3);
        s.active = true;
      }
    }
  }

  applyContrast(on) {
    this.highContrast = on;
    if (on) {
      this.asphalt.setTint(0x777777);
      this.grassL.setTint(0x99aa99); this.grassR.setTint(0x99aa99);
    } else {
      this.asphalt.clearTint();
      this.grassL.clearTint(); this.grassR.clearTint();
    }
  }
}
