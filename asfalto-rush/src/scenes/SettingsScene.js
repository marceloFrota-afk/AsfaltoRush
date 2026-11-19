// =============================================================
// SettingsScene — áudio e ACESSIBILIDADE (salvos no localStorage).
// ◀ ▶ ou ENTER alteram valores. ESC volta.
// =============================================================
import { SCENES, GAME_WIDTH, GAME_HEIGHT, FONT, UI_COLORS } from '../config/gameConfig.js';
import { InputManager } from '../systems/InputManager.js';
import { StorageManager } from '../systems/StorageManager.js';
import { AudioManager, MusicManager } from '../systems/AudioManager.js';
import { MenuList } from '../ui/MenuList.js';
import { pixelText, panel, footerHint, prepareCamera } from '../ui/UIFactory.js';

const SHAKE_MODES = ['normal', 'reduced', 'off'];
const SHAKE_LABEL = { normal: 'NORMAL', reduced: 'REDUZIDO', off: 'DESLIGADO' };
const onOff = (v) => (v ? 'ON' : 'OFF');

export class SettingsScene extends Phaser.Scene {
  constructor() { super(SCENES.SETTINGS); }

  create() {
    prepareCamera(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x14121f);
    panel(this, GAME_WIDTH / 2, 182, 420, 300);
    pixelText(this, GAME_WIDTH / 2, 22, 'CONFIGURAÇÕES', { size: FONT.MEDIUM, color: UI_COLORS.ACCENT });

    const S = () => StorageManager.getSettings();
    const set = (patch) => { StorageManager.updateSettings(patch); AudioManager.applySettings(); };
    const toggle = (key) => () => set({ [key]: !S()[key] });
    const vol = (d) => () => set({ masterVolume: Math.round(Phaser.Math.Clamp(S().masterVolume + d, 0, 1) * 10) / 10 });
    const shake = (d) => () => {
      const i = SHAKE_MODES.indexOf(S().shake);
      set({ shake: SHAKE_MODES[(i + d + SHAKE_MODES.length) % SHAKE_MODES.length] });
    };
    this.confirmReset = false;

    this.inputs = new InputManager(this);
    this.menu = new MenuList(this, GAME_WIDTH / 2, 56, [
      { label: () => `MÚSICA: ${onOff(S().musicOn)}`, onLeft: toggle('musicOn'), onRight: toggle('musicOn') },
      { label: () => `EFEITOS SONOROS: ${onOff(S().sfxOn)}`, onLeft: toggle('sfxOn'), onRight: toggle('sfxOn') },
      { label: () => `VOLUME: < ${Math.round(S().masterVolume * 100)}% >`, onLeft: vol(-0.1), onRight: vol(0.1) },
      { label: () => `TREMOR DE TELA: ${SHAKE_LABEL[S().shake]}`, onLeft: shake(-1), onRight: shake(1) },
      { label: () => `ALTO CONTRASTE: ${onOff(S().highContrast)}`, onLeft: toggle('highContrast'), onRight: toggle('highContrast') },
      { label: () => `PARTÍCULAS/RASTRO: ${onOff(S().particles)}`, onLeft: toggle('particles'), onRight: toggle('particles') },
      { label: () => `FLASHES DE TELA: ${onOff(S().flashes)}`, onLeft: toggle('flashes'), onRight: toggle('flashes') },
      { label: () => `MOSTRAR FPS: ${onOff(S().showFps)}`, onLeft: toggle('showFps'), onRight: toggle('showFps') },
      {
        label: () => (this.confirmReset ? 'CONFIRMAR? ENTER APAGA' : 'APAGAR RECORDES'),
        onSelect: () => {
          if (!this.confirmReset) { this.confirmReset = true; return; }
          StorageManager.resetRecords();
          this.confirmReset = false;
          this.toast('RECORDES APAGADOS');
        }
      },
      { label: 'VOLTAR', onSelect: () => this._back() }
    ], { inputs: this.inputs, spacing: 25, onBack: () => this._back() });

    pixelText(this, GAME_WIDTH / 2, 322, 'Remapeamento de teclas: em breve', { color: UI_COLORS.TEXT_DIM, stroke: false });
    footerHint(this, '< > ALTERAR   ENTER SELECIONAR   ESC VOLTAR');
    this.toastT = pixelText(this, GAME_WIDTH / 2, 306, '', { color: UI_COLORS.GOOD }).setAlpha(0);
    MusicManager.play('menu');
  }

  toast(msg) {
    this.toastT.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toastT, alpha: 0, delay: 1200, duration: 400 });
  }

  _back() { this.scene.start(SCENES.MENU); }

  update(time, delta) {
    this.inputs.update();
    const prevIndex = this.menu.index;
    this.menu.update(delta / 1000);
    if (this.menu.index !== prevIndex && this.confirmReset) { this.confirmReset = false; this.menu.refresh(); }
  }
}
