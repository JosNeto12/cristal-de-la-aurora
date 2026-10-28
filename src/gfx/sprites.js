// Sprites de héroes (pixel art a mano) y enemigos (rasterizados con estilo SNES).

import { makeCanvas, rect, line, ellipse, circle, poly, outlineCanvas, mirrorCanvas, shade, mix } from './pixel.js';

// ---------------------------------------------------------------------------
// HÉROES: 16x20, cuerpo de 14 filas + piernas animadas de 6 filas.
// Claves: 2 ropa, 3 ribete, 4 pelo, 5 piel, 6 blanco, 7 botas, 8 metal, 9 ropa oscura
// ---------------------------------------------------------------------------
const BODY = {
  down: [
    '.....444444.....',
    '....44444444....',
    '...4444444444...',
    '...4444444444...',
    '...4455555444...',
    '...4455555444...',
    '...4555555554...',
    '....45555554....',
    '.....555555.....',
    '.....222222.....',
    '...2222222222...',
    '..552222222255..',
    '..552233332255..',
    '...2222222222...',
  ],
  up: [
    '.....444444.....',
    '....44444444....',
    '...4444444444...',
    '...4444444444...',
    '...4444444444...',
    '...4444444444...',
    '...4444444444...',
    '....44444444....',
    '.....444444.....',
    '.....555555.....',
    '...2222222222...',
    '..552222222255..',
    '..552233332255..',
    '...2222222222...',
  ],
  side: [
    '.....444444.....',
    '....44444444....',
    '...4444444444...',
    '...4444444444...',
    '...4445555444...',
    '...4445555444...',
    '...4445555554...',
    '....44555554....',
    '.....555555.....',
    '.....222222.....',
    '...2222222222...',
    '...2222222222...',
    '...2222222255...',
    '...2223333322...',
  ],
};

const LEGS = {
  down: [
    [
      '...7777777777...',
      '...7777777777...',
      '...777..777.....',
      '..7777..7777....',
      '..777....777....',
      '................',
    ],
    [
      '...7777777777...',
      '...7777777777...',
      '..777....777....',
      '..777....7777...',
      '.777......777...',
      '................',
    ],
    [
      '...7777777777...',
      '...7777777777...',
      '....777....777..',
      '...7777....777..',
      '...777......777.',
      '................',
    ],
  ],
  up: [
    [
      '...7777777777...',
      '...7777777777...',
      '...777..777.....',
      '..7777..7777....',
      '..777....777....',
      '................',
    ],
    [
      '...7777777777...',
      '...7777777777...',
      '..777....777....',
      '..777....7777...',
      '.777......777...',
      '................',
    ],
    [
      '...7777777777...',
      '...7777777777...',
      '....777....777..',
      '...7777....777..',
      '...777......777.',
      '................',
    ],
  ],
  side: [
    [
      '....77777777....',
      '....77777777....',
      '....777..777....',
      '...7777..7777...',
      '...777....777...',
      '................',
    ],
    [
      '....77777777....',
      '....77777777....',
      '...777....777...',
      '..7777....777...',
      '..777......777..',
      '................',
    ],
    [
      '....77777777....',
      '....77777777....',
      '....777....777..',
      '....777....7777.',
      '...777......777.',
      '................',
    ],
  ],
};

const OUTLINE = '#160f1e';
const heroCache = new Map();
const palettes = new Map();

export function registerPalette(key, colors) {
  palettes.set(key, colors);
}

function paletteFor(key) {
  if (palettes.has(key)) return palettes.get(key);
  // Paleta por defecto (campesino)
  return { hair: '#5b4636', skin: '#e8b98a', cloth: '#7a8a6a', trim: '#c8b070', boots: '#3a2a22' };
}

