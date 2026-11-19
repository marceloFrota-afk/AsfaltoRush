// =============================================================
// ObstacleManager.js — criação e RECICLAGEM de obstáculos.
// Decide quando gerar uma fileira (gap em px), calcula o alcance
// lateral do caminhão e delega o padrão ao PatternGenerator
// (que garante rota segura). Usa object pooling.
// =============================================================
import { Obstacle } from '../entities/Obstacle.js';
import { PatternGenerator } from './PatternGenerator.js';
import { OBSTACLE_TYPES, SPAWN, TRUCK } from '../config/balance.js';
import { ROAD, SPAWN_Y, DESPAWN_Y, laneCenter } from '../config/gameConfig.js';

export class ObstacleManager {
  constructor(scene, { highContrast = false, onRowSpawned = null } = {}) {
    this.scene = scene;
    this.highContrast = highContrast;
    this.onRowSpawned = onRowSpawned;
    this.pool = [];
    for (let i = 0; i < SPAWN.MAX_OBSTACLES; i++) this.pool.push(new Obstacle(scene));
    this.active = [];
    this.generator = new PatternGenerator(ROAD.LANES);
    this.reset();
  }

  reset() {
    this.active.forEach((o) => o.release());
    this.active.length = 0;
    this.generator.reset();
    this.distSinceRow = 0;
    this.nextGap = SPAWN.FIRST_ROW_DELAY_PX;
    this.plannedType = 'normal';
    this.timeSinceJumpRow = 99;
    this.elapsed = 0;
    this.enabled = true;
  }

  _acquire() {
    const o = this.pool.find((p) => !p.active);
    return o || null; // pool cheio: ignora (nunca deve ocorrer com o tamanho padrão)
  }

  /**
   * @param dt     segundos
   * @param worldDy deslocamento do mundo no frame (px)
   * @param params parâmetros do DifficultyManager
   */
  update(dt, worldDy, params) {
    this.elapsed += dt;
    this.timeSinceJumpRow += dt;

    // movimenta e recicla
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.update(dt, worldDy);
      if (o.y > DESPAWN_Y) {
        o.release();
        this.active.splice(i, 1);
      }
    }

    if (!this.enabled) return;
    this.distSinceRow += worldDy;
    if (this.distSinceRow >= this.nextGap) {
      this._spawnRow(params);
    }
  }

  _spawnRow(params) {
    const gapUsed = this.distSinceRow;
    this.distSinceRow = 0;

    // alcance lateral (em faixas) desde a fileira anterior.
    // Pior caso: jogador segurando W (acelerando) → menos tempo para desviar.
    const fastest = params.speed * TRUCK.THROTTLE_UP;
    const freeTime = Math.max(0, gapUsed - SPAWN.ROW_CLEARANCE_PX) / fastest;
    const reach = Math.floor((TRUCK.LATERAL_MAX * SPAWN.REACH_SAFETY * freeTime) / ROAD.LANE_WIDTH);

    const type = this.plannedType;
    const row = this.generator.generate(type, params, reach);
    if (type === 'jump') this.timeSinceJumpRow = 0;

    for (const ob of row.obstacles) {
      const def = OBSTACLE_TYPES[ob.id];
      if (!def) continue;
      const o = this._acquire();
      if (!o) break;
      // centro do conjunto de faixas ocupado
      let x = laneCenter(ob.lane) + (ob.lanes - 1) * ROAD.LANE_WIDTH / 2;
      let dir = 1;
      if (ob.id === 'animal') {
        // atravessa a pista a partir de uma das bordas
        dir = Math.random() < 0.5 ? 1 : -1;
        x = dir > 0 ? ROAD.X + 8 : ROAD.RIGHT - 8;
      } else if (ob.lanes === 1 && type === 'normal') {
        x += (Math.random() * 2 - 1) * SPAWN.LANE_JITTER;
      }
      o.spawn(ob.id, def, x, SPAWN_Y, { highContrast: this.highContrast, dir });
      this.active.push(o);
    }

    // planeja a próxima fileira e o gap
    const jumpAllowed = this.timeSinceJumpRow >= SPAWN.JUMP_ROW_MIN_INTERVAL && type !== 'jump';
    this.plannedType = this.generator.planType(params, { jumpAllowed });
    const rowTime = params.rowTimeMin + Math.random() * (params.rowTimeMax - params.rowTimeMin);
    let gap = rowTime * params.speed;               // segundos → pixels
    const speed = params.speed * TRUCK.THROTTLE_UP;
    if (this.plannedType === 'jump') gap = Math.max(gap, speed * SPAWN.JUMP_ROW_LEAD_TIME);
    if (type === 'jump') gap = Math.max(gap, speed * SPAWN.JUMP_ROW_EXIT_TIME);
    if (type === 'animal') gap = Math.max(gap, speed * SPAWN.ANIMAL_EXIT_TIME);
    this.nextGap = gap;

    if (this.onRowSpawned) this.onRowSpawned(row, SPAWN_Y, gap);
  }

  // Remove um obstáculo específico (após colisão)
  destroyObstacle(o) {
    const i = this.active.indexOf(o);
    if (i >= 0) this.active.splice(i, 1);
    o.release();
  }

  setHighContrast(v) { this.highContrast = v; }
}
