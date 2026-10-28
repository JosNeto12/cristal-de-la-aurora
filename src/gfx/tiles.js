// Tileset generado por código: 16x16 por baldosa, con variantes y agua animada.

import { makeCanvas, rect, line, ellipse, circle, poly, shade, mix } from './pixel.js';
import { hash2 } from '../core/rng.js';

export const TILE = 16;

export const TILE_INFO = {
  grass: { solid: false },
  grass2: { solid: false },
  flowers: { solid: false },
  path: { solid: false },
  dirt: { solid: false },
  sand: { solid: false },
  water: { solid: true, liquid: true },
  water_edge: { solid: true, liquid: true },
  tree: { solid: true, tall: true },
  pine: { solid: true, tall: true },
  bush: { solid: true },
  mountain: { solid: true, tall: true },
  snow: { solid: false },
  wall: { solid: true },
  roof: { solid: true },
  window: { solid: true },
  door: { solid: true, door: true },
  wood: { solid: false },
  panel: { solid: true },
  stone: { solid: false },
  carpet: { solid: false },
  counter: { solid: true },
  bed: { solid: true },
  table: { solid: true },
  cave: { solid: false },
  cavewall: { solid: true },
  crystal: { solid: true, tall: true },
  stairs: { solid: false },
  bridge: { solid: false },
  void: { solid: true },
  pillar: { solid: true, tall: true },
  fence: { solid: true },
  gate: { solid: true },
  rune: { solid: false },
};

export function isSolid(kind) {
  return !!(TILE_INFO[kind] && TILE_INFO[kind].solid);
}

const variants = 4;
const cache = new Map();

