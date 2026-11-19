// Mock mínimo do Phaser 3 para smoke tests no Node (sem navegador).
import { EventEmitter } from 'events';

class Rect { constructor(x=0,y=0,w=0,h=0){this.setTo(x,y,w,h);} setTo(x,y,w,h){this.x=x;this.y=y;this.width=w;this.height=h;return this;}
  get bottom(){return this.y+this.height;} get right(){return this.x+this.width;} static Contains(){return false;} }
const KeyCodes = {}; ['A','D','W','S','LEFT','RIGHT','UP','DOWN','SPACE','SHIFT','ESC','P','ENTER','BACKSPACE'].forEach((k,i)=>KeyCodes[k]=100+i);

export const calls = { missing: new Set() };
function chain(target){
  return new Proxy(target,{ get(t,p){ if (p in t) return t[p]; if (typeof p==='symbol') return undefined;
    calls.missing.add(t.constructor.name+'.'+String(p)); return (...a)=>prox; } });
  var prox;
}
class GO {
  constructor(scene,x=0,y=0,key){ this.scene=scene;this.x=x;this.y=y;this.visible=true;this.alpha=1;this.scaleX=1;this.scaleY=1;this.angle=0;this.depth=0;
    this.width=16;this.height=16;this.active=true;this.originX=0.5;this.originY=0.5;this.flipX=false;this.texture={key};
    this.frame={name:0,width:28,height:60};this.anims={timeScale:1,isPlaying:false};this.style={color:'#fff'};this.tilePositionX=0;this.tilePositionY=0;this.text='';
    const self=new Proxy(this,{get(t,p){ if(p in t) return t[p]; if(typeof p==='symbol') return undefined; calls.missing.add('GO.'+String(p)); return ()=>self; }}); this._self=self; return self; }
  setPosition(x,y){this.x=x; if(y!==undefined)this.y=y; return this._self;}
  setVisible(v){this.visible=v;return this._self;} setAlpha(a){this.alpha=a;return this._self;}
  setScale(x,y){this.scaleX=x;this.scaleY=y??x;return this._self;} get scale(){return this.scaleX;} set scale(v){this.scaleX=this.scaleY=v;}
  setAngle(a){this.angle=a;return this._self;} setDepth(d){this.depth=d;return this._self;}
  setOrigin(x,y){ if(typeof x!=='number' && x!==undefined) throw new Error('setOrigin non-number'); this.originX=x??0.5;this.originY=y??this.originX;return this._self;}
  setTexture(k,f){ if(!this.scene.textures.exists(k)) throw new Error('missing texture '+k); this.texture={key:k};this.frame={name:f??0,width:28,height:60};return this._self;}
  setText(t){this.text=t;return this._self;} setColor(c){this.style.color=c;return this._self;}
  play(k){ if(!this.scene.anims.exists(k)) throw new Error('missing anim '+k); this.anims.isPlaying=true; return this._self;} stop(){return this._self;}
  setActive(a){this.active=a;return this._self;} destroy(){this.destroyed=true;}
  on(){return this._self;} once(){return this._self;}
}
class Graphics extends GO {}
class Container extends GO { add(){return this._self;} }
class Emitter extends GO { explode(n,x,y){ if(!Number.isFinite(x)||!Number.isFinite(y)) throw new Error('explode NaN'); return this._self;} setParticleTint(){return this._self;} }
class Texture { constructor(){this.frames={'__BASE':{width:16,height:16}};} has(n){return n in this.frames;} get(n){return this.frames[n]??this.frames.__BASE;}
  add(n,s,x,y,w,h){this.frames[n]={width:w,height:h,name:n};} refresh(){} getContext(){return {fillRect(){},set fillStyle(v){ if(typeof v!=='string') throw new Error('bad color');}, imageSmoothingEnabled:false};} }
