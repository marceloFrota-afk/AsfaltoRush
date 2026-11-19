// Renderiza toda a pixel art procedural em PNG (pré-visualização / checagem)
import zlib from 'zlib';
import fs from 'fs';
import { ART_REGISTRY, drawTruck } from '../src/art/sprites.js';

function parseColor(c) {
  if (c.startsWith('#')) return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16),255];
  const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(Number);
  return [p[0],p[1],p[2],Math.round((p[3]??1)*255)];
}
function png(w,h,rgba){
  const crc=(b)=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}let x=0xffffffff;for(const v of b)x=t[(x^v)&255]^(x>>>8);return (x^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const S=4, items=[['truck',drawTruck()],...Object.entries(ART_REGISTRY).map(([k,f])=>[k,f()])];
let x=4,y=4,rowH=0;const W=900;const placed=[];
for(const [k,a] of items){for(const f of a.frames){if(x+f.w*S>W){x=4;y+=rowH+6;rowH=0;}placed.push([f,x,y]);x+=f.w*S+6;rowH=Math.max(rowH,f.h*S);}}
const H=y+rowH+4;const buf=Buffer.alloc(W*H*4);
for(let i=0;i<W*H;i++){const cx=(i%W>>3)+((i/W|0)>>3);const v=cx%2?70:85;buf[i*4]=v;buf[i*4+1]=v+10;buf[i*4+2]=v;buf[i*4+3]=255;}
for(const [f,ox,oy] of placed)for(let j=0;j<f.h;j++)for(let i=0;i<f.w;i++){const c=f.data[j*f.w+i];if(!c)continue;const [r,g,b,al]=parseColor(c);for(let dy=0;dy<S;dy++)for(let dx=0;dx<S;dx++){const p=((oy+j*S+dy)*W+(ox+i*S+dx))*4;const a=al/255;buf[p]=r*a+buf[p]*(1-a);buf[p+1]=g*a+buf[p+1]*(1-a);buf[p+2]=b*a+buf[p+2]*(1-a);}}
fs.writeFileSync('tests/art_preview.png',png(W,H,buf));
// checagem de mapas
console.log('frames:',placed.length,'size',W,H);
