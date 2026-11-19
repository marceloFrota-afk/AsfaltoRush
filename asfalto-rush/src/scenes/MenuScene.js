// =============================================================
// MenuScene — estado MENU. Logo, fundo animado da rodovia e
// opções: JOGAR, MODOS DE JOGO, COMO JOGAR, CONFIGURAÇÕES, CRÉDITOS.
// =============================================================
import { SCENES, GAME_STATE, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS, GAME_TITLE, GAME_VERSION, DEPTH } from '../config/gameConfig.js';
import { RoadManager } from '../systems/RoadManager.js';
import { InputManager } from '../systems/InputManager.js';
import { MusicManager } from '../systems/AudioManager.js';
import { StorageManager } from '../systems/StorageManager.js';
import { MenuList } from '../ui/MenuList.js';
import { pixelText, panel, footerHint, prepareCamera } from '../ui/UIFactory.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super(SCENES.MENU); }

  create() {
    this.registry.set('state', GAME_STATE.MENU);
    prepareCamera(this);
    const settings = StorageManager.getSettings();
    this.road = new RoadManager(this, { highContrast: settings.highContrast, speedLines: false });

    // caminhão de demonstração "dirigindo"
    this.demoTruck = this.add.sprite(GAME_WIDTH / 2 + 96, 290, 'truck', 0).setDepth(DEPTH.TRUCK);
    if (this.anims.exists('truck_drive')) this.demoTruck.play('truck_drive');
    this.demoShadow = this.add.image(this.demoTruck.x + 3, this.demoTruck.y + 4, 'truck_shadow').setDepth(DEPTH.TRUCK_SHADOW);
    this.t = 0;

    // escurece levemente o fundo
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0a14, 0.35).setDepth(50);

    // ---------- logo ----------
    const logoY = 62;
    const logo = pixelText(this, GAME_WIDTH / 2, logoY, GAME_TITLE, { size: FONT.HUGE, color: UI_COLORS.ACCENT })
      .setDepth(55).setStroke('#14121f', 8);
    const sub = pixelText(this, GAME_WIDTH / 2, logoY + 32, 'ARCADE DE ESTRADA', { color: UI_COLORS.INFO }).setDepth(55);
    this.tweens.add({ targets: logo, y: logoY - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sub, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });

    panel(this, GAME_WIDTH / 2, 205, 260, 136).setDepth(52);

    this.inputs = new InputManager(this);
    this.leaving = false;
    const go = (key, data) => {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(160, 11, 10, 20);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
    };
    this.menu = new MenuList(this, GAME_WIDTH / 2, 160, [
      { label: 'JOGAR', onSelect: () => go(SCENES.MODE_SELECT) },
      { label: 'MODOS DE JOGO', onSelect: () => go(SCENES.MODE_SELECT, { info: true }) },
      { label: 'COMO JOGAR', onSelect: () => go(SCENES.HOW_TO) },
      { label: 'CONFIGURAÇÕES', onSelect: () => go(SCENES.SETTINGS) },
      { label: 'CRÉDITOS', onSelect: () => go(SCENES.CREDITS) }
    ], { inputs: this.inputs, spacing: 22 });
    [...this.menu.texts, this.menu.cursor].forEach((t) => t.setDepth(56));

    const rec = StorageManager.getRecord('endless');
    pixelText(this, GAME_WIDTH / 2, 292, `RECORDE: ${rec.score}  |  ${rec.distance} m`, { color: UI_COLORS.TEXT_DIM }).setDepth(55);
    footerHint(this, 'SETAS/WASD  NAVEGAR   ENTER  SELECIONAR').setDepth(55);
    pixelText(this, GAME_WIDTH - 6, GAME_HEIGHT - 6, 'v' + GAME_VERSION, { color: UI_COLORS.TEXT_DIM, stroke: false, origin: 1 }).setDepth(55);

    MusicManager.play('menu');
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.t += dt;
    this.inputs.update();
    if (!this.leaving) this.menu.update(dt);
    this.road.update(dt, 160 * dt, 160, 0);
    // caminhão "dançando" entre faixas
    this.demoTruck.x = GAME_WIDTH / 2 + 96 + Math.sin(this.t * 0.8) * 60;
    this.demoTruck.angle = Math.cos(this.t * 0.8) * 4;
    this.demoShadow.setPosition(this.demoTruck.x + 3, this.demoTruck.y + 4);
  }
}
