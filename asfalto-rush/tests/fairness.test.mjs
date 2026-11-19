// Bot que lê a pista e escolhe faixas livres: se padrões fossem impossíveis, ele bateria.
import { installPhaser, makeGame, attach } from './phaserMock.mjs';
installPhaser();
globalThis.localStorage = (()=>{ const m=new Map(); return { getItem:k=>m.get(k)??null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k) }; })();
const { BootScene } = await import('../src/scenes/BootScene.js');
const { GameScene } = await import('../src/scenes/GameScene.js');
const { ROAD, laneCenter } = await import('../src/config/gameConfig.js');
const { TRUCK } = await import('../src/config/balance.js');
const KC = Phaser.Input.Keyboard.KeyCodes;
const game = makeGame();
const boot = attach(new BootScene(), game); boot.preload(); boot.create();

let total = { runs:0, time:0, hits:0, jumpRows:0 };
for (let run=0; run<8; run++) {
  const gs = attach(new GameScene(), game); gs.init({mode:'endless'}); gs.create();
  const { DAMAGE } = await import('../src/config/balance.js');
  gs.rules.lives = 999; // não morrer: medir batidas
  let hits=0; const oh=gs._onHit.bind(gs); gs._onHit=(o)=>{hits++; if(false){dumped=true; console.log("TRACE hit", o.id, "obs x",o.x.toFixed(0),"hb",o.hitbox.x.toFixed(0),o.hitbox.right.toFixed(0),"y",o.hitbox.y.toFixed(0),o.hitbox.bottom.toFixed(0)); trace.slice(-30).forEach(l=>console.log("  ",l));} if(false) console.log("   hit", o.id, "t="+gs.score.time.toFixed(1), "spd="+gs.truck.speed.toFixed(0), "truckX="+gs.truck.x.toFixed(0), "obsX="+o.x.toFixed(0), "air="+gs.truck.isJumping, "jumpCd="+gs.truck.jumpCooldown.toFixed(2), "state="+gs.truck.jumpState); oh(o);};
  let R=[]; let target = gs.truck.x; let noPath=0; const trace=[]; let dumped=false;
  for (let f=0; f<60*240; f++) {
    game.keysDown.clear();
    const t = gs.truck;
    // ---- bot com busca de caminho (programação dinâmica sobre as próximas fileiras) ----
    const ahead = gs.obstacles.active.filter(o=>!o.passed && o.onRoad && o.hitbox.y < t.hitbox.bottom);
    ahead.sort((a,b)=>b.y-a.y);
    const rows=[]; for (const o of ahead){ const r=rows.find(r=>Math.abs(r[0].y-o.y)<4); r? r.push(o) : rows.push([o]); }
    R = rows.slice(0,5);
    if (R.length) {
      const isJump = (r)=> r.length===ROAD.LANES && r.every(o=>o.category==='HOLE');
      const pad = TRUCK.HITBOX_W/2 + 3;
      const free = R.map(r => Array.from({length:ROAD.LANES},(_,l)=>{ if(isJump(r)) return true; const x=laneCenter(l);
        return !r.some(o=>{ const eta=Math.max(0,t.y-o.y)/Math.max(1,t.speed); const px=o.x+(o.vx||0)*eta; const hw=o.hitW/2;
          return (x>o.hitbox.x-pad && x<o.hitbox.right+pad) || (x>px-hw-pad && x<px+hw+pad); }); }));
      const curLane = Math.round((t.x - ROAD.X - ROAD.LANE_WIDTH/2)/ROAD.LANE_WIDTH);
      const reachTo = (dy)=> Math.floor(TRUCK.LATERAL_MAX*0.7*Math.max(0,dy-80)/(gs.difficulty.params.speed*1.15)/ROAD.LANE_WIDTH);
      // custo[i][l] = menor deslocamento total para estar na faixa l na fileira i
      const time0 = Math.max(0, t.hitbox.y - R[0][0].hitbox.bottom) / Math.max(1, t.speed);
      let cost = Array.from({length:ROAD.LANES},(_,l)=> { const d=Math.abs(laneCenter(l)-t.x); return free[0][l] && d <= TRUCK.LATERAL_MAX*0.8*time0 + 6 ? d : Infinity; });
      const prev=[];
      for (let i=1;i<R.length;i++){ const k=reachTo(R[i-1][0].y - R[i][0].y); const nc=[]; const pv=[];
        for (let l=0;l<ROAD.LANES;l++){ nc[l]=Infinity; if(!free[i][l]) continue;
          for (let m=Math.max(0,l-k); m<=Math.min(ROAD.LANES-1,l+k); m++){ const c=cost[m]+Math.abs(l-m)*64; if(c<nc[l]){nc[l]=c;pv[l]=m;} } }
        prev.push(pv); cost=nc; }
      let l=-1, bc=Infinity; cost.forEach((c,i)=>{ if(c<bc){bc=c;l=i;} });
      if (l>=0){ for (let i=prev.length-1;i>=0;i--) l=prev[i][l]; target=laneCenter(l); } else { noPath++; if(false) console.log('   SEM CAMINHO t='+gs.score.time.toFixed(1), JSON.stringify(free.map(r=>r.map(b=>b?1:0).join(''))), 'gaps', JSON.stringify(R.map((r,i)=>i?Math.round(R[i-1][0].y-r[0].y):Math.round(t.y-r[0].y))), 'lane', curLane); }
      if (isJump(R[0])) { const dist = t.hitbox.y - R[0][0].hitbox.bottom; if (dist < t.speed*0.12 && dist > -10) game.keysDown.add(KC.SPACE); }
    }
    const stop = (t.vx*t.vx)/(2*TRUCK.LATERAL_DECEL) + 2;
    const d = target - t.x;
    if (Math.abs(d) > stop && Math.abs(d) > 2) game.keysDown.add(d < 0 ? KC.A : KC.D);
    if (false) trace.push(`f${f} x=${gs.truck.x.toFixed(0)} vx=${gs.truck.vx.toFixed(0)} tgt=${target.toFixed(0)} y=${gs.truck.y.toFixed(0)} rows=${typeof R!=='undefined'?R.length:0} r0=${(typeof R!=='undefined'&&R.length)? R[0].map(o=>o.id+'@'+o.x.toFixed(0)+'/'+o.hitbox.y.toFixed(0)).join(','):''} keys=${[...game.keysDown].join(',')}`);
    gs.update(f*16.7,16.7); gs._tick(16.7);
  }
  total.runs++; total.time+=gs.score.time; total.hits+=hits;
  console.log(`noPath=${noPath} run ${run}: ${gs.score.time.toFixed(0)}s, ${gs.score.distance}m, vel=${gs.difficulty.params.speed.toFixed(0)}px/s, batidas=${hits}, buracosPulados=${gs.score.holesJumped}, desvios=${gs.score.dodges}`);
  gs.events.emit('shutdown');
}
console.log('TOTAL', JSON.stringify(total));