function tileCanvas(kind, variant, frame) {
  const key = `${kind}:${variant}:${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { canvas, g } = makeCanvas(TILE, TILE);
  const seed = 1000 + variant * 17 + (kind.length * 31);
  drawTileArt(kind, g, variant, frame, seed);
  cache.set(key, canvas);
  return canvas;
}

function speckle(g, count, colors, seed) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash2(i, seed, 3) * 16);
    const y = Math.floor(hash2(i, seed, 7) * 16);
    const c = colors[Math.floor(hash2(i, seed, 11) * colors.length)];
    g.fillStyle = c;
    g.fillRect(x, y, 1, 1);
  }
}

function drawTileArt(kind, g, v, frame, seed) {
  switch (kind) {
    case 'grass':
    case 'grass2': {
      const base = kind === 'grass' ? '#4f9e3c' : '#478f38';
      rect(g, 0, 0, 16, 16, base);
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(hash2(i, seed, 1) * 16);
        const y = Math.floor(hash2(i, seed, 2) * 16);
        rect(g, x, y, 1, 2, i % 3 === 0 ? '#63bd4d' : '#3d7f30');
      }
      if (v % 2 === 0) {
        rect(g, 3 + (v % 3), 11, 1, 2, '#6fd05a');
        rect(g, 10 - (v % 3), 5, 1, 2, '#6fd05a');
      }
      break;
    }
    case 'flowers': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      speckle(g, 8, ['#3d7f30', '#63bd4d'], seed);
      const cols = ['#ffd166', '#ff7aa8', '#f8f8ff', '#b18cff'];
      for (let i = 0; i < 4; i++) {
        const x = 2 + Math.floor(hash2(i, seed, 5) * 12);
        const y = 2 + Math.floor(hash2(i, seed, 6) * 12);
        rect(g, x, y, 2, 2, cols[(i + v) % cols.length]);
        rect(g, x, y + 2, 1, 2, '#2f7a3a');
      }
      break;
    }
    case 'path':
    case 'dirt': {
      rect(g, 0, 0, 16, 16, kind === 'path' ? '#b08a5a' : '#8f6a44');
      speckle(g, 14, kind === 'path' ? ['#c49a68', '#9a7448', '#a88252'] : ['#7a5836', '#a0784e'], seed);
      if (v === 0) {
        rect(g, 4, 4, 3, 2, '#c8a274');
        rect(g, 11, 10, 2, 2, '#8a6440');
      }
      break;
    }
    case 'sand': {
      rect(g, 0, 0, 16, 16, '#e0c68a');
      speckle(g, 16, ['#d4b878', '#eed8a4', '#c8ac6c'], seed);
      break;
    }
    case 'water':
    case 'water_edge': {
      const base = '#2b5fc0';
      rect(g, 0, 0, 16, 16, base);
      for (let y = 0; y < 16; y += 4) {
        const off = Math.sin((y + frame * 3 + seed) * 0.6) * 2;
        for (let x = 0; x < 16; x += 6) {
          rect(g, (x + off + 16) % 16, y + 1, 3, 1, '#4a86e8');
        }
      }
      speckle(g, 4, ['#7fb4ff', '#1e4a9a'], seed);
      if (kind === 'water_edge') {
        rect(g, 0, 0, 16, 2, '#7fb4ff');
        rect(g, 0, 2, 16, 1, '#4a86e8');
      }
      break;
    }
    case 'tree': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      rect(g, 7, 10, 3, 6, '#6a4423');
      rect(g, 7, 10, 1, 6, '#8a5a34');
      ellipse(g, 8, 7, 7, 6, '#2f6a2f');
      ellipse(g, 7, 6, 5, 4, '#3f8a3a');
      ellipse(g, 6, 5, 2, 2, '#57a84a');
      rect(g, 3, 11, 2, 2, '#2f6a2f');
      rect(g, 11, 12, 2, 2, '#2f6a2f');
      break;
    }
    case 'pine': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      rect(g, 7, 12, 2, 4, '#5a3a22');
      poly(g, [[8, 0], [13, 8], [3, 8]], '#245a2c');
      poly(g, [[8, 4], [14, 13], [2, 13]], '#2f6a34');
      poly(g, [[8, 1], [11, 7], [5, 7]], '#3f8a3a');
      break;
    }
    case 'bush': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      ellipse(g, 8, 10, 6, 5, '#2f6a2f');
      ellipse(g, 7, 8, 4, 3, '#3f8a3a');
      circle(g, 5, 7, 1, '#57a84a');
      rect(g, 11, 12, 1, 2, '#245a2c');
      break;
    }
    case 'mountain': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      poly(g, [[1, 16], [8, 1], [15, 16]], '#6a6a78');
      poly(g, [[3, 16], [8, 4], [13, 16]], '#7f7f90');
      poly(g, [[8, 1], [11, 7], [9, 9], [7, 6]], '#e8eef8');
      poly(g, [[8, 4], [10, 8], [8, 8]], '#c8d0e0');
      rect(g, 4, 13, 2, 2, '#5a5a68');
      rect(g, 10, 12, 2, 3, '#5a5a68');
      break;
    }
    case 'snow': {
      rect(g, 0, 0, 16, 16, '#e8eef8');
      speckle(g, 10, ['#d0d8ec', '#ffffff'], seed);
      break;
    }
    case 'wall': {
      rect(g, 0, 0, 16, 16, '#c0a080');
      for (let y = 0; y < 16; y += 4) {
        rect(g, 0, y, 16, 1, '#8a6a54');
        const off = (y / 4) % 2 === 0 ? 0 : 4;
        for (let x = off; x < 16; x += 8) rect(g, x, y, 1, 4, '#8a6a54');
        rect(g, 0, y + 1, 16, 1, '#d8b898');
      }
      speckle(g, 6, ['#b08a70', '#a07a62'], seed);
      break;
    }
    case 'roof': {
      rect(g, 0, 0, 16, 16, '#8e2f2a');
      for (let y = 0; y < 16; y += 4) {
        rect(g, 0, y, 16, 1, '#541410');
        rect(g, 0, y + 1, 16, 1, '#c25a44');
        const off = (y / 4) % 2 === 0 ? 0 : 3;
        for (let x = off; x < 16; x += 6) rect(g, x, y + 1, 1, 3, '#6a1e18');
        rect(g, 0, y + 3, 16, 1, '#7a241c');
      }
      rect(g, 0, 0, 16, 1, '#e08a6a');
      break;
    }
    case 'window': {
      rect(g, 0, 0, 16, 16, '#9a7a62');
      rect(g, 2, 2, 12, 11, '#3a5a8a');
      rect(g, 3, 3, 10, 4, '#7fb4ff');
      rect(g, 7, 2, 2, 11, '#6a5040');
      rect(g, 2, 7, 12, 2, '#6a5040');
      rect(g, 2, 13, 12, 2, '#6a5040');
      break;
    }
    case 'door': {
      rect(g, 0, 0, 16, 16, '#9a7a62');
      rect(g, 2, 2, 12, 14, '#6a4423');
      rect(g, 3, 3, 10, 12, '#8a5a34');
      rect(g, 3, 3, 10, 1, '#a87a4a');
      rect(g, 3, 7, 10, 1, '#5a3423');
      rect(g, 3, 11, 10, 1, '#5a3423');
      rect(g, 11, 9, 1, 2, '#f4d58d');
      break;
    }
    case 'wood': {
      rect(g, 0, 0, 16, 16, '#a87a4a');
      for (let y = 0; y < 16; y += 4) {
        rect(g, 0, y, 16, 1, '#7a5632');
        rect(g, 0, y + 1, 16, 1, '#b88a5a');
      }
      rect(g, 5, 0, 1, 16, '#8a6238');
      rect(g, 12, 0, 1, 16, '#8a6238');
      break;
    }
    case 'stone': {
      rect(g, 0, 0, 16, 16, '#8a8a98');
      for (let y = 0; y < 16; y += 8) {
        for (let x = 0; x < 16; x += 8) {
          rect(g, x, y, 8, 1, '#6a6a78');
          rect(g, x, y, 1, 8, '#6a6a78');
          rect(g, x + 1, y + 1, 7, 1, '#9a9aa8');
        }
      }
      speckle(g, 5, ['#7a7a88', '#9a9aa8'], seed);
      break;
    }
    case 'carpet': {
      rect(g, 0, 0, 16, 16, '#8a1f33');
      // patrón continuo, sin borde por baldosa
      rect(g, 0, 0, 16, 1, '#7a1a2c');
      rect(g, 8, 0, 1, 16, '#7a1a2c');
      rect(g, 0, 8, 16, 1, '#7a1a2c');
      for (let i = 0; i < 3; i++) {
        rect(g, 2 + i * 6, 3, 2, 2, '#a82a42');
        rect(g, 5 + i * 6, 6, 2, 2, '#a82a42');
      }
      rect(g, 3, 11, 2, 2, '#a82a42');
      rect(g, 12, 2, 1, 1, '#c8a050');
      break;
    }
    case 'panel': {
      rect(g, 0, 0, 16, 16, '#5a3a2a');
      for (let x = 0; x < 16; x += 4) {
        rect(g, x, 2, 1, 12, '#3e2618');
        rect(g, x + 1, 2, 1, 12, '#6a4632');
      }
      rect(g, 0, 0, 16, 2, '#8a5a34');
      rect(g, 0, 0, 16, 1, '#a87a4a');
      rect(g, 0, 14, 16, 2, '#3a2418');
      break;
    }
    case 'bed': {
      rect(g, 0, 0, 16, 16, '#8a6238');
      rect(g, 1, 1, 14, 14, '#5a3a2a');
      rect(g, 2, 2, 12, 12, '#e8eef8');
      rect(g, 3, 3, 10, 4, '#ffffff');
      rect(g, 2, 8, 12, 6, '#5b8cff');
      rect(g, 2, 8, 12, 1, '#9fc4ff');
      rect(g, 0, 0, 16, 1, '#a87a4a');
      break;
    }
    case 'counter': {
      rect(g, 0, 0, 16, 16, '#8a6238');
      rect(g, 0, 0, 16, 5, '#b88a5a');
      rect(g, 0, 5, 16, 2, '#6a4423');
      rect(g, 0, 7, 16, 9, '#7a5632');
      for (let x = 2; x < 16; x += 5) rect(g, x, 9, 3, 6, '#8a6238');
      rect(g, 0, 0, 16, 1, '#c89a5a');
      break;
    }
    case 'table': {
      rect(g, 0, 0, 16, 16, '#a87a4a');
      rect(g, 0, 0, 16, 1, '#c89a5a');
      rect(g, 1, 3, 14, 10, '#8a6238');
      rect(g, 2, 4, 12, 8, '#a87a4a');
      rect(g, 4, 6, 3, 4, '#f4d58d');
      rect(g, 9, 6, 3, 4, '#e8eef8');
      break;
    }
    case 'cave': {
      rect(g, 0, 0, 16, 16, '#4e4260');
      speckle(g, 14, ['#3e3450', '#5e5274', '#6a5e80'], seed);
      if (v % 2 === 0) {
        rect(g, 5, 7, 5, 1, '#3a3048');
        rect(g, 9, 8, 1, 3, '#3a3048');
      }
      break;
    }
    case 'cavewall': {
      rect(g, 0, 0, 16, 16, '#1c1626');
      poly(g, [[0, 16], [2, 4], [6, 8], [9, 1], [13, 7], [16, 3], [16, 16]], '#2c2238');
      poly(g, [[2, 16], [4, 8], [8, 11], [11, 4], [14, 9], [16, 7], [16, 16]], '#3a2f4a');
      rect(g, 0, 0, 16, 1, '#4a3f5a');
      rect(g, 0, 1, 16, 1, '#2a2136');
      speckle(g, 6, ['#181222', '#4a3f5a'], seed);
      break;
    }
    case 'crystal': {
      rect(g, 0, 0, 16, 16, '#2f2738');
      poly(g, [[8, 0], [13, 7], [11, 15], [5, 15], [3, 7]], '#7fe3ff');
      poly(g, [[8, 1], [10, 7], [8, 13], [5, 7]], '#d8faff');
      poly(g, [[11, 8], [13, 7], [11, 15], [9, 14]], '#3aa8d8');
      rect(g, 3, 15, 10, 1, '#2a6a8a');
      break;
    }
    case 'stairs': {
      rect(g, 0, 0, 16, 16, '#6a6a78');
      rect(g, 0, 0, 16, 4, '#9a9aa8');
      rect(g, 0, 4, 16, 1, '#4a4a58');
      rect(g, 0, 5, 16, 4, '#8a8a98');
      rect(g, 0, 9, 16, 1, '#4a4a58');
      rect(g, 0, 10, 16, 4, '#7a7a88');
      rect(g, 0, 14, 16, 1, '#4a4a58');
      rect(g, 0, 15, 16, 1, '#6a6a78');
      break;
    }
    case 'bridge': {
      rect(g, 0, 0, 16, 16, '#2b5fc0');
      rect(g, 0, 2, 16, 12, '#8a6238');
      for (let x = 0; x < 16; x += 4) rect(g, x, 2, 1, 12, '#6a4423');
      rect(g, 0, 2, 16, 1, '#b88a5a');
      rect(g, 0, 13, 16, 1, '#6a4423');
      break;
    }
    case 'void': {
      rect(g, 0, 0, 16, 16, '#08080e');
      break;
    }
    case 'pillar': {
      rect(g, 0, 0, 16, 16, '#3a3048');
      rect(g, 3, 0, 10, 16, '#8a8a98');
      rect(g, 3, 0, 3, 16, '#a8a8b8');
      rect(g, 10, 0, 3, 16, '#6a6a78');
      rect(g, 2, 0, 12, 2, '#9a9aa8');
      rect(g, 2, 14, 12, 2, '#6a6a78');
      break;
    }
    case 'fence': {
      rect(g, 0, 0, 16, 16, '#4f9e3c');
      rect(g, 0, 6, 16, 2, '#8a6238');
      rect(g, 0, 11, 16, 2, '#8a6238');
      rect(g, 3, 3, 2, 12, '#a87a4a');
      rect(g, 11, 3, 2, 12, '#a87a4a');
      break;
    }
    case 'gate': {
      rect(g, 0, 0, 16, 16, '#2f2738');
      for (let x = 2; x < 16; x += 4) rect(g, x, 0, 2, 16, '#8a8a98');
      rect(g, 0, 4, 16, 2, '#6a6a78');
      rect(g, 0, 11, 16, 2, '#6a6a78');
      break;
    }
    case 'rune': {
      rect(g, 0, 0, 16, 16, '#3a3048');
      circle(g, 8, 8, 6, '#5a4f70');
      circle(g, 8, 8, 5, '#6a5f82');
      line(g, 5, 5, 11, 11, '#b18cff');
      line(g, 11, 5, 5, 11, '#b18cff');
      rect(g, 7, 3, 2, 2, '#d8c8ff');
      break;
    }
    default: {
      rect(g, 0, 0, 16, 16, '#ff00ff');
      break;
    }
  }
}

export function drawTile(ctx, kind, px, py, wx = 0, wy = 0, time = 0) {
  const info = TILE_INFO[kind] || TILE_INFO.grass;
  let variant = 0;
  if (['grass', 'grass2', 'path', 'dirt', 'sand', 'cave', 'stone'].includes(kind)) {
    variant = Math.floor(hash2(wx, wy, 13) * variants);
  }
  let frame = 0;
  if (info.liquid) frame = Math.floor(time * 4) % 4;
  const canvas = tileCanvas(kind, variant, frame);
  ctx.drawImage(canvas, px, py);
}

export { shade, mix, circle, ellipse };
