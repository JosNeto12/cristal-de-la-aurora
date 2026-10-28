// Azar reproducible: todo el contenido "aleatorio" visual usa semilla para que
// los mapas y texturas se vean iguales en cada partida.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = Date.now()) {
  const r = mulberry32(seed >>> 0);
  return {
    next: r,
    int: (min, max) => min + Math.floor(r() * (max - min + 1)),
    float: (min, max) => min + r() * (max - min),
    chance: (p) => r() < p,
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    shuffle: (arr) => {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    weighted: (entries) => {
      // entries: [{w:number, ...}]
      const total = entries.reduce((s, e) => s + (e.w || 1), 0);
      let roll = r() * total;
      for (const e of entries) {
        roll -= e.w || 1;
        if (roll <= 0) return e;
      }
      return entries[entries.length - 1];
    },
  };
}

// Generador global de partida
export const RNG = makeRng((Math.random() * 0xffffffff) >>> 0);

export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Ruido determinista por coordenada (para variar tiles)
export function hash2(x, y, seed = 1) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