function drawRows(g, rows, ox, oy, pal) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = pal[ch];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function buildHero(key, dir, frame) {
  const id = `${key}|${dir}|${frame}`;
  let cached = heroCache.get(id);
  if (cached) return cached;

  const base = paletteFor(key);
  const pal = {
    1: OUTLINE,
    2: base.cloth,
    3: base.trim,
    4: base.hair,
    5: base.skin,
    6: '#f7f7ff',
    7: base.boots,
    8: shade(base.trim, 0.35),
    9: shade(base.cloth, -0.3),
  };

  const { canvas, g } = makeCanvas(16, 20);
  const body = BODY[dir] || BODY.down;
  const legFrame = (LEGS[dir] || LEGS.down)[frame % 3];
  drawRows(g, body, 0, 0, pal);
  drawRows(g, legFrame, 0, 14, pal);

  // Ojos
  g.fillStyle = '#241a2e';
  if (dir === 'down') {
    g.fillRect(5, 6, 2, 2);
    g.fillRect(9, 6, 2, 2);
  } else if (dir === 'side') {
    g.fillRect(5, 6, 2, 2);
  }

  const outlined = outlineCanvas(canvas, OUTLINE);
  heroCache.set(id, outlined);
  return outlined;
}

export function drawActor(ctx, key, x, y, dir = 'down', frame = 0, opts = {}) {
  let d = dir;
  let sprite;
  const scale = opts.scale || 1;
  if (d === 'right') {
    sprite = mirrorCanvas(buildHero(key, 'side', frame));
  } else {
    sprite = buildHero(key, d, frame);
  }
  const px = Math.round(x - 8 * scale);
  const py = Math.round(y - 20 * scale);
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 6 * scale, 2.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (scale === 1) ctx.drawImage(sprite, px, py);
  else ctx.drawImage(sprite, px, py, Math.round(sprite.width * scale), Math.round(sprite.height * scale));

  // Accesorios
  if (opts.hat) {
    ctx.fillStyle = opts.hat;
    ctx.fillRect(px + 4 * scale, py + 3 * scale, 10 * scale, 2 * scale);
    ctx.fillRect(px + 6 * scale, py + 1 * scale, 6 * scale, 2 * scale);
  }
  if (opts.beard) {
    ctx.fillStyle = opts.beard === true ? '#e8e8f0' : opts.beard;
    ctx.fillRect(px + 5 * scale, py + 9 * scale, 8 * scale, 3 * scale);
    ctx.fillRect(px + 6 * scale, py + 12 * scale, 6 * scale, 2 * scale);
  }
  if (opts.apron) {
    ctx.fillStyle = opts.apron;
    ctx.fillRect(px + 4 * scale, py + 12 * scale, 8 * scale, 6 * scale);
  }
  if (opts.staff) {
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(px + (d === 'right' ? 1 : 15) * scale, py + 4 * scale, 1.6 * scale, 15 * scale);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(px + (d === 'right' ? 0 : 14) * scale, py + 2 * scale, 3 * scale, 3 * scale);
  }
  if (opts.helmet) {
    ctx.fillStyle = opts.helmet;
    ctx.fillRect(px + 3 * scale, py + 2 * scale, 11 * scale, 6 * scale);
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(px + 4 * scale, py + 6 * scale, 9 * scale, 2 * scale);
  }
}

// ---------------------------------------------------------------------------
// ENEMIGOS (32x32, o 48x48 para el jefe final)
// ---------------------------------------------------------------------------
const enemyCache = new Map();

function drawLimo(g) {
  ellipse(g, 16, 21, 12, 9, '#2f8c49');
  ellipse(g, 15, 19, 11, 8, '#48c05e');
  ellipse(g, 12, 16, 6, 4, '#7ee88c');
  ellipse(g, 10, 18, 3, 2, 'rgba(255,255,255,0.55)');
  ellipse(g, 12, 20, 2, 3, '#f2fff5');
  ellipse(g, 20, 20, 2, 3, '#f2fff5');
  rect(g, 12, 21, 2, 2, '#1a3a22');
  rect(g, 20, 21, 2, 2, '#1a3a22');
  line(g, 14, 26, 19, 26, '#1a3a22');
  ellipse(g, 28, 24, 3, 2, '#48c05e');
  ellipse(g, 4, 25, 2, 2, '#48c05e');
}

