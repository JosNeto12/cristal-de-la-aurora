// Mapas del juego construidos por código con coordenadas exactas.
// Cada mapa tiene rejilla de tiles, eventos (NPCs, cofres, puertas) y encuentros.

class Grid {
  constructor(w, h, fill = 'grass') {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  set(x, y, t) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.cells[y][x] = t;
  }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 'void';
    return this.cells[y][x];
  }

  rect(x, y, w, h, t) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, t);
    }
  }

  hline(x0, x1, y, t) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, t);
  }

  vline(x, y0, y1, t) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, t);
  }

  border(t) {
    for (let x = 0; x < this.w; x++) {
      this.set(x, 0, t);
      this.set(x, this.h - 1, t);
    }
    for (let y = 0; y < this.h; y++) {
      this.set(0, y, t);
      this.set(this.w - 1, y, t);
    }
  }

  house(x, y, w, h) {
    this.rect(x, y, w, 2, 'roof');
    this.rect(x, y + 2, w, h - 2, 'wall');
    if (w >= 5) {
      this.set(x + 1, y + 2, 'window');
      this.set(x + w - 2, y + 2, 'window');
    }
    const dx = x + Math.floor(w / 2);
    const dy = y + h - 1;
    this.set(dx, dy, 'door');
    return { dx, dy };
  }

  toGrid() {
    return this.cells.map((row) => row.slice());
  }
}

// Paletas de NPC (mismo formato que los héroes)
export const NPC_PALETTES = {
  elder: { hair: '#e2e2ee', skin: '#e8c8a8', cloth: '#443a72', trim: '#c8b070', boots: '#2a2030' },
  guard: { hair: '#3a2a1e', skin: '#e0b088', cloth: '#3a4a7a', trim: '#b8c0d8', boots: '#22222e' },
  kid: { hair: '#c88a3a', skin: '#f0c8a0', cloth: '#5a9a4a', trim: '#e8e0a0', boots: '#4a3424' },
  blacksmith: { hair: '#2a1e16', skin: '#d8a070', cloth: '#4a3a2a', trim: '#a0a0a8', boots: '#2a1e16' },
  innkeeper: { hair: '#8a5a3a', skin: '#e8c0a0', cloth: '#7a4a6a', trim: '#e8d8c0', boots: '#3a2a2a' },
  mirna: { hair: '#5a3a2a', skin: '#f0c8a0', cloth: '#4a7a8a', trim: '#f4d58d', boots: '#3a2a2a' },
  tobi: { hair: '#8a6a3a', skin: '#e0b088', cloth: '#7a6a3a', trim: '#d8c088', boots: '#3a2a1e' },
  villager: { hair: '#6a4a2a', skin: '#f0c8a0', cloth: '#8a6a4a', trim: '#c8b090', boots: '#3a2a1e' },
  villager2: { hair: '#3a2a2a', skin: '#e8b890', cloth: '#6a4a7a', trim: '#c8a0d8', boots: '#2a1e2a' },
};

const enc = (steps, groups) => ({ steps, groups });
const grp = (w, ...enemies) => ({ w, enemies });

