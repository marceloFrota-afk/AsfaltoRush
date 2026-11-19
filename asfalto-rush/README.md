# ASFALTO RUSH — jogo arcade de caminhão (Phaser 3)

Jogo 2D arcade para navegador: um caminhão numa rodovia infinita, desviando de buracos, cones, troncos, capivaras e outros obstáculos, com pulo, dash, combos, power-ups e três modos de jogo.
Toda a pixel art e todo o áudio são **originais**, gerados por código. Nenhum asset, código, nome ou interface de terceiros foi usado.

---

## 1. Como executar

### Opção A: arquivo único (duplo clique)
Abra **`dist/asfalto-rush.html`** no navegador.
Esse arquivo já traz o jogo empacotado e funciona via `file://`. O Phaser é carregado da CDN, então é preciso internet. Para jogar offline, siga o passo "Offline" abaixo.

### Opção B: projeto modular (para desenvolvimento)
Como o projeto usa módulos ES, ele precisa de um servidor local (o navegador bloqueia módulos via `file://`):

```bash
# na pasta do projeto, use qualquer uma das opções:
python -m http.server 8080        # depois abra http://localhost:8080
npx http-server . -p 8080 -c-1    # ou: npm start
```

### Offline
Baixe o `phaser.min.js` (versão **3.80.x**, licença MIT) e salve em **`lib/phaser.min.js`**.
O `index.html` (e também o `dist/`) usa a cópia local primeiro e só recorre à CDN se ela não existir.

> Observação: sem o arquivo local, o navegador registra um 404 de `lib/phaser.min.js` no console antes de carregar pela CDN. Isso é esperado e não afeta o jogo.

### Scripts
| Comando | O que faz |
|---|---|
| `npm start` | servidor local em http://localhost:8080 |
| `npm run build` | regenera `dist/asfalto-rush.html` a partir de `/src` |
| `npm test` | testes de lógica, smoke test das cenas, teste de justiça e teste do bundle (Node) |
| `npm run art-preview` | gera `tests/art_preview.png` com toda a pixel art |

---

## 2. Controles

| Ação | Teclado | Gamepad (Xbox / PlayStation) |
|---|---|---|
| Mover | Setas / WASD (W acelera, S freia) | Analógico esquerdo / D-pad |
| Pular | ESPAÇO | A / ✕ |
| Dash | SHIFT | RB / R1, X / ▢, RT / R2 |
| Pausa | ESC (ou P) | Start / Options |
| Confirmar / reiniciar | ENTER | A / ✕ |

Em dispositivos com toque, aparecem botões virtuais (◀ ▶ PULO DASH II).

---

## 3. Arquitetura

