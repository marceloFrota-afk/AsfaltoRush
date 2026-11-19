// =============================================================
// BootScene — estado BOOT.
// 1) tenta carregar assets externos opcionais (manifesto);
// 2) gera pixel art procedural para tudo que estiver faltando;
// 3) cria animações e segue para o menu.
// =============================================================
import { SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, UI_COLORS } from '../config/gameConfig.js';
import { EXTERNAL_ASSETS } from '../config/assets.js';
import { PixelArtFactory } from '../art/PixelArtFactory.js';
import { StorageManager } from '../systems/StorageManager.js';
import { AudioManager } from '../systems/AudioManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }

  preload() {
    this.registry.set('state', GAME_STATE.BOOT);
    // barra de carregamento simples
    const w = 240, h = 8;
    const x = (GAME_WIDTH - w) / 2, y = GAME_HEIGHT / 2;
    const bg = this.add.rectangle(x, y, w, h, 0x2b2d37).setOrigin(0, 0.5);
    const bar = this.add.rectangle(x, y, 1, h, UI_COLORS.ACCENT_HEX).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = Math.max(1, w * p); });
    this.load.on('complete', () => { bg.destroy(); bar.destroy(); });
    // arquivo ausente não quebra o jogo: placeholder procedural assume
    this.load.on('loaderror', (file) => {
      console.warn(`[Asfalto Rush] asset opcional não encontrado: ${file.key} — usando placeholder.`);
    });

    EXTERNAL_ASSETS.forEach((a) => {
      if (a.type === 'spritesheet') {
        this.load.spritesheet(a.key, a.url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
      } else if (a.type === 'image') {
        this.load.image(a.key, a.url);
      } else if (a.type === 'audio') {
        this.load.audio(a.key, a.url);
      }
    });
  }

  create() {
    const settings = StorageManager.getSettings();
    const factory = new PixelArtFactory(this);
    factory.generateAll(settings);
    factory.createAnimations();
    AudioManager.applySettings();
    this.scene.start(SCENES.MENU);
  }
}
