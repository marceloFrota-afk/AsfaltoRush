// =============================================================
// AudioManager.js — áudio 100% sintetizado (WebAudio), sem
// arquivos. Dividido em MusicManager e SFXManager.
// Para usar arquivos reais no futuro, substitua os métodos
// play()/start() mantendo os mesmos nomes de som.
// =============================================================
import { StorageManager } from './StorageManager.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

class AudioCore {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.unlocked = false;
    this._onUnlock = [];
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch (e) { return null; }
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // buffer de ruído branco reutilizável
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applySettings();
    return this.ctx;
  }

  // Navegadores exigem gesto do usuário para iniciar o áudio
  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!this.unlocked) {
      this.unlocked = true;
      this._onUnlock.splice(0).forEach((fn) => fn());
    }
  }

  whenUnlocked(fn) {
    if (this.unlocked) fn(); else this._onUnlock.push(fn);
  }

  applySettings() {
    if (!this.ctx) return;
    const s = StorageManager.getSettings();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume, t, 0.02);
    this.musicBus.gain.setTargetAtTime(s.musicOn ? 0.22 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxOn ? 0.55 : 0, t, 0.02);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }
}

export const audioCore = new AudioCore();

// -------------------------------------------------------------
// SFXManager
// -------------------------------------------------------------
class SFXManagerClass {
  constructor(core) {
    this.core = core;
    this.engine = null;
    this._last = {};
  }

