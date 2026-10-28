// Punto de entrada: arranque, bucle principal, escalado y escenas.

import { G } from './core/state.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { CHARACTERS } from './data/characters.js';
import { registerPalette } from './gfx/sprites.js';
import { TitleScene } from './scenes/title.js';
import { FieldScene } from './scenes/field.js';
import { BattleScene } from './scenes/battle.js';
import { MenuScene } from './scenes/menu.js';
import { ShopScene } from './scenes/shop.js';
import { EndingScene } from './scenes/ending.js';
import { IntroScene } from './scenes/intro.js';
import { GameOverScene } from './scenes/gameover.js';

class SceneManager {
  constructor() {
    this.stack = [];
  }

  get top() {
    return this.stack[this.stack.length - 1] || null;
  }

  set(scene) {
    this.stack = [scene];
    scene.enter?.();
  }

  push(scene) {
    this.stack.push(scene);
    scene.enter?.();
  }

  pop() {
    const scene = this.stack.pop();
    scene?.exit?.();
    return scene;
  }

  update(dt) {
    this.top?.update(dt);
  }

  draw(ctx) {
    this.top?.draw(ctx);
  }
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

G.canvas = canvas;
G.ctx = ctx;
G.input = new Input();
G.input.attachTouch(canvas);
G.audio = new AudioEngine();
G.scenes = new SceneManager();

for (const [id, char] of Object.entries(CHARACTERS)) {
  registerPalette(id, char.colors);
}

G.input.onFirstGesture = () => {
  G.audio.unlock();
};

// ---------- Escalado entero ----------
function fitCanvas() {
  const maxW = window.innerWidth - 48;
  const maxH = window.innerHeight - 110;
  let scale = Math.min(maxW / 320, maxH / 240);
  if (scale >= 2) scale = Math.floor(scale);
  scale = Math.max(0.5, scale);
  canvas.style.width = `${Math.floor(320 * scale)}px`;
  canvas.style.height = `${Math.floor(240 * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// ---------- Pantalla completa y filtro ----------
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// ---------- Errores visibles ----------
function showFatal(msg) {
  const el = document.getElementById('fatal');
  const pre = document.getElementById('fatal-msg');
  if (!el || !pre) return;
  el.hidden = false;
  pre.textContent = String(msg);
}
window.addEventListener('error', (e) => {
  if (e.error) showFatal(e.error.stack || e.error.message || e.message);
  else showFatal(e.message || 'Error desconocido');
});
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  showFatal(r?.stack || r?.message || String(r));
});

// ---------- Escena inicial (con utilidades de depuración por URL) ----------
const params = new URLSearchParams(window.location.search);
const debugScene = params.get('start');

function setupDebugParty() {
  const party = params.get('party');
  if (party === 'all') {
    for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
  }
  const level = Number(params.get('level') || 0);
  if (level > 1) {
    for (const m of G.party) {
      m.lvl = level;
      m.exp = Math.floor(24 * Math.pow(level - 1, 1.7));
      m.hp = 9999;
      m.mp = 9999;
    }
    for (const m of G.party) {
      m.hp = Math.round(68 + 11 * (level - 1));
      m.mp = Math.round(12 + 3 * (level - 1));
    }
    G.healParty();
  }
}

if (debugScene === 'field') {
  G.newGame();
  setupDebugParty();
  const map = params.get('map') || 'vallebruma';
  const x = params.has('x') ? Number(params.get('x')) : undefined;
  const y = params.has('y') ? Number(params.get('y')) : undefined;
  G.scenes.set(new FieldScene(map, { x, y, dir: params.get('dir') || 'down' }));
  G.fade.alpha = 0;
} else if (debugScene === 'battle') {
  G.newGame();
  if (params.get('party') !== 'solo') {
    for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
  }
  const level = Number(params.get('level') || 3);
  for (const m of G.party) {
    m.lvl = level;
    m.exp = Math.floor(24 * Math.pow(level - 1, 1.7));
  }
  G.healParty();
  const ids = (params.get('enemies') || 'limo,limo').split(',');
  const enemies = ids.map((id) => ({ id: id.trim(), n: 1 }));
  G.scenes.set(new BattleScene({
    enemies,
    boss: params.get('boss') === '1',
    bg: params.get('bg') || 'day',
    music: params.get('boss') === '1' ? 'boss' : 'battle',
    debugHud: params.get('hud') === '1',
    nowait: params.get('nowait') === '1',
    openMenu: params.get('menu') === '1',
    onDone: () => {
      G.scenes.set(new FieldScene('vallebruma'));
    },
  }));
  G.fade.alpha = 0;
} else if (debugScene === 'menu' || debugScene === 'shop') {
  G.newGame();
  setupDebugParty();
  const field = new FieldScene(params.get('map') || 'vallebruma', { x: 16, y: 16, dir: 'down' });
  G.scenes.set(field);
  if (debugScene === 'menu') G.scenes.push(new MenuScene(field));
  else G.scenes.push(new ShopScene(params.get('shop') || 'vallebruma', field, () => G.scenes.pop()));
  G.fade.alpha = 0;
} else if (debugScene === 'ending') {
  G.newGame();
  for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
  G.scenes.set(new EndingScene());
  G.fade.alpha = 0;
} else if (debugScene === 'intro') {
  G.newGame();
  G.scenes.set(new IntroScene());
  G.fade.alpha = 0;
} else if (debugScene === 'gameover') {
  G.newGame();
  for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
  G.scenes.set(new GameOverScene());
  G.fade.alpha = 0;
} else if (debugScene === 'dialogue') {
  G.newGame();
  setupDebugParty();
  const field = new FieldScene('vallebruma', { x: 13, y: 12, dir: 'right' });
  G.scenes.set(field);
  field.banner.t = 0;
  field.dialogue.say([
    'Lyra: Kael, el anciano te busca desde el amanecer.',
    'Dice que el Cristal de la Aurora ha vuelto a latir... y que eso no es buena señal.',
    'He preparado vendas, hierbas y tres conjuros de curación. Puedo ir contigo.',
  ]);
  G.fade.alpha = 0;
} else {
  const title = new TitleScene();
  G.scenes.set(title);
  G.fade.alpha = 0;
  if (params.get('info') === '1') title.choose('Cómo jugar');
}

// ---------- Bucle ----------
let last = performance.now();
let running = true;

function frame(now) {
  if (!running) return;
  let dt = (now - last) / 1000;
  last = now;
  if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.05);

  if (G.input.pressed('fullscreen')) toggleFullscreen();
  if (G.input.pressed('scanlines')) document.body.classList.toggle('no-crt');
  if (G.input.pressed('mute')) G.audio.toggleMute();

  G.updateEffects(dt);
  G.scenes.update(dt);

  ctx.save();
  if (G.shake > 0.2) {
    const s = G.shake;
    ctx.translate(Math.round((Math.random() - 0.5) * s), Math.round((Math.random() - 0.5) * s));
  }
  G.scenes.draw(ctx);
  ctx.restore();

  // Fundido global
  if (G.fade.alpha > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(1, G.fade.alpha));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 320, 240);
    ctx.globalAlpha = 1;
  }
  // Destello global
  if (G.flash.alpha > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(0.85, G.flash.alpha));
    ctx.fillStyle = G.flash.color;
    ctx.fillRect(0, 0, 320, 240);
    ctx.globalAlpha = 1;
  }

  G.input.endFrame();
  G.audio.update();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Depuración desde consola
window.__G = G;
window.__GAME = {
  warp: (map, x, y) => G.scenes.set(new FieldScene(map, { x, y })),
  battle: (ids) => G.scenes.push(new BattleScene({
    enemies: ids.map((id) => ({ id, n: 1 })), onDone: () => G.scenes.pop(),
  })),
  giveAll: () => {
    for (const id of ['pocion', 'pocion_mayor', 'eter', 'antidoto', 'fenix', 'bomba', 'elixir']) G.giveItem(id, 9);
  },
  level: (n) => {
    for (const m of G.party) {
      m.lvl = n;
      m.exp = Math.floor(24 * Math.pow(n - 1, 1.7));
      m.hp = 9999;
      m.mp = 9999;
    }
  },
};