function drawMurcielago(g) {
  const wing = '#4a2a68';
  const wingLit = '#6b4090';
  poly(g, [[15, 14], [5, 6], [2, 11], [6, 11], [3, 17], [8, 14], [10, 18]], wing);
  poly(g, [[17, 14], [27, 6], [30, 11], [26, 11], [29, 17], [24, 14], [22, 18]], wing);
  poly(g, [[15, 13], [8, 8], [5, 11], [9, 12], [8, 15], [12, 13]], wingLit);
  poly(g, [[17, 13], [24, 8], [27, 11], [23, 12], [24, 15], [20, 13]], wingLit);
  ellipse(g, 16, 17, 5, 6, '#5a3478');
  circle(g, 16, 11, 4, '#6b4090');
  poly(g, [[13, 8], [12, 4], [15, 7]], '#4a2a68');
  poly(g, [[19, 8], [20, 4], [17, 7]], '#4a2a68');
  rect(g, 14, 10, 2, 2, '#ff5577');
  rect(g, 18, 10, 2, 2, '#ff5577');
  poly(g, [[15, 13], [17, 13], [16, 15]], '#f2e8ff');
  line(g, 13, 22, 12, 26, '#4a2a68');
  line(g, 19, 22, 20, 26, '#4a2a68');
}

function drawGoblin(g) {
  rect(g, 11, 22, 4, 8, '#3a5a2a');
  rect(g, 18, 22, 4, 8, '#3a5a2a');
  rect(g, 10, 28, 6, 3, '#2a1a14');
  rect(g, 17, 28, 6, 3, '#2a1a14');
  ellipse(g, 16, 19, 8, 7, '#5a8a3a');
  rect(g, 12, 20, 9, 3, '#8a5a34');
  circle(g, 16, 11, 7, '#6aa044');
  poly(g, [[10, 9], [3, 6], [8, 13]], '#5a8a3a');
  poly(g, [[22, 9], [29, 6], [24, 13]], '#5a8a3a');
  rect(g, 12, 9, 3, 3, '#ffe066');
  rect(g, 18, 9, 3, 3, '#ffe066');
  rect(g, 13, 10, 1, 1, '#1a1a14');
  rect(g, 19, 10, 1, 1, '#1a1a14');
  rect(g, 14, 14, 5, 2, '#2a1a14');
  rect(g, 15, 14, 1, 3, '#f2e8d0');
  rect(g, 18, 14, 1, 3, '#f2e8d0');
  // garrote
  line(g, 27, 12, 30, 26, '#6a4423');
  ellipse(g, 28, 11, 4, 4, '#8a5a34');
  ellipse(g, 27, 10, 2, 2, '#a87a4a');
}

function drawLobo(g) {
  const fur = '#3a3a52';
  const lit = '#55557a';
  ellipse(g, 15, 20, 10, 6, fur);
  ellipse(g, 14, 18, 8, 4, lit);
  rect(g, 7, 22, 3, 7, fur);
  rect(g, 12, 23, 3, 6, fur);
  rect(g, 18, 23, 3, 6, fur);
  rect(g, 23, 22, 3, 7, fur);
  poly(g, [[6, 18], [1, 13], [4, 21]], fur);
  circle(g, 23, 14, 6, fur);
  ellipse(g, 24, 15, 5, 3, lit);
  poly(g, [[25, 8], [27, 3], [29, 11]], fur);
  poly(g, [[20, 8], [19, 4], [23, 9]], fur);
  ellipse(g, 28, 16, 3, 2, '#2a2a3a');
  rect(g, 26, 13, 2, 2, '#ff4466');
  rect(g, 30, 16, 2, 1, '#f2e8d0');
  line(g, 33, 20, 36, 18, fur);
}

function drawEsqueleto(g) {
  const bone = '#e4e0d0';
  const dark = '#8a8678';
  rect(g, 12, 24, 3, 7, bone);
  rect(g, 18, 24, 3, 7, bone);
  rect(g, 11, 30, 5, 2, dark);
  rect(g, 17, 30, 5, 2, dark);
  // costillas
  rect(g, 12, 16, 9, 9, '#c8c4b4');
  for (let i = 0; i < 4; i++) {
    rect(g, 12, 17 + i * 2, 9, 1, dark);
  }
  rect(g, 15, 16, 3, 9, dark);
  // brazos
  rect(g, 8, 17, 3, 8, bone);
  rect(g, 22, 17, 3, 8, bone);
  rect(g, 7, 24, 4, 2, bone);
  rect(g, 22, 24, 4, 2, bone);
  // calavera
  circle(g, 16, 10, 7, bone);
  rect(g, 11, 13, 11, 4, bone);
  rect(g, 12, 8, 3, 4, '#1a1a20');
  rect(g, 18, 8, 3, 4, '#1a1a20');
  rect(g, 15, 11, 2, 2, '#1a1a20');
  rect(g, 13, 15, 1, 2, '#1a1a20');
  rect(g, 16, 15, 1, 2, '#1a1a20');
  rect(g, 19, 15, 1, 2, '#1a1a20');
  // espada
  line(g, 27, 10, 27, 27, '#b8c0d8');
  rect(g, 25, 26, 5, 2, '#8a5a34');
  rect(g, 26, 28, 3, 4, '#6a4423');
}

