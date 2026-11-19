// =============================================================
// StorageManager.js — persistência segura no localStorage
// (configurações, recordes por modo, carteira de engrenagens).
// Tolerante a navegadores sem localStorage (modo privado etc.).
// =============================================================
import { STORAGE_KEYS } from '../config/gameConfig.js';
import { MODE_ORDER } from '../config/modes.js';
import { DEFAULT_SKIN } from '../config/cosmetics.js';

export const DEFAULT_SETTINGS = {
  musicOn: true,
  sfxOn: true,
  masterVolume: 0.8,       // 0..1
  shake: 'normal',         // 'normal' | 'reduced' | 'off'
  highContrast: false,
  particles: true,         // partículas e rastro
  flashes: true,           // flashes de tela
  showFps: false,
  truckSkin: DEFAULT_SKIN,
  keyBindings: null        // null = usar DEFAULT_KEY_BINDINGS (remapeamento futuro)
};

function memoryStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

class StorageManagerClass {
  constructor() {
    this.store = this._detect();
    this._settings = null;
    this._records = null;
    this._wallet = null;
  }

  _detect() {
    try {
      const ls = globalThis.localStorage;
      const t = '__asfalto_test__';
      ls.setItem(t, '1');
      ls.removeItem(t);
      return ls;
    } catch (e) {
      return memoryStore();
    }
  }

  _read(key, fallback) {
    try {
      const raw = this.store.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  _write(key, value) {
    try { this.store.setItem(key, JSON.stringify(value)); } catch (e) { /* cota cheia etc. */ }
  }

  // ---------- Configurações ----------
  getSettings() {
    if (!this._settings) {
      this._settings = { ...DEFAULT_SETTINGS, ...this._read(STORAGE_KEYS.SETTINGS, {}) };
    }
    return this._settings;
  }

  updateSettings(patch) {
    this._settings = { ...this.getSettings(), ...patch };
    this._write(STORAGE_KEYS.SETTINGS, this._settings);
    return this._settings;
  }

  // ---------- Recordes ----------
  _emptyRecords() {
    const r = {};
    MODE_ORDER.forEach((m) => { r[m] = { score: 0, distance: 0 }; });
    return r;
  }

  getRecords() {
    if (!this._records) {
      this._records = { ...this._emptyRecords(), ...this._read(STORAGE_KEYS.RECORDS, {}) };
    }
    return this._records;
  }

  getRecord(mode) {
    return this.getRecords()[mode] || { score: 0, distance: 0 };
  }

  // Retorna { newScore, newDistance, best }
  submitRecord(mode, score, distance) {
    const records = this.getRecords();
    const cur = records[mode] || { score: 0, distance: 0 };
    const res = { newScore: false, newDistance: false };
    if (score > cur.score) { cur.score = Math.floor(score); res.newScore = true; }
    if (distance > cur.distance) { cur.distance = Math.floor(distance); res.newDistance = true; }
    records[mode] = cur;
    this._write(STORAGE_KEYS.RECORDS, records);
    res.best = { ...cur };
    return res;
  }

  resetRecords() {
    this._records = this._emptyRecords();
    this._write(STORAGE_KEYS.RECORDS, this._records);
  }

  // ---------- Carteira (expansão futura: loja/cosméticos) ----------
  getWallet() {
    if (!this._wallet) {
      this._wallet = { gears: 0, unlockedSkins: [DEFAULT_SKIN], ...this._read(STORAGE_KEYS.WALLET, {}) };
    }
    return this._wallet;
  }

  addGears(n) {
    const w = this.getWallet();
    w.gears += Math.max(0, Math.floor(n));
    this._write(STORAGE_KEYS.WALLET, w);
    return w.gears;
  }
}

export const StorageManager = new StorageManagerClass();