```
asfalto-rush/
├── index.html                  # carrega o Phaser (local → CDN) e src/main.js
├── css/style.css               # canvas centralizado + pixelated
├── dist/asfalto-rush.html      # versão standalone (gerada por tools/build-standalone.mjs)
├── lib/                        # (opcional) phaser.min.js para uso offline
├── assets/sprites|audio|ui/    # (opcional) PNGs/áudios definitivos
├── src/
│   ├── main.js                 # configuração do Phaser + registro das cenas
│   ├── config/
│   │   ├── gameConfig.js       # resolução, layout da pista, cores, profundidades, teclas
│   │   ├── balance.js          # TODOS os números de balanceamento
│   │   ├── modes.js            # definição dos 3 modos
│   │   ├── assets.js           # chaves de textura + manifesto de assets externos
│   │   └── cosmetics.js        # ponto de expansão: pinturas de caminhão
│   ├── art/
│   │   ├── ArtCanvas.js        # grade de pixels (independente do Phaser)
│   │   ├── sprites.js          # pixel art original (mapas + formas procedurais)
│   │   ├── PixelArtFactory.js  # ArtCanvas → texturas/animações do Phaser
│   │   └── textureUtils.js
│   ├── entities/
│   │   ├── Truck.js            # só o comportamento do caminhão e o seu visual
│   │   ├── Obstacle.js         # obstáculo reciclável
│   │   ├── Pickup.js           # base de itens sem colisão física
│   │   ├── Collectible.js      # engrenagens e relógios (+3s / +5s)
│   │   └── PowerUp.js          # escudo, boost, reparo, dash instantâneo, ímã
│   ├── systems/
│   │   ├── InputManager.js     # ações abstratas: teclado, gamepad, toque
│   │   ├── ScoreManager.js     # pontos, combo/multiplicador, recordes
│   │   ├── DifficultyManager.js# curva de dificuldade configurável
│   │   ├── PatternGenerator.js # fileiras de obstáculos com rota segura garantida
│   │   ├── ObstacleManager.js  # spawn + pooling de obstáculos
│   │   ├── PickupManager.js    # spawn + pooling de coletáveis/power-ups
│   │   ├── CollisionSystem.js  # colisão por categorias
│   │   ├── RoadManager.js      # rodovia infinita, árvores, vegetação, linhas de velocidade
│   │   ├── EffectsManager.js   # partículas, shake, flash, textos flutuantes
│   │   ├── ModeRules.js        # regras de cada modo (Strategy)
│   │   ├── AudioManager.js     # MusicManager + SFXManager (WebAudio sintetizado)
│   │   └── StorageManager.js   # localStorage (settings, recordes, carteira)
│   ├── ui/
│   │   ├── UIFactory.js        # textos/painéis pixel art
│   │   └── MenuList.js         # menu navegável (teclado/gamepad/mouse)
│   └── scenes/
│       ├── BootScene.js        # BOOT: assets externos → placeholders → animações
│       ├── MenuScene.js        # MENU
│       ├── ModeSelectScene.js  # MODE_SELECT
│       ├── HowToPlayScene.js
│       ├── SettingsScene.js
│       ├── CreditsScene.js
│       ├── GameScene.js        # PLAYING: orquestra os sistemas
│       ├── HUDScene.js         # HUD em cena paralela
│       ├── PauseScene.js       # PAUSED
│       └── GameOverScene.js    # GAME_OVER
├── tools/build-standalone.mjs
└── tests/                      # testes Node (Phaser mockado)
```

**Fluxo de um frame (GameScene.update):**
`InputManager` → `Truck.update` → `DifficultyManager` → `RoadManager` → `ObstacleManager` / `PickupManager` → `CollisionSystem` → `ScoreManager` → `ModeRules` → efeitos, áudio e câmera. O HUD lê `GameScene.getHudState()`.

---

## 4. Decisões de gameplay

- **Pista:** 5 faixas de 64 px. O caminhão anda livremente na horizontal, com pequena inércia. Bordas e árvores limitam a área jogável.
- **Hitbox justa:** 20×44 px, contra um sprite de 28×52.
- **Pulo:** preparação de 0,07 s, 0,6 s no ar, sombra no chão, sprite que cresce, squash na aterrissagem. Buracos só causam dano se `truck.isJumping === false`. Cones, pneus e troncos também podem ser pulados.
- **Dash:** só reposiciona (não atravessa obstáculos), com rastro, "tranco" de câmera e cooldown de 1,6 s mostrado na HUD.
- **Rota sempre possível:** o `PatternGenerator` calcula quantas faixas o caminhão consegue cruzar entre duas fileiras e garante que, **de qualquer faixa segura**, existe uma faixa livre alcançável na próxima fileira (não existem becos sem saída). Fileiras só de buracos aparecem com tempo de leitura suficiente e intervalo mínimo entre elas.
- **Dificuldade:** `difficulty = (tempo·0,6 + metros/22·0,4) · RATE`. A curva em `balance.js → DIFFICULTY.CURVE` define a velocidade, o intervalo **em segundos** entre fileiras, as faixas bloqueadas, as fileiras de pulo, os animais e os tipos de obstáculo liberados em cada faixa de tempo (0–30 s, 30–60 s, 60–120 s, 120 s+).
- **Pontuação:** +1 por metro, +2 por segundo, +10 por desvio, +20 por buraco pulado, +15 por engrenagem, +25 por power-up. O multiplicador sobe +1 a cada 5 desvios seguidos (até x8) e volta a x1 quando há colisão.
- **Modos:**
  - *Estrada Infinita*: 3 vidas (máximo 5). Árvore caída = acidente grave (game over, exceto com escudo). 1,1 s de invulnerabilidade depois de cada dano.
  - *Contra o Tempo*: começa com 45 s. Batida custa −3 s (grave: −6 s). Relógios dão +3 s / +5 s. O tempo extra conquistado vira bônus no final.
  - *Fuga da Tempestade*: a tempestade acelera com o tempo. Batidas deixam o caminhão mais lento. W, dash e boost ajudam a abrir distância.