function drawEspectro(g) {
  const body = '#7a5aa8';
  const glow = '#b18cff';
  poly(g, [[16, 4], [24, 8], [26, 18], [29, 22], [25, 21], [24, 27], [20, 23], [17, 28], [14, 23], [10, 27], [9, 21], [5, 23], [8, 18], [8, 8]], body);
  ellipse(g, 16, 12, 9, 8, body);
  ellipse(g, 14, 10, 5, 4, glow);
  circle(g, 13, 13, 2, '#1a1030');
  circle(g, 19, 13, 2, '#1a1030');
  rect(g, 12, 12, 1, 1, '#7fe3ff');
  rect(g, 18, 12, 1, 1, '#7fe3ff');
  ellipse(g, 16, 18, 2, 3, '#1a1030');
  // jirones
  poly(g, [[9, 22], [6, 29], [11, 25]], shade(body, -0.25));
  poly(g, [[23, 22], [27, 30], [21, 25]], shade(body, -0.25));
  line(g, 12, 20, 12, 24, glow);
}

function drawGolem(g) {
  const rock = '#6e6a60';
  const lit = '#8e8a7c';
  const dark = '#4a463e';
  rect(g, 9, 24, 6, 8, dark);
  rect(g, 18, 24, 6, 8, dark);
  rect(g, 8, 30, 8, 2, '#3a362e');
  rect(g, 17, 30, 8, 2, '#3a362e');
  poly(g, [[9, 12], [23, 12], [26, 26], [6, 26]], rock);
  poly(g, [[11, 13], [17, 13], [16, 25], [8, 25]], lit);
  // brazos
  rect(g, 3, 14, 6, 13, rock);
  rect(g, 23, 14, 6, 13, rock);
  rect(g, 2, 25, 7, 4, lit);
  rect(g, 23, 25, 7, 4, lit);
  // cabeza
  poly(g, [[11, 3], [21, 3], [23, 11], [9, 11]], rock);
  rect(g, 12, 4, 4, 3, lit);
  rect(g, 12, 6, 3, 2, '#ffe066');
  rect(g, 19, 6, 3, 2, '#ffe066');
  rect(g, 13, 7, 1, 1, '#1a1a14');
  rect(g, 20, 7, 1, 1, '#1a1a14');
  // grietas
  line(g, 13, 14, 15, 20, dark);
  line(g, 15, 20, 13, 24, dark);
  line(g, 21, 16, 20, 21, dark);
  rect(g, 10, 22, 3, 1, dark);
}

function drawCaballero(g) {
  const armor = '#2e2e46';
  const lit = '#4a4a6a';
  const trim = '#8a7a4a';
  // capa
  poly(g, [[10, 12], [22, 12], [26, 31], [6, 31]], '#5a1f2e');
  poly(g, [[12, 13], [16, 13], [14, 30], [9, 30]], '#7a2a3e');
  // piernas
  rect(g, 11, 24, 5, 8, armor);
  rect(g, 18, 24, 5, 8, armor);
  rect(g, 10, 30, 7, 2, lit);
  rect(g, 18, 30, 7, 2, lit);
  // torso
  poly(g, [[10, 13], [22, 13], [24, 24], [8, 24]], armor);
  poly(g, [[12, 14], [17, 14], [16, 23], [10, 23]], lit);
  rect(g, 9, 15, 3, 8, armor);
  rect(g, 21, 15, 3, 8, armor);
  // hombreras
  poly(g, [[7, 12], [12, 11], [13, 16], [6, 16]], trim);
  poly(g, [[20, 11], [25, 12], [26, 16], [19, 16]], trim);
  // yelmo
  poly(g, [[11, 3], [21, 3], [22, 13], [10, 13]], armor);
  rect(g, 11, 3, 10, 3, lit);
  rect(g, 11, 8, 10, 3, '#0e0e16');
  rect(g, 13, 8, 2, 2, '#ff4466');
  rect(g, 18, 8, 2, 2, '#ff4466');
  rect(g, 16, 11, 3, 1, trim);
  // cuernos del yelmo
  poly(g, [[11, 4], [7, 0], [9, 7]], trim);
  poly(g, [[21, 4], [25, 0], [23, 7]], trim);
  // espada
  rect(g, 27, 8, 2, 18, '#c8d0e8');
  rect(g, 26, 24, 4, 2, trim);
  rect(g, 27, 26, 2, 4, '#6a4423');
  // escudo
  poly(g, [[3, 16], [8, 14], [9, 24], [5, 28], [2, 24]], '#3a5a8a');
  rect(g, 5, 18, 2, 6, trim);
}

