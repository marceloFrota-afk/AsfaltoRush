// =============================================================
// PixelArtFactory.js — converte ArtCanvas em texturas Phaser.
// Só gera uma textura se a chave AINDA NÃO existir, permitindo
// que PNGs externos (config/assets.js) tenham prioridade.
// =============================================================
import { ART_PX } from '../config/gameConfig.js';
import { HIGH_CONTRAST_KEYS } from '../config/assets.js';
import { ART_REGISTRY, drawTruck } from './sprites.js';
import { TRUCK_SKINS, DEFAULT_SKIN } from '../config/cosmetics.js';

const HC_OUTLINE = '#fff23a';

export class PixelArtFactory {
  constructor(scene, px = ART_PX) {
    this.scene = scene;
    this.px = px;
  }

  // Cria textura (tira horizontal de frames) a partir de ArtCanvas[]
  createStrip(key, frames) {
    const textures = this.scene.textures;
    if (textures.exists(key)) return false;
    const fw = frames[0].w, fh = frames[0].h;
    const W = fw * this.px * frames.length;
    const H = fh * this.px;
    const tex = textures.createCanvas(key, W, H);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    frames.forEach((art, i) => {
      const ox = i * fw * this.px;
      for (let y = 0; y < art.h; y++) {
        for (let x = 0; x < art.w; x++) {
          const c = art.data[y * art.w + x];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(ox + x * this.px, y * this.px, this.px, this.px);
        }
      }
      // frames numéricos (0..n) — mesmo padrão de load.spritesheet
      tex.add(i, 0, ox, 0, fw * this.px, fh * this.px);
    });
    tex.refresh();
    return true;
  }

  // Gera todas as texturas procedurais que estiverem faltando
  generateAll(settings = {}) {
    const skin = TRUCK_SKINS[settings.truckSkin] || TRUCK_SKINS[DEFAULT_SKIN];
    this.createStrip('truck', drawTruck(skin.palette).frames);

    Object.entries(ART_REGISTRY).forEach(([key, fn]) => {
      const art = fn();
      const created = this.createStrip(key, art.frames);
      // variante de alto contraste só para texturas procedurais
      if (created && HIGH_CONTRAST_KEYS.includes(key)) {
        const hcFrames = art.frames.map((f) => f.padded(2).outline(HC_OUTLINE).outline(HC_OUTLINE));
        this.createStrip(key + '_hc', hcFrames);
      }
    });
  }

  // Cria animações (idempotente). Funciona com texturas geradas OU externas.
  createAnimations() {
    const anims = this.scene.anims;
    const make = (key, tex, frames, frameRate, repeat = -1) => {
      if (anims.exists(key) || !this.scene.textures.exists(tex)) return;
      anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate, repeat });
    };
    make('truck_drive', 'truck', [0, 1], 12);
    make('truck_jump', 'truck', [2], 1, 0);
    make('truck_dash', 'truck', [3, 4], 20);
    make('truck_hit', 'truck', [5, 0, 5, 0], 16, 0);
    make('truck_wreck', 'truck', [6], 1, 0);
    make('capy_walk', 'capybara', [0, 1], 6);
    make('capy_walk_hc', 'capybara_hc', [0, 1], 6);
    make('gear_spin', 'gear', [0, 1], 6);
  }
}
