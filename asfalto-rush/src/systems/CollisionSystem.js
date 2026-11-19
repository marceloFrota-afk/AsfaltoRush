// =============================================================
// CollisionSystem.js — colisões separadas por CATEGORIA.
//  TRUCK x OBSTACLE  : dano (exceto se pulável e caminhão no ar)
//  TRUCK x HOLE      : dano SOMENTE se truck.isJumping === false
//  TRUCK x POWERUP   : coleta (sem colisão física)
//  TRUCK x COLLECTIBLE: coleta (sem colisão física)
//  TRUCK x ENVIRONMENT: árvores/bordas = limite (clamp no Truck)
// Também detecta "desvios" (obstáculo passou sem bater).
// =============================================================

export const CATEGORY = {
  TRUCK: 'TRUCK',
  OBSTACLE: 'OBSTACLE',
  HOLE: 'HOLE',
  POWERUP: 'POWERUP',
  COLLECTIBLE: 'COLLECTIBLE',
  ENVIRONMENT: 'ENVIRONMENT'
};

const overlaps = (a, b) => Phaser.Geom.Intersects.RectangleToRectangle(a, b);

export class CollisionSystem {
  /**
   * handlers: { onHit(obstacle), onDodge(obstacle), onJumpOver(obstacle),
   *             onCollect(collectible), onPowerUp(powerup) }
   */
  constructor(handlers) {
    this.h = handlers;
  }

  // Regra central: este obstáculo machuca o caminhão agora?
  static canHurt(truck, o) {
    if (o.category === CATEGORY.HOLE) return truck.isJumping === false;
    if (o.def.jumpable && truck.isJumping) return false;
    return true;
  }

  update(truck, obstacleManager, pickupManager) {
    if (!truck.alive) return;
    const tb = truck.hitbox;

    // ----- obstáculos e buracos -----
    const list = obstacleManager.active;
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if (!o.active || o.collided) continue;

      if (o.onRoad && overlaps(tb, o.hitbox)) {
        if (CollisionSystem.canHurt(truck, o)) {
          // durante a invulnerabilidade o obstáculo é ignorado (sem dano e sem bônus)
          o.collided = true;
          if (!truck.isInvulnerable) this.h.onHit(o);
          continue;
        } else if (truck.isJumping) {
          o.jumpedOver = true;
        }
      }

      // passou pelo caminhão sem colidir → desvio
      if (!o.passed && o.hitbox.y > tb.bottom) {
        o.passed = true;
        if (o.jumpedOver && o.category === CATEGORY.HOLE) this.h.onJumpOver(o);
        else this.h.onDodge(o);
      }
    }

    // ----- coletáveis -----
    for (const c of pickupManager.collectibles) {
      if (c.active && overlaps(tb, c.hitbox)) {
        this.h.onCollect(c);
        c.release();
      }
    }
    // ----- power-ups -----
    for (const p of pickupManager.powerups) {
      if (p.active && overlaps(tb, p.hitbox)) {
        this.h.onPowerUp(p);
        p.release();
      }
    }
  }
}