function drawVaelor(g) {
  const armor = '#241a34';
  const lit = '#3e2c54';
  const trim = '#c8a050';
  const glow = '#b18cff';
  // capa
  poly(g, [[14, 14], [34, 14], [42, 46], [6, 46]], '#1a1024');
  poly(g, [[16, 16], [22, 16], [18, 45], [10, 45]], '#3a1a44');
  poly(g, [[26, 16], [32, 16], [38, 45], [30, 45]], '#2a1234');
  // piernas
  rect(g, 17, 36, 6, 9, armor);
  rect(g, 25, 36, 6, 9, armor);
  rect(g, 16, 44, 8, 3, lit);
  rect(g, 25, 44, 8, 3, lit);
  // torso
  poly(g, [[15, 16], [33, 16], [35, 36], [13, 36]], armor);
  poly(g, [[18, 17], [26, 17], [25, 35], [16, 35]], lit);
  // hombreras con pinchos
  poly(g, [[9, 15], [17, 14], [18, 22], [8, 22]], trim);
  poly(g, [[31, 14], [39, 15], [40, 22], [30, 22]], trim);
  poly(g, [[10, 14], [7, 7], [13, 13]], trim);
  poly(g, [[38, 14], [41, 7], [35, 13]], trim);
  // cabeza
  poly(g, [[19, 4], [29, 4], [30, 15], [18, 15]], '#d8b090');
  rect(g, 18, 2, 12, 4, '#2a1a34');
  rect(g, 20, 0, 2, 4, trim);
  rect(g, 24, 0, 2, 4, trim);
  rect(g, 28, 0, 2, 4, trim);
  rect(g, 20, 9, 3, 2, glow);
  rect(g, 25, 9, 3, 2, glow);
  rect(g, 22, 13, 4, 1, '#3a1a24');
  // orbe
  circle(g, 40, 26, 6, '#3a2050');
  circle(g, 40, 26, 4, glow);
  circle(g, 39, 24, 2, '#e8d8ff');
  line(g, 36, 32, 33, 38, trim);
  // aura
  line(g, 6, 12, 2, 6, glow);
  line(g, 42, 12, 46, 6, glow);
}

const ENEMY_DRAW = {
  limo: drawLimo,
  murcielago: drawMurcielago,
  goblin: drawGoblin,
  lobo: drawLobo,
  esqueleto: drawEsqueleto,
  espectro: drawEspectro,
  golem: drawGolem,
  caballero: drawCaballero,
  vaelor: drawVaelor,
};

export function enemySprite(id) {
  if (enemyCache.has(id)) return enemyCache.get(id);
  const fn = ENEMY_DRAW[id] || drawLimo;
  const size = id === 'vaelor' ? 48 : id === 'caballero' ? 40 : 32;
  const { canvas, g } = makeCanvas(size, size);
  // Los dibujos pequeños (32x32) se centran en lienzos mayores; Vaelor ya usa 48.
  if (size !== 48) g.translate(Math.floor((size - 32) / 2), size - 32);
  fn(g);
  const outlined = outlineCanvas(canvas, OUTLINE);
  enemyCache.set(id, outlined);
  return outlined;
}

const whiteCache = new Map();
export function whiteSprite(id) {
  if (whiteCache.has(id)) return whiteCache.get(id);
  const src = enemySprite(id);
  const { canvas, g } = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  whiteCache.set(id, canvas);
  return canvas;
}

