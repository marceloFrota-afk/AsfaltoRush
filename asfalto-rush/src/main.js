// =============================================================
// main.js — ponto de entrada. Configura o Phaser 3 e registra
// as cenas. O Phaser é carregado como global (index.html).
// =============================================================
import { GAME_WIDTH, GAME_HEIGHT, UI_COLORS } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { ModeSelectScene } from './scenes/ModeSelectScene.js';
import { HowToPlayScene } from './scenes/HowToPlayScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { AudioManager } from './systems/AudioManager.js';

function showFatal(msg) {
  const el = document.getElementById('boot-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function waitForFont(timeoutMs = 1500) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, timeoutMs))
    ]);
  } catch (e) { /* segue com fonte de fallback */ }
}

async function start() {
  if (typeof window.Phaser === 'undefined') {
    showFatal('Não foi possível carregar o Phaser 3. Verifique lib/phaser.min.js ou a conexão (CDN).');
    return;
  }
  await waitForFont();

  // Desbloqueia o áudio no primeiro gesto do usuário
  const unlock = () => AudioManager.unlock();
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: UI_COLORS.BG,
    pixelArt: true,          // sem suavização: sprites nítidos
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,               // mantém proporção, sem deformar
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    input: {
      gamepad: true,
      activePointers: 3
    },
    fps: { target: 60, smoothStep: true },
    // A ordem importa: cenas posteriores são desenhadas por cima
    scene: [
      BootScene, MenuScene, ModeSelectScene, HowToPlayScene, SettingsScene, CreditsScene,
      GameScene, HUDScene, PauseScene, GameOverScene
    ]
  };

  const game = new Phaser.Game(config);
  window.__ASFALTO_RUSH__ = game; // útil para depuração no console
}

start();
