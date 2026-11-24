// =============================================================
// build-standalone.mjs — gera dist/asfalto-rush.html: UM arquivo
// que abre com duplo clique (file://), sem servidor local.
// Empacota os módulos ES de /src em um script clássico.
// Uso: node tools/build-standalone.mjs
// =============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'src/main.js');
const order = [];
const seen = new Set();
const IMPORT_RE = /import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?/g;

function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) visit(path.resolve(path.dirname(file), m[2]));
  order.push(file);
}
visit(entry);

const id = (f) => path.relative(root, f).replace(/\\/g, '/');
let bundle = "'use strict';\nconst __m = {};\n";
for (const file of order) {
  let code = fs.readFileSync(file, 'utf8');
  const exportsList = [];
  code = code.replace(IMPORT_RE, (all, names, from) => {
    const target = id(path.resolve(path.dirname(file), from));
    const spec = names.split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': ')).join(', ');
    return `const { ${spec} } = __m['${target}'];`;
  });
  code = code.replace(/^export\s+(const|let|class|function|async function)\s+([A-Za-z0-9_$]+)/gm, (all, kind, name) => {
    exportsList.push(name);
    return `${kind} ${name}`;
  });
  if (/^\s*(import|export)\s/m.test(code)) throw new Error('Sintaxe de módulo não suportada em ' + id(file));
  bundle += `\n// ---- ${id(file)} ----\n__m['${id(file)}'] = (function () {\n${code}\nreturn { ${exportsList.join(', ')} };\n})();\n`;
}

const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const phaser = fs.readFileSync(path.join(root, 'node_modules/phaser/dist/phaser.min.js'), 'utf8');
const phaserLicense = fs.readFileSync(path.join(root, 'node_modules/phaser/LICENSE.md'), 'utf8');
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Asfalto Rush</title>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
<style>${css}</style>
</head>
<body>
<div id="game-container"></div>
<div id="boot-error"></div>
<!-- Phaser 3.80.1 license:
${phaserLicense}
-->
<script>${phaser.replace(/<\/script/gi, '<\\/script')}</script>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/asfalto-rush.html'), html);
fs.writeFileSync(path.join(root, 'dist/bundle.debug.js'), bundle);
console.log(`dist/asfalto-rush.html gerado: ${order.length} módulos, ${(html.length / 1024).toFixed(1)} KB`);