// ---------------------------------------------------------------------------
// VALLEBRUMA: pueblo natal
// ---------------------------------------------------------------------------
function buildVallebruma() {
  const g = new Grid(32, 22, 'grass');
  g.border('tree');
  g.rect(0, 0, 32, 1, 'tree');
  g.rect(0, 21, 32, 1, 'tree');

  // Río al este y puente
  g.vline(28, 1, 20, 'water');
  g.vline(29, 1, 20, 'water');
  g.set(28, 11, 'bridge');
  g.set(29, 11, 'bridge');

  // Caminos
  g.vline(16, 6, 21, 'path');
  g.hline(5, 30, 11, 'path');
  g.vline(7, 8, 11, 'path');
  g.vline(23, 8, 11, 'path');
  g.vline(15, 5, 6, 'path');
  g.set(16, 6, 'path');

  // Plaza de la fuente
  g.rect(13, 12, 6, 5, 'path');
  g.rect(15, 13, 2, 2, 'water');
  g.rect(14, 12, 4, 1, 'stone');
  g.rect(14, 15, 4, 1, 'stone');
  g.set(14, 13, 'stone');
  g.set(14, 14, 'stone');
  g.set(17, 13, 'stone');
  g.set(17, 14, 'stone');

  // Edificios
  const inn = g.house(4, 3, 7, 5);
  const shop = g.house(20, 3, 7, 5);
  const elder = g.house(12, 1, 6, 4);

  // Detalles del pueblo
  g.rect(2, 13, 2, 2, 'flowers');
  g.rect(25, 16, 3, 2, 'flowers');
  g.rect(10, 17, 3, 1, 'flowers');
  g.set(20, 15, 'tree');
  g.set(21, 18, 'tree');
  g.set(3, 18, 'tree');
  g.set(11, 9, 'bush');
  g.set(18, 16, 'bush');
  g.set(26, 13, 'bush');

  // Salida sur
  g.set(16, 21, 'path');
  g.set(16, 20, 'path');

  const events = [
    {
      type: 'npc', id: 'lyra', x: 13, y: 13, dir: 'down', sprite: 'lyra', name: 'Lyra',
      script: (G) => (G.flag('lyraJoined')
        ? [{ say: ['Lyra: El cristal de la plaza late otra vez. Muy despacio, como un corazón dormido.'] }]
        : [
            { say: ['Lyra: Kael, el anciano te busca desde el amanecer.', 'Dice que el Cristal de la Aurora ha vuelto a latir... y que eso no es buena señal.'] },
            { say: ['Lyra: He preparado vendas, hierbas y tres conjuros de curación.', 'Puedo ir contigo. No acepto un no por respuesta.'] },
            { say: ['Kael: ...Está bien. Pero si hay que huir, corres tú primero.'] },
            { join: 'lyra' },
            { flag: 'lyraJoined' },
            { sfx: 'levelup' },
            { say: ['¡Lyra se une al grupo!'] },
          ]),
    },
    {
      type: 'npc', id: 'elder', x: 18, y: 9, dir: 'down', sprite: 'villager', name: 'Anciano Ordo',
      palette: NPC_PALETTES.elder, opts: { beard: true, staff: true },
      script: (G) => {
        if (!G.flag('lyraJoined')) {
          return [{ say: ['Anciano Ordo: No salgas al camino solo, muchacho.', 'Habla con Lyra. Sus manos valen más que tu espada.'] }];
        }
        if (G.flag('questStarted')) {
          return [{ say: ['Anciano Ordo: La Cueva de los Ecos está al este, cruzando la pradera.', 'Si el Sello de Luz sigue allí, tráelo. Y cuida de los tuyos.'] }];
        }
        return [
          { say: ['Anciano Ordo: Kael. El cristal de la plaza lleva tres noches apagado.', 'Y bajo la montaña se oyen cosas que no deberían caminar.'] },
          { say: ['Anciano Ordo: Hace mil años, cuatro héroes sellaron la oscuridad con el Cristal de la Aurora.', 'El sello se está rompiendo. Alguien lo está rompiendo.'] },
          { say: ['Anciano Ordo: Toma estas pociones y este oro. No es mucho, pero es todo lo que tengo.'] },
          { gold: 200 },
          { give: 'pocion', n: 3 },
          { flag: 'questStarted' },
          { say: ['Anciano Ordo: Ve al este, más allá de la pradera. La Cueva de los Ecos guarda un fragmento del sello.', 'Tráelo antes de que el Emperador apague la aurora para siempre.'] },
        ];
      },
    },
    {
      type: 'npc', id: 'guard', x: 15, y: 18, dir: 'right', sprite: 'guard', name: 'Guardia',
      palette: NPC_PALETTES.guard, opts: { helmet: '#8a94b8' },
      script: (G) => (G.flag('lyraJoined')
        ? [{ say: ['Guardia: El camino del sur lleva a la pradera. Hay limos y goblins, nada que no puedas cortar.', 'Que la aurora te acompañe.'] }]
        : [{ say: ['Guardia: ¿Sales sin la sacerdotisa? Ni lo sueñes, Kael.', 'El anciano me pidió que no te dejara cruzar solo.'] }]),
    },
    {
      type: 'npc', id: 'kid', x: 11, y: 13, dir: 'down', sprite: 'kid', name: 'Niña',
      palette: NPC_PALETTES.kid, opts: { scale: 0.8 },
      script: () => [{ say: ['Niña: Mi madre dice que el cristal se apagó porque alguien robó su luz.', '¿Tú vas a traerla de vuelta? ¿De verdad?'] }],
    },
    {
      type: 'npc', id: 'smith', x: 6, y: 13, dir: 'right', sprite: 'blacksmith', name: 'Herrero Dag',
      palette: NPC_PALETTES.blacksmith, opts: { apron: '#5a3a2a' },
      script: () => [{ say: ['Herrero Dag: Esa espada tuya tiene más óxido que filo.', 'Si traes oro, Mirna vende acero en el bazar. O vuelve cuando el mundo no se esté acabando.'] }],
    },
    {
      type: 'sign', x: 17, y: 17, text: ['VALLEBRUMA', 'Pueblo del Cristal. Al este: Pradera de Viento.'],
    },
    {
      type: 'chest', x: 11, y: 5, item: 'pocion_mayor', n: 1, flag: 'chest_town_1',
    },
    {
      type: 'door', x: inn.dx, y: inn.dy, to: 'posada', tx: 7, ty: 8, dir: 'up',
    },
    {
      type: 'door', x: shop.dx, y: shop.dy, to: 'bazar', tx: 7, ty: 8, dir: 'up',
    },
    {
      type: 'door', x: elder.dx, y: elder.dy, locked: true,
      text: ['La puerta del anciano está cerrada con llave.', 'Se oyen páginas pasar dentro.'],
    },
    {
      type: 'trigger', x: 16, y: 21, once: false,
      script: (G) => (G.flag('lyraJoined')
        ? [{ warp: { map: 'pradera', x: 5, y: 2, dir: 'down' } }]
        : [{ say: ['Guardia: ¡Kael! No cruces el portón sin Lyra. El anciano me arrancaría la cabeza.'] }]),
    },
  ];

  return {
    id: 'vallebruma',
    name: 'Vallebruma',
    music: 'town',
    ambient: 'day',
    w: 32,
    h: 22,
    grid: g.toGrid(),
    spawn: { x: 16, y: 18, dir: 'up' },
    events,
    encounters: null,
  };
}