  _tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.3, delay = 0, curve = 'exp' }) {
    const ctx = this.core.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== from) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
      else o.frequency.linearRampToValueAtTime(to, t + dur);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.core.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.3, filter = 1200, type = 'lowpass', sweepTo = null, delay = 0 }) {
    const ctx = this.core.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.core.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filter, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.core.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // Sons disponíveis: jump, land, dash, hit, crash, collect, powerup,
  // combo, gameover, ui, uiMove, record, time, warning, accel
  play(name, opts = {}) {
    if (!this.core.ctx || !this.core.unlocked) return;
    if (!StorageManager.getSettings().sfxOn) return;
    // anti-spam: mesmo som no mesmo instante
    const now = this.core.now;
    if (this._last[name] && now - this._last[name] < 0.03) return;
    this._last[name] = now;

    switch (name) {
      case 'jump':
        this._tone({ type: 'square', from: 220, to: 660, dur: 0.16, vol: 0.18 });
        break;
      case 'land':
        this._noise({ dur: 0.12, vol: 0.35, filter: 500 });
        this._tone({ type: 'triangle', from: 120, to: 60, dur: 0.1, vol: 0.3 });
        break;
      case 'dash':
        this._noise({ dur: 0.25, vol: 0.3, filter: 600, type: 'bandpass', sweepTo: 4000 });
        this._tone({ type: 'sawtooth', from: 180, to: 520, dur: 0.18, vol: 0.08 });
        break;
      case 'hit':
        this._noise({ dur: 0.3, vol: 0.5, filter: 900, sweepTo: 200 });
        this._tone({ type: 'square', from: 160, to: 50, dur: 0.25, vol: 0.2 });
        break;
      case 'crash':
        this._noise({ dur: 0.8, vol: 0.6, filter: 1400, sweepTo: 120 });
        this._tone({ type: 'sawtooth', from: 110, to: 30, dur: 0.7, vol: 0.25 });
        break;
      case 'collect': {
        const p = opts.pitch || 0;
        this._tone({ type: 'square', from: NOTE(84 + p), dur: 0.06, vol: 0.12 });
        this._tone({ type: 'square', from: NOTE(91 + p), dur: 0.09, vol: 0.12, delay: 0.05 });
        break;
      }
      case 'powerup':
        [72, 76, 79, 84].forEach((n, i) => this._tone({ type: 'square', from: NOTE(n), dur: 0.09, vol: 0.13, delay: i * 0.06 }));
        break;
      case 'combo': {
        const lvl = Math.min(8, opts.level || 1);
        this._tone({ type: 'triangle', from: NOTE(72 + lvl * 2), to: NOTE(79 + lvl * 2), dur: 0.15, vol: 0.2 });
        break;
      }
      case 'gameover':
        [67, 63, 60, 55].forEach((n, i) => this._tone({ type: 'square', from: NOTE(n), dur: 0.22, vol: 0.15, delay: i * 0.2 }));
        break;
      case 'record':
        [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => this._tone({ type: 'square', from: NOTE(n), dur: 0.12, vol: 0.13, delay: i * 0.09 }));
        break;
      case 'ui':
        this._tone({ type: 'square', from: NOTE(81), dur: 0.05, vol: 0.12 });
        this._tone({ type: 'square', from: NOTE(88), dur: 0.07, vol: 0.12, delay: 0.04 });
        break;
      case 'uiMove':
        this._tone({ type: 'square', from: NOTE(76), dur: 0.035, vol: 0.08 });
        break;
      case 'time':
        this._tone({ type: 'triangle', from: NOTE(84), dur: 0.08, vol: 0.2 });
        this._tone({ type: 'triangle', from: NOTE(96), dur: 0.12, vol: 0.2, delay: 0.07 });
        break;
      case 'warning':
        this._tone({ type: 'square', from: NOTE(60), dur: 0.12, vol: 0.12 });
        break;
      case 'accel':
        this._tone({ type: 'sawtooth', from: 90, to: 240, dur: 0.4, vol: 0.06 });
        break;
      default:
        break;
    }
  }

  // ---------- Motor contínuo (frequência acompanha velocidade) ----------
  startEngine() {
    if (!this.core.ctx || this.engine) return;
    const ctx = this.core.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'square';
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    gain.gain.value = 0;
    osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.core.sfxBus);
    osc.frequency.value = 45; osc2.frequency.value = 22.5;
    osc.start(); osc2.start();
    this.engine = { osc, osc2, filter, gain };
  }

  // ratio: 0..1 (velocidade atual / máxima)
  updateEngine(ratio, active = true) {
    if (!this.engine) return;
    const t = this.core.now;
    const r = Math.max(0, Math.min(1.4, ratio));
    this.engine.osc.frequency.setTargetAtTime(42 + r * 70, t, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(21 + r * 35, t, 0.08);
    this.engine.filter.frequency.setTargetAtTime(300 + r * 900, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(active ? 0.07 + r * 0.06 : 0, t, 0.08);
  }

  stopEngine() {
    if (!this.engine) return;
    const { osc, osc2, gain } = this.engine;
    const t = this.core.now;
    gain.gain.setTargetAtTime(0, t, 0.05);
    osc.stop(t + 0.3); osc2.stop(t + 0.3);
    this.engine = null;
  }
}

// -------------------------------------------------------------
// MusicManager — sequenciador chiptune simples com lookahead
// -------------------------------------------------------------
const TRACKS = {
  menu: {
    bpm: 112,
    // [melodia, baixo] em MIDI; null = pausa. 16 passos x 4 compassos
    lead: [69, null, 72, null, 76, null, 74, 72, 69, null, 67, null, 69, null, null, null,
      65, null, 69, null, 72, null, 71, 69, 67, null, 64, null, 67, null, null, null,
      69, null, 72, null, 76, null, 79, 77, 76, null, 74, null, 72, null, 74, null,
      76, null, 72, null, 69, null, 67, null, 69, null, null, null, null, null, null, null],
    bass: [45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43, 45, 45, 57, 45]
  },
  game: {
    bpm: 142,
    lead: [76, null, 76, 79, null, 76, 74, null, 72, null, 74, 76, null, null, 72, null,
      74, null, 74, 77, null, 74, 72, null, 71, null, 72, 74, null, null, 67, null,
      76, null, 76, 79, null, 81, 79, null, 76, null, 79, 84, null, 83, 81, null,
      79, null, 76, null, 74, null, 72, null, 74, null, 71, null, 72, null, null, null],
    bass: [45, null, 45, 57, 45, null, 45, 57, 41, null, 41, 53, 43, null, 43, 55]
  }
};

class MusicManagerClass {
  constructor(core) {
    this.core = core;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.ducked = false;
  }

  play(name) {
    if (this.track === TRACKS[name] && this.timer) return;
    this.stop();
    this.track = TRACKS[name] || null;
    if (!this.track) return;
    this.core.whenUnlocked(() => {
      if (!this.track || this.timer) return;
      this.step = 0;
      this.nextTime = this.core.now + 0.1;
      this.timer = setInterval(() => this._schedule(), 25);
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  duck(on) {
    this.ducked = on;
  }

  _note(freq, t, dur, type, vol) {
    const ctx = this.core.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.core.musicBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _schedule() {
    if (!this.track || !this.core.ctx) return;
    const stepDur = 60 / this.track.bpm / 4;
    const duck = this.ducked ? 0.35 : 1;
    while (this.nextTime < this.core.now + 0.12) {
      const lead = this.track.lead[this.step % this.track.lead.length];
      const bass = this.track.bass[this.step % this.track.bass.length];
      if (lead) this._note(NOTE(lead), this.nextTime, stepDur * 1.6, 'square', 0.22 * duck);
      if (bass) this._note(NOTE(bass), this.nextTime, stepDur * 0.9, 'triangle', 0.45 * duck);
      if (this.step % 4 === 0) this._kick(this.nextTime, duck);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  _kick(t, duck) {
    const ctx = this.core.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.5 * duck, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(this.core.musicBus);
    o.start(t); o.stop(t + 0.14);
  }
}

export const SFXManager = new SFXManagerClass(audioCore);
export const MusicManager = new MusicManagerClass(audioCore);

// Fachada única
export const AudioManager = {
  core: audioCore,
  sfx: SFXManager,
  music: MusicManager,
  unlock: () => audioCore.unlock(),
  applySettings: () => audioCore.applySettings()
};
