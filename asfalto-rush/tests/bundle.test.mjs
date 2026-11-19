// Executa o bundle standalone com Phaser mockado e verifica que o jogo inicializa.
import fs from 'fs';
import vm from 'vm';
import { installPhaser } from './phaserMock.mjs';
installPhaser();
let created = null;
Phaser.Game = class { constructor(cfg){ created = cfg; } };
const ctx = { Phaser, console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Math, JSON, Map, Set, Object, Array, Number, String, Proxy,
  localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
  document: { fonts: { load: () => Promise.resolve() }, getElementById: () => null },
};
ctx.window = ctx; ctx.globalThis = ctx;
ctx.addEventListener = () => {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/bundle.debug.js','utf8'), ctx);
await new Promise(r=>setTimeout(r,50));
if (!created) throw new Error('Phaser.Game não foi criado');
console.log('Game criado com', created.scene.length, 'cenas:', created.scene.map(s=>new s().key).join(', '));
console.log('escala', created.scale.mode === Phaser.Scale.FIT ? 'FIT' : '?', created.width+'x'+created.height, 'pixelArt', created.pixelArt);
