// =============================================================
// Obstacle.js — obstáculo reciclável (object pooling).
// A definição (tipo, hitbox, severidade, pulável) vem de
// balance.js → OBSTACLE_TYPES. A textura pode ser procedural
// ou PNG externo, sem mudar a lógica.
// =============================================================
import { DEPTH, ROAD, GAME_WIDTH } from '../config/gameConfig.js';
import { firstFrame, frameSize } from '../art/textureUtils.js';

export class Obstacle {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(-100, -100, 'cone').setVisible(false).setActive(false);
    this.hitbox = new Phaser.Geom.Rectangle();
    this.active = false;
    this.id = null;
    this.def = null;
  }

  spawn(id, def, x, y, { highContrast = false, dir = 1 } = {}) {
    const tex = this.scene.textures;
    const baseKey = def.texture;
    const hcKey = baseKey + '_hc';
    const useHc = highContrast && tex.exists(hcKey);
    const key = useHc ? hcKey : baseKey;

    this.id = id;
    this.def = def;
    this.category = def.category;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.active = true;
    this.passed = false;       // já passou pelo caminhão
    this.collided = false;
    this.jumpedOver = false;   // estava sob o caminhão no ar

    // tamanho lógico = frame da textura BASE (hitbox não muda no alto contraste)
    const size = frameSize(this.scene, baseKey);
    this.w = size.w;
    this.h = size.h;
    this.hitW = this.w * def.hit[0];
    this.hitH = this.h * def.hit[1];

    const s = this.sprite;
    s.setTexture(key, firstFrame(this.scene, key)).setPosition(x, y).setVisible(true).setActive(true)
      .setAlpha(1).setAngle(0).setScale(1).setFlipX(false).clearTint();
    s.setDepth(def.category === 'HOLE' ? DEPTH.HOLE : DEPTH.OBSTACLE);

    if (def.anim) {
      const animKey = useHc ? def.anim + '_hc' : def.anim;
      if (this.scene.anims.exists(animKey)) s.play(animKey);
      this.vx = (def.walkSpeed || 50) * dir;
      s.setFlipX(dir < 0);
    } else {
      s.stop();
    }
    this._updateHitbox();
    return this;
  }

  update(dt, worldDy) {
    this.y += worldDy;
    if (this.vx) {
      this.x += this.vx * dt;
      if (this.x < -40 || this.x > GAME_WIDTH + 40) this.vx = 0;
    }
    this.sprite.setPosition(this.x, this.y);
    this._updateHitbox();
  }

  _updateHitbox() {
    this.hitbox.setTo(this.x - this.hitW / 2, this.y - this.hitH / 2, this.hitW, this.hitH);
  }

  // Está sobre o asfalto (animais fora da pista não colidem)
  get onRoad() { return this.x > ROAD.X - 10 && this.x < ROAD.RIGHT + 10; }

  release() {
    this.active = false;
    this.sprite.stop();
    this.sprite.setVisible(false).setActive(false);
  }
}