// ---------------------------------------------------------------------------
// POSADA
// ---------------------------------------------------------------------------
function buildPosada() {
  const g = new Grid(14, 10, 'wood');
  g.border('panel');
  g.rect(1, 1, 12, 1, 'panel');
  g.set(7, 9, 'door');
  g.rect(5, 6, 4, 2, 'carpet');
  g.rect(2, 3, 2, 1, 'counter');
  g.rect(5, 3, 2, 1, 'counter');
  g.rect(10, 2, 2, 1, 'bed');
  g.rect(10, 5, 1, 1, 'table');
  g.rect(11, 6, 1, 1, 'table');
  g.rect(2, 7, 1, 1, 'table');

  return {
    id: 'posada',
    name: 'Posada de Vallebruma',
    music: 'town',
    ambient: 'warm',
    indoor: true,
    w: 14,
    h: 10,
    grid: g.toGrid(),
    spawn: { x: 7, y: 8, dir: 'up' },
    events: [
      {
        type: 'npc', id: 'innkeeper', x: 4, y: 3, dir: 'down', sprite: 'innkeeper', name: 'Posadera Elva',
        palette: NPC_PALETTES.innkeeper,
        script: () => [
          { say: ['Posadera Elva: Una cama, un caldo y un techo. Treinta de oro la noche.'] },
          {
            ask: {
              prompt: '¿Te preparo la habitación? (30 de oro)',
              price: 30,
              yes: [
                { heal: true },
                { flag: 'slept' },
                { say: ['Duermes como un tronco. Al despertar, el mundo sigue en pie, pero tú estás entero.'] },
              ],
              no: [{ say: ['Posadera Elva: Cuando quieras, cielo. Aquí estaré.'] }],
            },
          },
        ],
      },
      {
        type: 'npc', id: 'bram', x: 10, y: 8, dir: 'left', sprite: 'bram', name: 'Bram',        script: (G) => {
          if (G.flag('bramJoined')) return [{ say: ['Bram: Cuando esto acabe, me debes una jarra. O dos.'] }];
          if (!G.flag('questStarted')) {
            return [{ say: ['Bram: Habla con el viejo antes de arrastrarme a una cueva.', 'No me gusta morir por nada.'] }];
          }
          return [
            { say: ['Bram: ¿Tú eres el chico del cristal? Tienes cara de que te van a partir en dos.'] },
            { say: ['Lyra: Bram, el emperador está apagando la aurora. No es una pelea de taberna.'] },
            { say: ['Bram: Precisamente. Llevo diez años peleando por nada.', 'Al menos esta vez, si muero, será por algo que valga la pena.'] },
            { join: 'bram' },
            { flag: 'bramJoined' },
            { sfx: 'levelup' },
            { say: ['¡Bram se une al grupo!'] },
          ];
        },
      },
      {
        type: 'door', x: 7, y: 9, to: 'vallebruma', tx: 7, ty: 8, dir: 'down',
      },
      {
        type: 'object', x: 2, y: 7, kind: 'table', text: ['Una mesa coja. Alguien ha tallado un corazón y dos iniciales.'],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// BAZAR
// ---------------------------------------------------------------------------
function buildBazar() {
  const g = new Grid(14, 10, 'wood');
  g.border('panel');
  g.rect(1, 1, 12, 1, 'panel');
  g.set(7, 9, 'door');
  g.rect(2, 5, 3, 1, 'counter');
  g.rect(8, 5, 3, 1, 'counter');
  g.rect(2, 2, 2, 1, 'counter');
  g.rect(4, 2, 2, 1, 'counter');
  g.rect(9, 2, 2, 1, 'counter');
  g.rect(5, 7, 4, 2, 'carpet');

  return {
    id: 'bazar',
    name: 'Bazar de Mirna',
    music: 'town',
    ambient: 'warm',
    indoor: true,
    w: 14,
    h: 10,
    grid: g.toGrid(),
    spawn: { x: 7, y: 8, dir: 'up' },
    events: [
      {
        type: 'npc', id: 'mirna', x: 6, y: 5, dir: 'down', sprite: 'mirna', name: 'Mirna',
        palette: NPC_PALETTES.mirna, opts: { apron: '#3a5a6a' },
        script: () => [
          { say: ['Mirna: Armas, pociones, telas y rumores. Todo tiene precio.', '¿Qué te llevas?'] },
          { shop: 'vallebruma' },
        ],
      },
      {
        type: 'door', x: 7, y: 9, to: 'vallebruma', tx: 23, ty: 8, dir: 'down',
      },
      {
        type: 'sign', x: 11, y: 7, text: ['«SE VENDEN ARMADURAS»', 'No devolvemos el oro. Ni las maldiciones.'],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// PRADERA DE VIENTO
// ---------------------------------------------------------------------------
function buildPradera() {
  const g = new Grid(40, 30, 'grass');
  g.border('mountain');
  const reserved = new Set();
  const mark = (x, y) => reserved.add(`${x},${y}`);

  const road = (x0, y0, x1, y1) => {
    if (x0 === x1) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { g.set(x0, y, 'path'); mark(x0, y); }
    } else {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { g.set(x, y0, 'path'); mark(x, y0); }
    }
  };

  // Entrada desde el pueblo
  g.set(5, 0, 'path');
  g.set(5, 1, 'path');
  mark(5, 1);
  road(5, 1, 5, 9);
  road(5, 9, 12, 9);
  road(12, 9, 12, 17);
  road(12, 17, 24, 17);
  road(24, 17, 24, 24);
  road(24, 24, 35, 24);

  // Río y puente
  g.vline(18, 1, 28, 'water');
  g.vline(19, 1, 28, 'water');
  g.set(18, 17, 'bridge');
  g.set(19, 17, 'bridge');
  mark(18, 17); mark(19, 17);

  // Entrada a la cueva
  g.rect(33, 22, 5, 5, 'mountain');
  g.rect(33, 23, 4, 3, 'cave');
  g.set(35, 24, 'stairs');
  mark(33, 24); mark(34, 24); mark(35, 24); mark(36, 24);

  // Bosques
  const treeAt = (x, y) => {
    const key = `${x},${y}`;
    if (reserved.has(key)) return;
    if (g.get(x, y) !== 'grass') return;
    g.set(x, y, hashTree(x, y) > 0.24 ? 'tree' : 'bush');
  };
  const clusters = [
    [2, 12, 7, 8], [10, 21, 8, 6], [26, 3, 6, 9],
    [28, 19, 4, 3], [7, 3, 5, 5], [21, 3, 4, 6],
    [30, 10, 5, 5], [3, 20, 4, 6], [37, 2, 2, 26],
  ];
  for (const [cx, cy, cw, ch] of clusters) {
    for (let y = cy; y < cy + ch; y++) {
      for (let x = cx; x < cx + cw; x++) treeAt(x, y);
    }
  }

  // Rocas y flores
  for (const [x, y] of [[9, 7], [16, 22], [22, 21], [30, 15], [7, 15], [20, 6], [32, 7]]) {
    if (g.get(x, y) === 'grass') g.set(x, y, 'bush');
  }
  for (const [x, y] of [[13, 11], [8, 19], [25, 14], [31, 22], [4, 8]]) {
    if (g.get(x, y) === 'grass') g.set(x, y, 'flowers');
  }

  // Puesto de la caravana
  g.rect(12, 14, 2, 2, 'path');
  g.set(14, 15, 'counter');

  return {
    id: 'pradera',
    name: 'Pradera de Viento',
    music: 'field',
    ambient: 'day',
    w: 40,
    h: 30,
    grid: g.toGrid(),
    spawn: { x: 5, y: 2, dir: 'down' },
    events: [
      {
        type: 'trigger', x: 5, y: 0, once: false,
        script: () => [{ warp: { map: 'vallebruma', x: 16, y: 20, dir: 'down' } }],
      },
      {
        type: 'trigger', x: 35, y: 24, once: false,
        script: () => [{ warp: { map: 'cueva1', x: 4, y: 18, dir: 'up' } }],
      },
      {
        type: 'npc', id: 'tobi', x: 13, y: 14, dir: 'down', sprite: 'tobi', name: 'Tobi',
        palette: NPC_PALETTES.tobi, opts: { hat: '#8a6a3a' },
        script: () => [
          { say: ['Tobi: ¡Viajero! La caravana para poco, pero para bien.', 'Tengo lo que necesitas para no morir en esa cueva.'] },
          { shop: 'pradera' },
        ],
      },
      {
        type: 'savepoint', x: 32, y: 24,
      },
      {
        type: 'chest', x: 8, y: 14, item: 'pocion_mayor', n: 1, flag: 'chest_pradera_1',
      },
      {
        type: 'chest', x: 26, y: 12, item: 'eter', n: 2, flag: 'chest_pradera_2',
      },
      {
        type: 'sign', x: 6, y: 3,
        text: ['← VALLEBRUMA', 'CUEVA DE LOS ECOS →', 'Cuidado con las sombras del camino.'],
      },
      {
        type: 'object', x: 22, y: 18, kind: 'bones',
        text: ['Los restos de un viajero. Su mochila está vacía. Alguien llegó antes.'],
      },
    ],
    encounters: enc([7, 13], [
      grp(4, { id: 'limo', n: 1 }),
      grp(3, { id: 'limo', n: 2 }),
      grp(3, { id: 'goblin', n: 1 }),
      grp(2, { id: 'goblin', n: 2 }),
      grp(2, { id: 'murcielago', n: 2 }),
      grp(2, { id: 'lobo', n: 1 }),
      grp(1, { id: 'limo', n: 1 }, { id: 'goblin', n: 1 }),
    ]),
  };
}

function hashTree(x, y) {
  const h = Math.imul(x + 11, 374761393) ^ Math.imul(y + 7, 668265263);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// CUEVA DE LOS ECOS — NIVEL 1
// ---------------------------------------------------------------------------
function buildCueva1() {
  const g = new Grid(28, 22, 'cavewall');
  g.rect(3, 16, 6, 5, 'cave');
  g.rect(11, 13, 8, 7, 'cave');
  g.rect(9, 4, 9, 6, 'cave');
  g.rect(21, 11, 6, 8, 'cave');
  g.rect(20, 3, 6, 6, 'cave');
  g.rect(8, 18, 4, 1, 'cave');
  g.rect(15, 10, 1, 4, 'cave');
  g.rect(19, 16, 3, 1, 'cave');
  g.rect(23, 9, 1, 2, 'cave');
  g.rect(23, 19, 1, 2, 'cave');

  // Estalactitas y adornos
  for (const [x, y] of [[5, 15], [12, 12], [17, 19], [22, 10], [10, 3], [16, 9], [21, 2]]) {
    if (g.get(x, y) === 'cavewall' || g.get(x, y) === 'cave') g.set(x, y, 'cavewall');
  }
  g.set(4, 19, 'stairs');
  g.set(24, 17, 'stairs');

  return {
    id: 'cueva1',
    name: 'Cueva de los Ecos — I',
    music: 'cave',
    ambient: 'cave',
    w: 28,
    h: 22,
    grid: g.toGrid(),
    spawn: { x: 4, y: 18, dir: 'up' },
    events: [
      {
        type: 'trigger', x: 4, y: 19, once: false,
        script: () => [{ warp: { map: 'pradera', x: 35, y: 25, dir: 'down' } }],
      },      {
        type: 'npc', id: 'nyx', x: 13, y: 17, dir: 'right', sprite: 'nyx', name: 'Nyx',
        script: (G) => {
          if (G.flag('nyxJoined')) return [{ say: ['Nyx: No mires así las paredes. Brillan porque hay cristales. No porque haya oro.', '...Vale, puede que haya oro.'] }];
          return [
            { say: ['Una chica de capa oscura está sentada contra la pared, apretándose el costado.'] },
            { say: ['Nyx: ¡Ay! ¿También venís a saquear? Llegáis tarde.', 'Un bicho de piedra me ha quitado la bolsa y casi la pierna.'] },
            { say: ['Bram: ¿Y por qué deberíamos ayudarte?'] },
            { say: ['Nyx: Porque sé dónde está el Sello de Luz. Y porque el caballero negro de abajo os va a partir en dos sin mí.', 'Y porque... bueno. Porque no quiero morir sola en una cueva.'] },
            { say: ['Lyra: ...Viene con nosotros.'] },
            { join: 'nyx' },
            { flag: 'nyxJoined' },
            { sfx: 'levelup' },
            { say: ['¡Nyx se une al grupo!'] },
          ];
        },
      },
      {
        type: 'chest', x: 11, y: 6, item: 'pocion_mayor', n: 1, flag: 'chest_cave1_1',
      },
      {
        type: 'chest', x: 22, y: 5, item: 'eter', n: 1, flag: 'chest_cave1_2',
      },
      {
        type: 'object', x: 17, y: 15, kind: 'bones',
        text: ['Un esqueleto con armadura del reino. Murió mirando hacia arriba, como si esperara luz.'],
      },
      {
        type: 'object', x: 25, y: 14, kind: 'rock',
        text: ['Una roca enorme. Al otro lado se oye agua.'],
      },
      {
        type: 'trigger', x: 24, y: 17, once: false,
        script: () => [{ warp: { map: 'cueva2', x: 3, y: 18, dir: 'up' } }],
      },
    ],
    encounters: enc([7, 12], [
      grp(3, { id: 'murcielago', n: 2 }),
      grp(3, { id: 'murcielago', n: 3 }),
      grp(3, { id: 'esqueleto', n: 1 }),
      grp(2, { id: 'esqueleto', n: 2 }),
      grp(2, { id: 'espectro', n: 1 }),
      grp(1, { id: 'murcielago', n: 1 }, { id: 'esqueleto', n: 1 }),
    ]),
  };
}

// ---------------------------------------------------------------------------
// CUEVA DE LOS ECHOS — NIVEL 2
// ---------------------------------------------------------------------------
function buildCueva2() {
  const g = new Grid(28, 22, 'cavewall');
  g.rect(2, 15, 6, 6, 'cave');
  g.rect(9, 11, 10, 7, 'cave');
  g.rect(13, 8, 2, 4, 'cave');
  g.rect(7, 2, 15, 7, 'cave');
  g.rect(7, 18, 5, 1, 'cave');
  g.rect(17, 17, 3, 1, 'cave');
  g.rect(11, 14, 1, 4, 'cave');

  // Decoración del santuario inferior
  g.set(14, 2, 'rune');
  g.set(10, 3, 'crystal');
  g.set(18, 3, 'crystal');
  g.set(14, 1, 'door');
  g.set(3, 19, 'stairs');
  g.set(4, 20, 'cave');
  g.set(9, 12, 'rune');
  g.set(17, 12, 'rune');

  return {
    id: 'cueva2',
    name: 'Cueva de los Ecos — II',
    music: 'cave',
    ambient: 'cave',
    w: 28,
    h: 22,
    grid: g.toGrid(),
    spawn: { x: 3, y: 18, dir: 'up' },
    events: [
      {
        type: 'trigger', x: 3, y: 19, once: false,
        script: () => [{ warp: { map: 'cueva1', x: 24, y: 18, dir: 'down' } }],
      },
      {
        type: 'trigger', x: 14, y: 7, once: true, flag: 'seen_knight',
        script: () => [
          { music: 'cave' },
          { say: ['La puerta del fondo está sellada con runas que pulsan como venas.', 'Una armadura vacía monta guardia delante. Al verte, levanta la espada.'] },
        ],
      },
      {
        type: 'boss', x: 14, y: 4, sprite: 'caballero', name: 'Caballero Negro',
        flag: 'caballeroDefeated',
        intro: ['Caballero Negro: Nadie pasa. Orden del Emperador.'],
        battle: { enemies: [{ id: 'caballero_negro', n: 1 }], boss: true, music: 'boss' },
        onWin: [
          { say: ['La armadura se desmorona. Dentro no hay cuerpo, solo polvo y un juramento roto.'] },
          { say: ['Lyra: Las runas de la puerta se están apagando... Podemos subir al santuario.'] },
          { flag: 'caballeroDefeated' },
          { sfx: 'crystal' },
          { give: 'llave_cueva', n: 1 },
          { say: ['¡Obtuviste la Llave de Piedra!'] },
        ],
      },
      {
        type: 'door', x: 14, y: 1, to: 'santuario', tx: 10, ty: 14, dir: 'up',
        requires: 'caballeroDefeated',
        lockedText: ['La puerta está sellada. Las runas aún arden con luz negra.'],
      },
      {
        type: 'chest', x: 10, y: 16, item: 'pocion_mayor', n: 2, flag: 'chest_cave2_1',
      },
      {
        type: 'chest', x: 17, y: 13, item: 'fenix', n: 1, flag: 'chest_cave2_2',
      },
      {
        type: 'savepoint', x: 12, y: 16,
      },
      {
        type: 'object', x: 22, y: 6, kind: 'bones',
        text: ['Otro héroe que no llegó a tiempo. Su espada sigue clavada en la roca.'],
      },
    ],
    encounters: enc([6, 11], [
      grp(3, { id: 'esqueleto', n: 2 }),
      grp(3, { id: 'espectro', n: 2 }),
      grp(3, { id: 'golem', n: 1 }),
      grp(2, { id: 'espectro', n: 1 }, { id: 'esqueleto', n: 1 }),
      grp(1, { id: 'golem', n: 1 }, { id: 'murcielago', n: 2 }),
    ]),
  };
}

// ---------------------------------------------------------------------------
// SANTUARIO DE LA AURORA
// ---------------------------------------------------------------------------
function buildSantuario() {
  const g = new Grid(20, 16, 'stone');
  g.border('wall');
  g.rect(9, 3, 2, 12, 'carpet');
  g.rect(9, 1, 2, 2, 'crystal');
  g.rect(8, 2, 4, 1, 'stone');
  for (const [x, y] of [[4, 4], [4, 7], [4, 10], [4, 13], [15, 4], [15, 7], [15, 10], [15, 13]]) {
    g.set(x, y, 'pillar');
  }
  g.set(10, 15, 'stairs');
  g.rect(7, 6, 6, 2, 'stone');
  g.set(7, 5, 'rune');
  g.set(12, 5, 'rune');
  g.set(14, 2, 'window');
  g.set(5, 2, 'window');

  return {
    id: 'santuario',
    name: 'Santuario de la Aurora',
    music: 'sanctum',
    ambient: 'sanctum',
    w: 20,
    h: 16,
    grid: g.toGrid(),
    spawn: { x: 10, y: 14, dir: 'up' },
    events: [
      {
        type: 'trigger', x: 10, y: 15, once: false,
        script: (G) => (G.flag('vaelorDefeated')
          ? [{ warp: { map: 'cueva2', x: 14, y: 2, dir: 'down' } }]
          : [{ warp: { map: 'cueva2', x: 14, y: 2, dir: 'down' } }]),
      },
      {
        type: 'trigger', x: 10, y: 8, once: true, flag: 'seenVaelor',
        script: () => [
          { music: 'stop' },
          { say: ['El santuario huele a tormenta. El Cristal de la Aurora flota sobre el altar, agrietado y casi apagado.'] },
          { say: ['Vaelor: Así que el cristal eligió a cuatro mendigos del norte.', 'Viniste hasta aquí por un pedazo de piedra. Qué tierno.'] },
          { say: ['Kael: Suéltalo.'] },
          { say: ['Vaelor: La aurora es una cadena, muchacho. Cada amanecer nos recuerda que debemos servir, arrodillarnos, agradecer.', 'Yo prefiero la noche. En la noche, nadie te dice lo que vales.'] },
          { say: ['Lyra: El cristal no te obliga a nada. Solo te muestra lo que eres.'] },
          { say: ['Vaelor: Entonces deja que te muestre lo que soy.'] },
          { sfx: 'boss' },
          { flash: true },
          {
            battle: {
              enemies: [{ id: 'vaelor', n: 1 }],
              boss: true,
              final: true,
              music: 'boss',
            },
          },
          { onVictory: true },
        ],
      },
      {
        type: 'object', x: 9, y: 2, kind: 'crystal',
        text: ['El Cristal de la Aurora. Una grieta lo recorre de arriba abajo. Aun así, emite calor.'],
      },
      {
        type: 'object', x: 4, y: 6, kind: 'rune', text: ['Una runa antigua. Representa cuatro figuras alrededor de una luz.'],
      },
      {
        type: 'object', x: 15, y: 12, kind: 'bones', text: ['Un héroe de la era antigua. Su armadura está cubierta de polvo de mil años.'],
      },
      {
        type: 'chest', x: 4, y: 8, item: 'espada_aurora', n: 1, flag: 'chest_santuario_1',
      },
      {
        type: 'chest', x: 15, y: 8, item: 'baculo_aurora', n: 1, flag: 'chest_santuario_2',
      },
    ],
    encounters: null,
  };
}

export const MAPS = {
  vallebruma: buildVallebruma(),
  posada: buildPosada(),
  bazar: buildBazar(),
  pradera: buildPradera(),
  cueva1: buildCueva1(),
  cueva2: buildCueva2(),
  santuario: buildSantuario(),
};
