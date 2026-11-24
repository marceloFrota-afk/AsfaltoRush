// =============================================================
// InputManager.js — camada de abstração de controles.
// A lógica do jogo só conhece AÇÕES (moveX, jump, dash...),
// nunca teclas. Provedores: Teclado, Gamepad (Xbox/PlayStation/
// genérico via Gamepad API) e Toque (estrutura pronta p/ mobile).
//
// Uso por cena:
//   this.inputs = new InputManager(this);
//   update() { this.inputs.update(); if (this.inputs.justPressed('jump')) ... }
// =============================================================
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_PAD_BINDINGS,
  DRAGONRISE_PAD_BINDINGS
} from '../config/gameConfig.js';
import { StorageManager } from './StorageManager.js';

export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'dash', 'pause', 'confirm', 'back'];

// ---------------- Teclado ----------------
class KeyboardProvider {
  constructor(scene, bindings) {
    this.scene = scene;
    this.keys = {};
    const kb = scene.input.keyboard;
    if (!kb) return;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    Object.entries(bindings).forEach(([action, names]) => {
      this.keys[action] = names
        .filter((n) => KC[n] !== undefined)
        .map((n) => kb.addKey(KC[n], true, false));
    });
  }

  read(state) {
    Object.entries(this.keys).forEach(([action, list]) => {
      if (list.some((k) => k.isDown)) state[action] = true;
    });
  }

  reset() {
    if (this.scene.input.keyboard) this.scene.input.keyboard.resetKeys();
  }

  destroy() {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    Object.values(this.keys).flat().forEach((k) => kb.removeKey(k, false));
    this.keys = {};
  }
}

// ---------------- Gamepad ----------------
class GamepadProvider {
  constructor(scene, bindings) {
    this.scene = scene;
    this.b = bindings;
  }

  _pad() {
    const gp = this.scene.input.gamepad;
    if (gp && typeof gp.getPad === 'function') {
      const pad = gp.getPad(0);
      if (pad && pad.connected !== false) return pad;
    }

    const pads = globalThis.navigator?.getGamepads?.();
    return pads ? Array.from(pads).find((pad) => pad && pad.connected !== false) || null : null;
  }

  read(state) {
    const pad = this._pad();
    if (!pad) return;
    const buttons = Array.isArray(pad.buttons) ? pad.buttons : [];
    const usesDragonRiseLayout = /(?:Vendor:\s*0079\s+Product:\s*0006|DragonRise Inc\. Generic USB Joystick)/i
      .test(pad.id || '');
    const bindings = usesDragonRiseLayout ? DRAGONRISE_PAD_BINDINGS : this.b;
    const btn = (i) => buttons[i] && buttons[i].pressed;
    ACTIONS.forEach((a) => {
      const list = bindings[a];
      if (list && list.some(btn)) state[a] = true;
    });
    const dz = bindings.stickDeadzone;
    const readAxis = (axis) => {
      const value = typeof axis === 'number'
        ? axis
        : axis && typeof axis.getValue === 'function'
          ? axis.getValue()
          : axis?.value;
      return Number.isFinite(value) ? value : 0;
    };
    const sx = Number.isFinite(pad.leftStick?.x) ? pad.leftStick.x : readAxis(pad.axes?.[0]);
    const sy = Number.isFinite(pad.leftStick?.y) ? pad.leftStick.y : readAxis(pad.axes?.[1]);
    if (sx < -dz) state.left = true;
    if (sx > dz) state.right = true;
    if (sy < -dz) state.up = true;
    if (sy > dz) state.down = true;
    // eixo analógico para movimento proporcional
    if (Math.abs(sx) > dz) state.axisX = sx;
    if (Math.abs(sy) > dz) state.axisY = sy;

    if (!usesDragonRiseLayout) {
      // Compatibilidade Xbox/genérica: face, ombros e start independente do mapping customizado.
      if (btn(0)) { state.jump = true; state.confirm = true; }
      if (btn(1) || btn(8)) state.back = true;
      if (btn(8) || btn(9)) state.pause = true;
      if (btn(2) || btn(3) || btn(4) || btn(5) || btn(6) || btn(7)) state.dash = true;
      if (btn(12)) state.up = true;
      if (btn(13)) state.down = true;
      if (btn(14)) state.left = true;
      if (btn(15)) state.right = true;
    }
  }

