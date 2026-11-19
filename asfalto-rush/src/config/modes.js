// =============================================================
// modes.js — definição declarativa dos três modos de jogo.
// A lógica específica de cada modo está em systems/ModeRules.js
// =============================================================

export const MODE_IDS = {
  ENDLESS: 'endless',
  TIME_ATTACK: 'timeattack',
  ESCAPE: 'escape'
};

export const MODES = {
  endless: {
    id: 'endless',
    name: 'ESTRADA INFINITA',
    short: 'INFINITA',
    color: 0x6ee7a0,
    description: [
      'Vá o mais longe que',
      'puder. Você tem 3',
      'vidas e a velocidade',
      'só aumenta.'
    ],
    usesLives: true,
    usesTimer: false,
    usesThreat: false,
    allowRepair: true
  },
  timeattack: {
    id: 'timeattack',
    name: 'CONTRA O TEMPO',
    short: 'TEMPO',
    color: 0x6cc7ff,
    description: [
      'Corra contra o',
      'relógio! Pegue',
      'relógios: +3s e +5s.',
      'Batidas custam tempo.'
    ],
    usesLives: false,
    usesTimer: true,
    usesThreat: false,
    allowRepair: false
  },
  escape: {
    id: 'escape',
    name: 'FUGA DA TEMPESTADE',
    short: 'FUGA',
    color: 0xb57bff,
    description: [
      'A tempestade está',
      'chegando! Use dash e',
      'boost para manter',
      'distância.'
    ],
    usesLives: false,
    usesTimer: false,
    usesThreat: true,
    allowRepair: false
  }
};

export const MODE_ORDER = ['endless', 'timeattack', 'escape'];