---

## 5. Onde substituir sprites e pixel art

O jogo **sempre** funciona sem arquivos: a `BootScene` gera pixel art procedural para qualquer chave que não tenha sido carregada. Para usar arte definitiva:

1. Salve o PNG em `assets/sprites/`.
2. Adicione a entrada em `src/config/assets.js → EXTERNAL_ASSETS` usando **a mesma chave**.
3. Mantenha o tamanho e a ordem dos frames da tabela abaixo. Nenhuma mecânica muda, porque as hitboxes são proporcionais ao frame (`OBSTACLE_TYPES[...].hit`).

| Chave | Tipo | Tamanho do frame (px) | Frames / observação |
|---|---|---|---|
| `truck` | spritesheet | 28×60 | 0–1 dirigindo, 2 pulo, 3–4 dash (chama nas 4 últimas linhas de arte), 5 batida, 6 destruído. O centro do corpo fica em y=26 |
| `truck_shadow`, `shield_bubble` | image | 32×56, 44×72 | |
| `hole_s`, `hole_m`, `hole_l` | image | 28×16, 40×20, 52×24 | `hole_l` precisa ter ≤ 56 px de largura |
| `cone`, `tire`, `rock`, `box`, `sign` | image | ~20–28 | cabem em 1 faixa (≤ 56 px) |
| `barrier` | image | 56×20 | 1 faixa |
| `log` | image | ≤ 124 de largura | 2 faixas |
| `fallen_tree` | image | ≤ 188 de largura | 3 faixas |
| `capybara` | spritesheet | 32×20 | 0–1 andando (olhando para a direita) |
| `tree_round`, `tree_pine`, `bush`, `flowers`, `tuft`, `stone`, `km_post` | image | livre | cenário |
| `asphalt`, `grass`, `gravel`, `lane_dash`, `edge_line` | image | tiles repetíveis | tileSprites |
| `gear` | spritesheet | 22×22 | 0–1 girando |
| `clock_s`, `clock_l`, `pu_shield`, `pu_boost`, `pu_repair`, `pu_dash`, `pu_magnet` | image | 28×28 | |
| `heart`, `heart_empty`, `icon_dash`, `icon_jump`, `touch_btn` | image | livre | HUD/UI |
| `storm_edge`, `rain`, `px`, `spark`, `smoke`, `speedline` | image | livre | efeitos |

Outros pontos de troca:
- **Pintura do caminhão:** `src/config/cosmetics.js` (troca a paleta do sprite procedural).
- **Variantes de alto contraste:** são geradas automaticamente para os obstáculos procedurais (sufixo `_hc`). PNGs externos usam a versão normal.
- **Áudio:** `AudioManager.js` sintetiza tudo. Para usar arquivos, carregue-os no manifesto e troque a implementação de `SFXManager.play(nome)` / `MusicManager.play(faixa)`, mantendo os mesmos nomes.
- **Fonte:** "Press Start 2P" (Google Fonts, OFL). Sem internet, o jogo usa uma fonte monoespaçada.

---

## 6. Acessibilidade e configurações (salvas no localStorage)
Música on/off, efeitos sonoros on/off, volume geral, tremor de tela (normal/reduzido/desligado), alto contraste, partículas e rastro on/off, flashes on/off, mostrar FPS e apagar recordes. O remapeamento de teclas já está estruturado: `settings.keyBindings` substitui `DEFAULT_KEY_BINDINGS`.

## 7. Expansão futura (já estruturado, não implementado)
- **Loja/cosméticos:** as engrenagens se acumulam em `StorageManager.getWallet().gears`, e as pinturas ficam em `cosmetics.js`.
- **Remapeamento de teclas:** `settings.keyBindings`.
- **Novos controles:** basta criar um novo provider em `InputManager.js` com o método `read(state)`.