export class Scene {
  constructor(key){ this.key=key; }
}
export function installPhaser(){
  globalThis.Phaser = {
    Scene, AUTO:0, Scale:{FIT:1,CENTER_BOTH:1},
    Geom:{ Rectangle:Rect, Intersects:{ RectangleToRectangle:(a,b)=> !(a.right<b.x||a.x>b.right||a.bottom<b.y||a.y>b.bottom) } },
    Math:{ Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), Between:(a,b)=>a+Math.floor(Math.random()*(b-a+1)) },
    Input:{ Keyboard:{ KeyCodes } }
  };
}
// Ambiente compartilhado (texturas/animações globais como no Phaser)
export function makeGame(){
  const textures={}; const anims={};
  const game = { textures, anims, scenes:{}, ops:[], keysDown:new Set(), loop:{actualFps:60}, device:{input:{touch:false}}, registry:new Map() };
  return game;
}
export function attach(scene, game){
  const s=scene;
  s.game=game;
  s.events=new EventEmitter();
  s.registry={ get:(k)=>game.registry.get(k), set:(k,v)=>game.registry.set(k,v) };
  s.textures={ exists:(k)=>k in game.textures, get:(k)=>game.textures[k], createCanvas:(k)=>{ if(k in game.textures) throw new Error('dup texture '+k); return game.textures[k]=new Texture(); } };
  s.anims={ exists:(k)=>k in game.anims, create:(c)=>{ c.frames.forEach(f=>{ if(!game.textures[f.key]?.has(f.frame)) throw new Error('anim frame missing '+f.key+':'+f.frame);}); game.anims[c.key]=c; } };
  const timers=[];
  s.time={ delayedCall:(ms,cb)=>{timers.push({t:ms,cb});}, addEvent:()=>({}) , _timers:timers };
  s.tweens={ add:(c)=>{ if(c.onComplete) timers.push({t:c.delay||0+ (c.duration||0),cb:c.onComplete}); return {}; }, killTweensOf(){} };
  const cam = new GO(s); Object.assign(cam,{scrollX:0,scrollY:0}); cam.shake=(d,i)=>{ if(!Number.isFinite(i)) throw new Error('shake NaN'); }; cam.flash=()=>{}; cam.fadeIn=()=>{}; cam.fadeOut=()=>{}; cam.resetFX=()=>{}; cam.setScroll=(x,y)=>{cam.scrollX=x;cam.scrollY=y;}; cam.once=(e,cb)=>{ timers.push({t:0,cb}); }; cam.setBackgroundColor=()=>{};
  s.cameras={ main: cam };
  const keys={};
  s.input={ keyboard:{ addKey:(code)=>{ return keys[code] ||= { code, get isDown(){ return game.keysDown.has(code);} }; }, removeKey(){}, resetKeys(){} },
    gamepad:null, once(){}, addPointer(){} };
  s.scale={ gameSize:{width:640,height:360} };
  const mk=(C)=>(...a)=>new C(s,...a);
  s.add={ image:(x,y,k)=>{ if(!game.textures[k]) throw new Error('image missing texture '+k); return new GO(s,x,y,k);},
    sprite:(x,y,k)=>{ if(!game.textures[k]) throw new Error('sprite missing texture '+k); return new GO(s,x,y,k);},
    text:(x,y,t)=>{const g=new GO(s,x,y); g.text=t; g.width=String(t).length*8; return g;},
    tileSprite:(x,y,w,h,k)=>{ if(!game.textures[k]) throw new Error('tile missing '+k); return new GO(s,x,y,k);},
    rectangle:mk(GO), graphics:mk(Graphics), container:mk(Container),
    particles:(x,y,k)=>{ if(!game.textures[k]) throw new Error('particles missing '+k); return new Emitter(s,x,y,k);}, existing:(o)=>o };
  s.load={ on(){}, spritesheet(){}, image(){}, audio(){} };
  s.sys={ game, isActive:()=>true, settings:{active:true} };
  s.scene={ start:(k,d)=>game.ops.push(['start',k,d]), launch:(k,d)=>game.ops.push(['launch',k,d]), stop:(k)=>game.ops.push(['stop',k??s.key]),
    pause:(k)=>game.ops.push(['pause',k??s.key]), resume:(k)=>game.ops.push(['resume',k]), get:(k)=>game.scenes[k], bringToTop(){}, isActive:()=>true };
  s._tick=(ms)=>{ for(let i=timers.length-1;i>=0;i--){ timers[i].t-=ms; if(timers[i].t<=0){ const cb=timers.splice(i,1)[0].cb; cb(); } } };
  return s;
}