  reset() {}
  destroy() {}
}

// ---------------- Toque (mobile) ----------------
// Botões virtuais: ◀ ▶ (esquerda/baixo), PULO e DASH (direita), II (pausa).
// Ativado automaticamente em dispositivos com toque, apenas na GameScene.
class TouchProvider {
  constructor(scene, enabled) {
    this.scene = scene;
    this.held = {};
    this.objects = [];
    if (!enabled) return;
    scene.input.addPointer(2);
    const W = scene.scale.gameSize.width;
    const H = scene.scale.gameSize.height;
    const mk = (x, y, action, label, scale = 1) => {
      const img = scene.add.image(x, y, 'touch_btn').setScale(scale).setScrollFactor(0)
        .setDepth(60).setAlpha(0.75).setInteractive();
      const txt = scene.add.text(x, y, label, { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(61);
      const on = () => { this.held[action] = true; img.setAlpha(1); };
      const off = () => { this.held[action] = false; img.setAlpha(0.75); };
      img.on('pointerdown', on);
      img.on('pointerup', off);
      img.on('pointerout', off);
      this.objects.push(img, txt);
    };
    mk(40, H - 40, 'left', '<', 1.4);
    mk(110, H - 40, 'right', '>', 1.4);
    mk(W - 110, H - 40, 'dash', 'DASH', 1.4);
    mk(W - 40, H - 70, 'jump', 'PULO', 1.4);
    mk(W - 24, 60, 'pause', 'II', 0.8);
  }

  read(state) {
    Object.entries(this.held).forEach(([a, v]) => { if (v) state[a] = true; });
  }

  reset() { this.held = {}; }
  destroy() { this.objects.forEach((o) => o.destroy()); this.objects = []; }
}

// ---------------- Gerenciador ----------------
export class InputManager {
  constructor(scene, { touchControls = false } = {}) {
    this.scene = scene;
    const settings = StorageManager.getSettings();
    const bindings = settings.keyBindings || DEFAULT_KEY_BINDINGS;
    const isTouch = !!(scene.sys.game.device.input.touch);
    this.providers = [
      new KeyboardProvider(scene, bindings),
      new GamepadProvider(scene, DEFAULT_PAD_BINDINGS),
      new TouchProvider(scene, touchControls && isTouch)
    ];
    this.state = this._blank();
    this.prev = this._blank();
    // Ações já pressionadas na criação precisam ser soltas antes
    // de contar como "justPressed" (evita vazamento entre cenas).
    this._primed = false;
    this.enabled = true;

    this._onResume = () => this.resetHeld();
    this._onShutdown = () => this.destroy();
    scene.events.on('resume', this._onResume);
    scene.events.once('shutdown', this._onShutdown);
  }

  _blank() {
    const s = { axisX: 0, axisY: 0 };
    ACTIONS.forEach((a) => { s[a] = false; });
    return s;
  }

  update() {
    const tmp = this.prev;
    this.prev = this.state;
    this.state = tmp;
    ACTIONS.forEach((a) => { this.state[a] = false; });
    this.state.axisX = 0; this.state.axisY = 0;
    if (this.enabled) this.providers.forEach((p) => p.read(this.state));
    if (!this._primed) {
      // primeiro frame: copia o estado atual para prev
      ACTIONS.forEach((a) => { this.prev[a] = this.state[a]; });
      this._primed = true;
    }
  }

  isDown(action) { return !!this.state[action]; }

  justPressed(action) { return !!this.state[action] && !this.prev[action]; }

  // Movimento contínuo -1..1 (analógico quando disponível)
  get moveX() {
    if (this.state.axisX) return this.state.axisX;
    return (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0);
  }

  get moveY() {
    if (this.state.axisY) return this.state.axisY;
    return (this.state.down ? 1 : 0) - (this.state.up ? 1 : 0);
  }

  // Após retomar a cena, ignora teclas que estavam presas
  resetHeld() {
    this.providers.forEach((p) => p.reset());
    this._primed = false;
  }

  destroy() {
    this.providers.forEach((p) => p.destroy());
    this.providers = [];
    this.scene.events.off('resume', this._onResume);
    this.scene.events.off('shutdown', this._onShutdown);
  }
}
