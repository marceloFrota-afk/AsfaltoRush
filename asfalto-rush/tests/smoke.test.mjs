import { installPhaser, makeGame, attach, calls } from './phaserMock.mjs';
installPhaser();
globalThis.localStorage = (()=>{ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k) }; })();

const { BootScene } = await import('../src/scenes/BootScene.js');
const { MenuScene } = await import('../src/scenes/MenuScene.js');
const { ModeSelectScene } = await import('../src/scenes/ModeSelectScene.js');
const { HowToPlayScene } = await import('../src/scenes/HowToPlayScene.js');
const { SettingsScene } = await import('../src/scenes/SettingsScene.js');
const { CreditsScene } = await import('../src/scenes/CreditsScene.js');
const { GameScene } = await import('../src/scenes/GameScene.js');
const { HUDScene } = await import('../src/scenes/HUDScene.js');
const { PauseScene } = await import('../src/scenes/PauseScene.js');
const { GameOverScene } = await import('../src/scenes/GameOverScene.js');
const { StorageManager } = await import('../src/systems/StorageManager.js');
const KC = Phaser.Input.Keyboard.KeyCodes;

const game = makeGame();
function run(Cls, data, frames=60, perFrame=null){
  const s = attach(new Cls(), game);
  game.scenes[s.key]=s;
  s.init && s.init(data||{});
  s.preload && s.preload();
  s.create();
  for(let i=0;i<frames;i++){ perFrame && perFrame(i,s); s.update && s.update(i*16.7,16.7); s._tick(16.7); }
  return s;
}
run(BootScene);
console.log('texturas:', Object.keys(game.textures).length, 'anims:', Object.keys(game.anims).length);
run(MenuScene,null,120);
run(ModeSelectScene,{info:true},30);
run(HowToPlayScene,null,10); run(CreditsScene,null,10);
const st = run(SettingsScene,null,10);
st.menu.items.forEach((it,i)=>{ st.menu.index=i; if(it.onRight) it.onRight(); if(it.onLeft) it.onLeft(); });
console.log('settings ok', JSON.stringify(StorageManager.getSettings()).length>10);

for (const mode of ['endless','timeattack','escape']) {
  game.ops.length=0;
  let finished=null;
  const gs = run(GameScene,{mode},0);
  const hud = run(HUDScene,{mode},0);
  let f=0, maxMult=1, hits=0, jumps=0;
  gs.events.on('truck:jump',()=>jumps++);
  const origHit = gs._onHit.bind(gs); gs._onHit=(o)=>{hits++; origHit(o);};
  // simula um "jogador" simples: desvia pelo centro da faixa mais segura, pula e dá dash às vezes
  for (f=0; f<60*240 && !finished; f++) {
    game.keysDown.clear();
    const t=gs.truck;
    const threats = gs.obstacles.active.filter(o=>o.y < t.y && o.y > t.y-160 && Math.abs(o.x-t.x)<50);
    if (threats.length) game.keysDown.add(threats[0].x > t.x ? KC.A : KC.D);
    if (threats.some(o=>o.category==='HOLE') && f%3===0) game.keysDown.add(KC.SPACE);
    if (f%200===0) game.keysDown.add(KC.SHIFT);
    if (f%900===450) { game.keysDown.add(KC.ESC); }
    gs.update(f*16.7,16.7); gs._tick(16.7);
    hud.update(f*16.7,16.7);
    maxMult=Math.max(maxMult, gs.score.multiplier);
    const start = game.ops.find(o=>o[0]==='start' && o[1]==='GameOverScene');
    if (start) finished=start[2];
    // se pausou, testa a cena de pausa e retoma
    const p = game.ops.findIndex(o=>o[0]==='launch'&&o[1]==='PauseScene');
    if (p>=0){ game.ops.splice(p,1); const ps=run(PauseScene,{mode},3); ps._resume(); gs.inputs.resetHeld(); }
  }
  // NaN checks
  const t=gs.truck;
  if(!Number.isFinite(t.x+t.y+t.speed)) throw new Error('truck NaN');
  console.log(`[${mode}] frames=${f} tempo=${gs.score.time.toFixed(1)}s dist=${gs.score.distance}m score=${gs.score.displayScore} mult_max=x${maxMult} batidas=${hits} pulos=${jumps} desvios=${gs.score.dodges} buracosPulados=${gs.score.holesJumped} engrenagens=${gs.score.gears} obst.ativos=${gs.obstacles.active.length} fim=${finished?finished.reason:'(rodando)'}`);
  if (!finished) { gs._triggerGameOver('TESTE',{wreck:true}); for(let i=0;i<120;i++){gs.update(0,16.7);gs._tick(16.7);} finished = game.ops.find(o=>o[0]==='start'&&o[1]==='GameOverScene')?.[2]; }
  const go = run(GameOverScene, finished, 30);
  go.menu.items[0].onSelect();
  console.log('  gameover ->', JSON.stringify(game.ops.at(-1).slice(0,2)), 'record salvo:', JSON.stringify(StorageManager.getRecord(mode)));
  gs.events.emit('shutdown');
}
// persistência: recarrega StorageManager "do zero" lendo o mesmo localStorage
const raw = JSON.parse(localStorage.getItem('asfaltoRush.records.v1'));
console.log('localStorage records:', JSON.stringify(raw));
console.log('métodos não mockados chamados:', [...calls.missing].join(', ') || 'nenhum');
