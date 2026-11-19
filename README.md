# AsfaltoRush

**AsfaltoRush** é um repositório que contém um jogo arcade 2D desenvolvido para navegador. O projeto usa [Phaser 3](https://phaser.io/) e JavaScript modular para controlar um caminhão em uma rodovia infinita, com obstáculos, power-ups, diferentes modos e interface inspirada em pixel art.

Todo o código-fonte necessário ao jogo está localizado em [`asfalto-rush/`](asfalto-rush/).

## Sobre o jogo

No AsfaltoRush, o jogador deve desviar de obstáculos, coletar itens e manter o veículo intacto pelo maior tempo possível. A partida combina movimento lateral, pulos, dash, pontuação por distância e habilidades especiais.

Elementos principais:

- Rodovia infinita com cinco faixas
- Movimento livre na horizontal e acelerador/freio
- Pulo e dash
- Obstáculos variados
- Power-ups e coletáveis
- Sistema de combo e multiplicador de pontuação
- Três modos de jogo
- Controles por teclado, gamepad e tela de toque
- Configurações persistentes no `localStorage`
- Interface, sprites e efeitos em pixel art procedural
- Música e efeitos sonoros sintéticos gerados por Web Audio

## Modos de jogo

### Estrada Infinita

O objetivo é sobreviver e acumular o maior número de pontos. O caminhão começa com três vidas, que podem chegar a cinco com reparos. Batidas mais graves podem terminar a corrida imediatamente, exceto quando há escudo ativo.

### Contra o Tempo

A corrida começa com 45 segundos. O jogador ganha tempo ao coletar relógios e perde tempo em colisões. Cada batida pesada possui penalidade maior.

### Fuga da Tempestade

Uma tempestade se aproxima conforme a corrida progride. O jogador precisa acelerar, usar dash e coletar boosts para aumentar a distância em relação à tempestade. Colisões deixam o caminhão mais lento.

## Controles

| Ação | Teclado | Gamepad |
|---|---|---|
| Mover para os lados / acelerar / frear | `A` / `D`, `W` / `S` ou setas | Analógico esquerdo ou D-pad |
| Pular | `Espaço` | A / ✕ |
| Dash | `Shift` | RB / R1, X / ▢ ou RT / R2 |
| Pausar | `Esc` ou `P` | Start / Options |
| Confirmar | `Enter` | A / ✕ |
| Voltar | `Esc` ou `Backspace` | B / ◯ |

Em telas sensíveis ao toque, o jogo exibe controles virtuais para esquerda, direita, pulo e dash.

## Executar o jogo

O projeto está na pasta [`asfalto-rush/`](asfalto-rush/). Entre nela antes de executar os comandos.

### Windows, macOS ou Linux

```bash
cd asfalto-rush
npm start
```

O servidor abre o jogo em `http://localhost:8080`.

Também é possível iniciar qualquer servidor HTTP local:

```bash
python -m http.server 8080
```

Em seguida, acesse `http://localhost:8080`.

### Arquivo único

Abra diretamente:

```text
asfalto-rush/dist/asfalto-rush.html
```

A versão em `dist/` é um bundle standalone gerado a partir do código modular. Ela precisa de conexão com a internet para carregar o Phaser pela CDN, a menos que o Phaser seja colocado localmente.

### Execução offline

Baixe o Phaser 3.80.x e coloque o arquivo em:

```text
asfalto-rush/lib/phaser.min.js
```

O código primeiro tenta usar essa cópia local e recorre à CDN somente quando ela não existe.

## Desenvolvimento

Na pasta `asfalto-rush/`:

| Comando | Descrição |
|---|---|
| `npm start` | Inicia um servidor local na porta 8080 |
| `npm run build` | Gera `dist/asfalto-rush.html` |
| `npm test` | Executa os testes de padrões, smoke test, justiça e bundle |
| `npm run art-preview` | Gera `tests/art_preview.png` com a arte procedural |

Não é necessário instalar dependências para os scripts do projeto: eles usam Node.js e utilitários disponíveis no ambiente. O servidor local usado pelo script `start` pode ser obtido pelo `npx`.

## Estrutura do repositório

```text
.
├── README.md
├── LICENSE
└── asfalto-rush/
    ├── index.html             # Entrada modular do jogo
    ├── package.json           # Scripts e metadados
    ├── assets/                # Pontos para sprites, áudio e interface externas
    ├── css/style.css          # Estilização da página e centralização do canvas
    ├── dist/                  # Versão standalone gerada
    ├── lib/                   # Local opcional para phaser.min.js
    ├── src/
    │   ├── main.js            # Configuração principal e registro das cenas
    │   ├── config/            # Resolução, balanceamento, modos e configurações
    │   ├── art/               # Geração de pixel art e texturas
    │   ├── entities/          # Caminhão, obstáculos, itens e power-ups
    │   ├── systems/           # Entrada, física, pontuação, dificuldade e áudio
    │   ├── ui/                # Componentes reutilizáveis da interface
    │   └── scenes/            # Menu, modos, HUD e estados da partida
    ├── tests/                 # Testes e prévia da arte
    └── tools/                 # Ferramentas de build
```

## Arquitetura

O jogo inicia em `src/main.js`, que configura o Phaser e registra todas as cenas. O fluxo principal é tratado pela `GameScene`, que integra os sistemas de entrada, movimento, road scrolling, geração de padrões, colisão, pontuação, dificuldade, efeitos e regras dos modos.

Ordem aproximada de atualização de cada frame:

```text
InputManager
  -> Truck
  -> DifficultyManager
  -> RoadManager
  -> ObstacleManager / PickupManager
  -> CollisionSystem
  -> ScoreManager
  -> ModeRules
  -> efeitos e áudio
```

A interface paralela do HUD obtém o estado atual da partida por `GameScene.getHudState()`.

## Mecânicas e balanceamento

- A pista possui cinco faixas de 64 px em uma resolução lógica de 640×360.
- A hitbox principal do caminhão é menor que seu sprite, reduzindo colisões aparentemente injustas.
- Buracos causam dano somente enquanto o caminhão não está pulando.
- Cones, pneus e troncos podem ser evitados com movimento ou pulo.
- Dash realiza reposicionamento rápido com cooldown e não torna o caminhão invulnerável.
- O gerador de padrões garante rotas seguras entre fileiras consecutivas.
- O número de faixas bloqueadas e a complexidade dos obstáculos aumentam ao longo do tempo.
- O multiplicador de combo aumenta a cada sequência de desvios e volta para um após colisão.

Os valores de balanceamento ficam concentrados em [`asfalto-rush/src/config/balance.js`](asfalto-rush/src/config/balance.js).

## Assets e personalização

A arte do jogo é procedural e o projeto funciona sem imagens externas. A `BootScene` gera texturas de fallback para todas as chaves não carregadas.

Para substituir os assets:

1. Coloque imagens ou áudio em `asfalto-rush/assets/`.
2. Registre arquivos externos em `src/config/assets.js`.
3. Preserve o tamanho dos frames conforme o manifesto e o tamanho do sprite do código.
4. Mantidas as proporções e as hitboxes, qualquer asset visual pode ser trocado.

A geração de pixel art fica em:

- `src/art/ArtCanvas.js`
- `src/art/PixelArtFactory.js`
- `src/art/sprites.js`
- `src/art/textureUtils.js`

As paletas e personalizações futuras do caminhão estão organizadas em `src/config/cosmetics.js`.

## Configurações

As preferências são armazenadas separadamente no navegador com `localStorage`:

- Música e efeitos sonoros
- Volume geral
- Intensidade de tremor
- Alto contraste
- Partículas
- Rastro
- Flash visual
- FPS na tela
- Recordes
- Carteira de engrenagens

## Testes

Execute a suíte na pasta do jogo:

```bash
cd asfalto-rush
npm test
```

Os testes cobrem:

- geração e validação de padrões
- inicialização básica das cenas
- justiça e alcance das pistas
- integridade do bundle standalone

Para visualizar toda a arte gerada pelo projeto:

```bash
npm run art-preview
```

A imagem é criada em `tests/art_preview.png`.

## Tecnologia

- JavaScript ES Modules
- Phaser 3.80
- Node.js
- Web Audio API
- CSS
- HTML5 Canvas
- Pixel art procedural
- `localStorage`

## Licença

Consulte o arquivo [`LICENSE`](LICENSE) para os termos de uso deste repositório.