export function drawEnemy(ctx, id, x, y, flash = false, alpha = 1) {
  const sprite = flash ? whiteSprite(id) : enemySprite(id);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height));
  ctx.restore();
}

// ---------------------------------------------------------------------------
// OBJETOS DE CAMPO
// ---------------------------------------------------------------------------
const objectCache = new Map();

function buildObject(kind) {
  if (objectCache.has(kind)) return objectCache.get(kind);
  const { canvas, g } = makeCanvas(16, 18);
  if (kind === 'chest') {
    rect(g, 2, 7, 12, 8, '#8a5a34');
    rect(g, 2, 7, 12, 3, '#a87a4a');
    rect(g, 2, 7, 12, 1, '#d8b07a');
    rect(g, 6, 9, 4, 4, '#f4d58d');
    rect(g, 7, 10, 2, 2, '#3a2418');
    rect(g, 1, 6, 14, 2, '#6a4423');
    rect(g, 1, 14, 14, 2, '#5a3423');
  } else if (kind === 'chestOpen') {
    rect(g, 2, 10, 12, 5, '#8a5a34');
    rect(g, 1, 5, 14, 3, '#6a4423');
    rect(g, 4, 9, 8, 3, '#2a1a14');
    rect(g, 6, 8, 4, 2, '#ffe9a8');
  } else if (kind === 'sign') {
    rect(g, 7, 10, 2, 7, '#6a4423');
    rect(g, 2, 4, 12, 8, '#a87a4a');
    rect(g, 3, 5, 10, 6, '#c89a5a');
    rect(g, 4, 7, 8, 1, '#5a3423');
    rect(g, 4, 9, 5, 1, '#5a3423');
  } else if (kind === 'crystal') {
    poly(g, [[8, 1], [13, 8], [11, 16], [5, 16], [3, 8]], '#7fe3ff');
    poly(g, [[8, 2], [10, 8], [8, 14], [5, 8]], '#d8faff');
    poly(g, [[13, 8], [11, 16], [10, 14], [11, 8]], '#3aa8d8');
    rect(g, 7, 16, 3, 2, '#2a6a8a');
  } else if (kind === 'save') {
    poly(g, [[8, 0], [14, 7], [11, 17], [5, 17], [2, 7]], '#9fe8ff');
    poly(g, [[8, 2], [11, 7], [8, 14], [4, 7]], '#e8fcff');
    rect(g, 6, 16, 4, 2, '#3a8aa8');
  } else if (kind === 'flower') {
    rect(g, 7, 8, 2, 6, '#2f7a3a');
    rect(g, 6, 6, 4, 3, '#ff7aa8');
    rect(g, 7, 7, 2, 1, '#ffe066');
  } else if (kind === 'rock') {
    poly(g, [[3, 15], [2, 10], [6, 6], [12, 7], [14, 12], [12, 16]], '#7a7a82');
    poly(g, [[4, 13], [4, 10], [7, 7], [8, 11]], '#9a9aa4');
  } else if (kind === 'bones') {
    rect(g, 3, 12, 7, 2, '#d8d4c4');
    rect(g, 10, 13, 3, 2, '#d8d4c4');
    circle(g, 12, 9, 3, '#e4e0d0');
    rect(g, 11, 8, 1, 2, '#2a2a2a');
    rect(g, 13, 8, 1, 2, '#2a2a2a');
  }
  const out = outlineCanvas(canvas, OUTLINE);
  objectCache.set(kind, out);
  return out;
}

export function drawObject(ctx, kind, x, y, opts = {}) {
  const sprite = buildObject(kind);
  const ax = opts.anchor === 'bottom' ? y - 18 : y;
  ctx.drawImage(sprite, Math.round(x - 8), Math.round(ax));
}

// Sombra de criatura para el campo
export function drawShadow(ctx, x, y, rx = 6, ry = 2.5) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Partícula de brillo (para cristales y cofres)
export function drawSparkle(ctx, x, y, t, color = '#fff3c4') {
  const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + x * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
  ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
  ctx.restore();
}

// Sombra de personaje reutilizable
export function heroShadow(ctx, x, y, scale = 1) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 6 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

export { OUTLINE, mix };
