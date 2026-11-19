// =============================================================
// PatternGenerator.js — gera fileiras de obstáculos GARANTINDO
// que sempre exista ao menos uma rota segura.
//
// Ideia: mantemos o conjunto R de faixas "alcançáveis e seguras".
// Para a próxima fileira, dilatamos R pelo alcance lateral k
// (quantas faixas o caminhão consegue cruzar no tempo entre as
// fileiras). Pelo menos uma faixa desse conjunto dilatado N fica
// livre na nova fileira; R' = faixas livres ∩ N (nunca vazio).
//
// Fileiras especiais:
//  - 'jump'  : buracos em TODAS as faixas (só passa pulando);
//              só é gerada com tempo de leitura e sem pulo recente.
//  - 'animal': um animal atravessando; o resto da pista livre.
//
// Sem dependência do Phaser (testado em tests/).
// =============================================================
import { OBSTACLE_TYPES } from '../config/balance.js';

export class PatternGenerator {
  constructor(laneCount, rng = Math.random) {
    this.laneCount = laneCount;
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.reachable = this._all();
  }

  _all() { return Array.from({ length: this.laneCount }, (_, i) => i); }

  _randInt(a, b) { return a + Math.floor(this.rng() * (b - a + 1)); }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  _weighted(pool) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = this.rng() * total;
    for (const p of pool) { if ((r -= p.weight) <= 0) return p; }
    return pool[pool.length - 1];
  }

  // Dilata conjunto de faixas por k
  dilate(set, k) {
    const out = new Set();
    set.forEach((l) => {
      for (let d = -k; d <= k; d++) {
        const n = l + d;
        if (n >= 0 && n < this.laneCount) out.add(n);
      }
    });
    return [...out].sort((a, b) => a - b);
  }

  // Decide o TIPO da próxima fileira (para o chamador ajustar o gap antes)
  planType(params, { jumpAllowed = false } = {}) {
    if (jumpAllowed && params.jumpRowChance > 0 && this.rng() < params.jumpRowChance) return 'jump';
    if (params.animalChance > 0 && this.rng() < params.animalChance) return 'animal';
    return 'normal';
  }

  /**
   * Gera a fileira.
   * @param type  'normal' | 'jump' | 'animal'
   * @param params { maxBlocked, fill, pool:[{id,weight}] }
   * @param reach  faixas alcançáveis desde a fileira anterior (>=0)
   * @returns { type, obstacles:[{id, lane, lanes}], safeLanes:[...], freeLanes:[...] }
   */
  generate(type, params, reach) {
    const N = this.dilate(this.reachable, Math.max(0, reach));

    if (type === 'jump') {
      const obstacles = this._all().map((lane) => ({ id: 'hole_l', lane, lanes: 1 }));
      // todas atravessáveis pulando; R' = N
      this.reachable = N;
      return { type, obstacles, safeLanes: N.slice(), freeLanes: [] };
    }

    if (type === 'animal') {
      const lane = this._randInt(0, this.laneCount - 1);
      this.reachable = N;
      return { type, obstacles: [{ id: 'animal', lane, lanes: 1 }], safeLanes: N.slice(), freeLanes: N.slice() };
    }

    // ---------- fileira normal ----------
    // GARANTIA FORTE: de QUALQUER faixa segura atual existe uma faixa
    // livre alcançável na nova fileira (nunca há "beco sem saída").
    const k = Math.max(0, reach);
    const guaranteed = new Set();
    const prev = this.reachable.slice();
    for (let i = prev.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [prev[i], prev[j]] = [prev[j], prev[i]];
    }
    for (const r of prev) {
      let covered = false;
      guaranteed.forEach((g) => { if (Math.abs(g - r) <= k) covered = true; });
      if (covered) continue;
      const lo = Math.max(0, r - k), hi = Math.min(this.laneCount - 1, r + k);
      guaranteed.add(this._randInt(lo, hi));
    }

    const maxBlocked = Math.max(0, Math.min(params.maxBlocked, this.laneCount - guaranteed.size));
    let nBlocked = maxBlocked > 0 ? this._randInt(1, maxBlocked) : 0;
    if (nBlocked > 1 && this.rng() > params.fill) nBlocked--;

    const candidates = this._all().filter((l) => !guaranteed.has(l));
    // embaralha
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const blocked = new Set(candidates.slice(0, nBlocked));

    const obstacles = [];
    const occupied = new Set();
    const pool = params.pool && params.pool.length ? params.pool : [{ id: 'cone', weight: 1 }];
    const sortedBlocked = [...blocked].sort((a, b) => a - b);

    for (const lane of sortedBlocked) {
      if (occupied.has(lane)) continue;
      // tenta algumas vezes encaixar um tipo (multi-faixa precisa de sequência bloqueada)
      let placed = false;
      for (let attempt = 0; attempt < 4 && !placed; attempt++) {
        const choice = this._weighted(pool);
        const def = OBSTACLE_TYPES[choice.id];
        if (!def) continue;
        const span = def.lanes;
        let ok = lane + span <= this.laneCount;
        for (let s = 0; ok && s < span; s++) {
          if (!blocked.has(lane + s) || occupied.has(lane + s)) ok = false;
        }
        if (!ok) continue;
        for (let s = 0; s < span; s++) occupied.add(lane + s);
        obstacles.push({ id: choice.id, lane, lanes: span });
        placed = true;
      }
      if (!placed) {
        // fallback: obstáculo de uma faixa
        const single = pool.filter((p) => OBSTACLE_TYPES[p.id] && OBSTACLE_TYPES[p.id].lanes === 1);
        const pick = single.length ? this._weighted(single).id : 'cone';
        occupied.add(lane);
        obstacles.push({ id: pick, lane, lanes: 1 });
      }
    }

    const free = this._all().filter((l) => !occupied.has(l));
    const safe = free.filter((l) => N.includes(l));
    this.reachable = safe.length ? safe : [...guaranteed]; // safe sempre contém as faixas garantidas
    return { type, obstacles, safeLanes: this.reachable.slice(), freeLanes: free };
  }
}
