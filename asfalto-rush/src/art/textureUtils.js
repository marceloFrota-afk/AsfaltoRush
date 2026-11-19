// Utilitários para lidar igualmente com texturas procedurais
// (frames numéricos 0..n) e PNGs externos (frame __BASE).

// Retorna o primeiro frame válido (0 se existir, senão undefined = __BASE)
export function firstFrame(scene, key) {
  const t = scene.textures.exists(key) ? scene.textures.get(key) : null;
  return t && t.has(0) ? 0 : undefined;
}

// Dimensões do primeiro frame
export function frameSize(scene, key) {
  if (!scene.textures.exists(key)) return { w: 16, h: 16 };
  const t = scene.textures.get(key);
  const f = t.has(0) ? t.get(0) : t.get();
  return { w: f.width, h: f.height };
}
