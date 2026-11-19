// Testa: nunca gera padrão impossível (sempre há rota segura alcançável)
import { PatternGenerator } from '../src/systems/PatternGenerator.js';
import { DifficultyManager } from '../src/systems/DifficultyManager.js';
import { OBSTACLE_TYPES, TRUCK, SPAWN, JUMP, SPEED } from '../src/config/balance.js';
import { ROAD } from '../src/config/gameConfig.js';
import { seededRandom } from '../src/art/ArtCanvas.js';

let fails = 0, rows = 0, jumps = 0, animals = 0, blockedSum = 0, normalRows = 0;
for (let seed = 1; seed <= 200; seed++) {
  const rng = seededRandom(seed);
  const gen = new PatternGenerator(ROAD.LANES, rng);
  const diff = new DifficultyManager();
  let t = 0, m = 0, prevReach = gen.reachable.slice();
  for (let i = 0; i < 400; i++) {
    const p = diff.update(t, m);
    const gap = (p.rowTimeMin + rng() * (p.rowTimeMax - p.rowTimeMin)) * p.speed;
    const speed = p.speed * TRUCK.THROTTLE_UP;
    const tt = Math.max(0, gap - SPAWN.ROW_CLEARANCE_PX) / speed;
    const reach = Math.floor(TRUCK.LATERAL_MAX * SPAWN.REACH_SAFETY * tt / ROAD.LANE_WIDTH);
    const type = gen.planType(p, { jumpAllowed: true });
    const row = gen.generate(type, p, reach);
    rows++; if (type === 'jump') jumps++; if (type === 'animal') animals++;
    // checagens
    const N = gen.dilate(prevReach, reach);
    if (!row.safeLanes.length) { fails++; console.log('vazio', seed, i); }
    if (!row.safeLanes.every((l) => N.includes(l))) { fails++; console.log('inalcançável', seed, i); }
    // garantia forte: de TODA faixa segura anterior existe faixa segura alcançável
    if (!prevReach.every((r) => row.safeLanes.some((l) => Math.abs(l - r) <= reach))) { fails++; console.log('beco sem saída', seed, i); }
    if (type === 'normal') {
      const occ = new Set(); row.obstacles.forEach(o => { for (let s=0;s<o.lanes;s++){ if(occ.has(o.lane+s)){fails++;console.log('sobreposição');} occ.add(o.lane+s);} if(o.lane+o.lanes>ROAD.LANES){fails++;console.log('fora');} });
      if (row.safeLanes.some(l => occ.has(l))) { fails++; console.log('faixa segura ocupada', seed, i); }
      if (occ.size >= ROAD.LANES) { fails++; console.log('fileira fechada', seed, i); }
    }
    if (type === 'normal') { normalRows++; blockedSum += row.obstacles.reduce((s,o)=>s+o.lanes,0); }
    prevReach = row.safeLanes.slice();
    t += gap / p.speed; m += gap / 10;
  }
}
// Pulo físico: buraco grande cabe no tempo de ar na menor velocidade possível
const holeH = 12 * 2 * OBSTACLE_TYPES.hole_l.hit[1];
const minSpeed = SPEED.BASE * TRUCK.THROTTLE_DOWN;
const air = minSpeed * JUMP.AIR_DURATION;
console.log(`faixas bloqueadas/fileira=${(blockedSum/normalRows).toFixed(2)} linhas=${rows} pulos=${jumps} animais=${animals} falhas=${fails}`);
console.log(`pulo: distancia no ar=${air.toFixed(0)}px precisa>${(holeH + TRUCK.HITBOX_H).toFixed(0)}px ->`, air > holeH + TRUCK.HITBOX_H ? 'OK' : 'FALHA');
// largura: obstáculos multi-faixa cabem nas faixas
console.log('log 2 faixas:', (56+2)*2, '<=', 2*ROAD.LANE_WIDTH, '| árvore 3 faixas:', (88+2)*2, '<=', 3*ROAD.LANE_WIDTH);
// fileira de pulo: caminhão não passa entre buracos
console.log('vão entre buracos:', ROAD.LANE_WIDTH - 26*2*OBSTACLE_TYPES.hole_l.hit[0], '< hitbox', TRUCK.HITBOX_W);
process.exit(fails ? 1 : 0);
