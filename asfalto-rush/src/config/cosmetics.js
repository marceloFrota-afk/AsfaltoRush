// =============================================================
// cosmetics.js — ponto de expansão para caminhões/pinturas.
// Nesta versão só existe a pintura padrão. As engrenagens
// coletadas já são acumuladas em StorageManager.wallet para
// uma futura loja (NÃO implementada nesta versão).
// =============================================================

export const TRUCK_SKINS = {
  classic: {
    id: 'classic',
    name: 'Clássico',
    cost: 0,
    // Sobrescreve cores da paleta do caminhão (ver art/sprites.js)
    palette: {}
  }
  // Exemplo futuro:
  // midnight: { id: 'midnight', name: 'Meia-noite', cost: 500,
  //             palette: { r: '#3b4cca', R: '#1f2a7a', h: '#7d8cff' } }
};

export const DEFAULT_SKIN = 'classic';
