// Recorrido automático del juego sin navegador: valida diálogos, uniones,
// puertas, cofres, encuentros, jefes y final.
// Uso: node tests/playthrough.mjs

import { G } from '../src/core/state.js';
import { FieldScene } from '../src/scenes/field.js';
import { BattleScene } from '../src/scenes/battle.js';
import { saveGame, loadGame, hasSave } from '../src/core/save.js';

// Almacenamiento simulado para probar guardado/carga
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

// --- Entorno simulado ---
const input = {
  just: new Set(),
  dirValue: null,
  isDown() { return false; },
  pressed(a) { return this.just.has(a); },
  releasedNow() { return false; },
  dir() { return this.dirValue; },
  endFrame() { this.just.clear(); },
};
G.input = input;
G.audio = null;
G.ctx = null;
G.scenes = {
  stack: [],
  set(s) { this.stack = [s]; },
  push(s) { this.stack.push(s); },
  pop() { return this.stack.pop(); },
  get top() { return this.stack[this.stack.length - 1]; },
};

let passes = 0;
let failures = 0;
function check(name, cond, extra = '') {
  if (cond) {
    passes++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
  }
}

function step(n = 1) {
  for (let i = 0; i < n; i++) {
    G.updateEffects(1 / 60);
    G.scenes.top?.update(1 / 60);
    input.endFrame();
  }
}

function press(action) {
  input.just.add(action);
  step(1);
}

function stepUntil(pred, max = 600) {
  for (let i = 0; i < max; i++) {
    step(1);
    if (pred()) return true;
  }
  return false;
}

function place(field, x, y, dir = 'down') {
  field.player.x = x;
  field.player.y = y;
  field.player.px = x * 16 + 8;
  field.player.py = y * 16 + 14;
  field.player.dir = dir;
  field.move = null;
}

function walk(field, dir, frames = 14) {
  input.dirValue = dir;
  step(frames);
  input.dirValue = null;
  step(2);
}

function nudge(dir, frames = 12) {
  input.dirValue = dir;
  step(frames);
  input.dirValue = null;
  step(3);
}

function settle(frames = 50) {
  step(frames);
}

function fieldNow() {
  return G.scenes.top instanceof FieldScene ? G.scenes.top : null;
}

function finishDialogue(max = 120) {
  for (let i = 0; i < max; i++) {
    const field = fieldNow();
    if (!field) break;
    if (field.dialogue.open) {
      field.dialogue.reveal = 9999;
      field.dialogue.advanceLock = 0;
      input.just.add('ok');
      step(1);
    } else if (field.script.active) {
      step(1);
    } else {
      break;
    }
  }
}

function winBattle(battle) {
  for (const e of battle.enemies) { e.hp = 0; e.alive = false; }
  battle.checkEnd();
  step(3);
  input.just.add('ok');
  step(3);
  step(10);
}

// --- Inicio ---
console.log('\n▸ Pueblo de Vallebruma');
G.newGame();
G.fade.alpha = 0;
let field = new FieldScene('vallebruma', { x: 16, y: 18, dir: 'up' });
G.scenes.set(field);
field.encounterCounter = 99999;
check('la partida empieza con Kael', G.party.length === 1 && G.party[0].id === 'kael');
check('no hay Lyra al principio', !G.hasMember('lyra'));

// Colisión: la fuente bloquea el paso
place(field, 16, 15, 'up');
walk(field, 'up', 18);
check('la fuente bloquea el paso', field.player.y === 15, `y=${field.player.y}`);

// Lyra
place(field, 13, 14, 'up');
press('ok');
finishDialogue();
check('Lyra se une al grupo', G.hasMember('lyra'));
check('se marca lyraJoined', G.flag('lyraJoined'));

// Anciano
place(field, 18, 10, 'up');
press('ok');
finishDialogue();
check('empieza la misión', G.flag('questStarted'));
check('el anciano entrega oro', G.gold >= 320, `oro=${G.gold}`);
check('el anciano entrega pociones', G.countItem('pocion') >= 6, `pociones=${G.countItem('pocion')}`);

// Cofre
place(field, 11, 6, 'up');
press('ok');
finishDialogue();
check('cofre del pueblo abierto', G.flag('chest_town_1'));
check('objeto del cofre en inventario', G.countItem('pocion_mayor') >= 1);

// Puerta de la posada
place(field, 7, 8, 'up');
nudge('up', 14);
check('entra en la posada', stepUntil(() => G.scenes.top?.mapId === 'posada', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();

// Bram
place(field, 9, 8, 'right');
press('ok');
finishDialogue();
check('Bram se une al grupo', G.hasMember('bram'));

// Salir de la posada
place(field, 7, 8, 'down');
nudge('down', 14);
check('vuelve al pueblo', stepUntil(() => G.scenes.top?.mapId === 'vallebruma', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();

// Salida al sur
place(field, 16, 20, 'down');
walk(field, 'down', 14);
check('llega a la pradera', stepUntil(() => G.scenes.top?.mapId === 'pradera', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();
field.encounterCounter = 99999;

// Guardado / carga
field.player.x = 5;
field.player.y = 3;
step(1);
const partyBefore = G.party.length;
check('la posición se sincroniza para guardar', G.pos.x === 5 && G.pos.y === 3, `${G.pos.x},${G.pos.y}`);
check('se guarda la partida', saveGame() && hasSave());
G.party = [];
G.gold = 0;
check('se carga la partida', loadGame());
check('el grupo se restaura', G.party.length === partyBefore, `${G.party.length}/${partyBefore}`);
check('el mapa se restaura', G.mapId === 'pradera', G.mapId);
check('la posición se restaura', G.pos.x === 5 && G.pos.y === 3, `${G.pos.x},${G.pos.y}`);
G.fade.alpha = 0;

// Encuentro aleatorio forzado
place(field, 5, 3, 'down');
field.encounterCounter = 1;
walk(field, 'down', 10);
const encounter = G.scenes.top instanceof BattleScene;
check('se activa un encuentro aleatorio', encounter);
if (encounter) {
  winBattle(G.scenes.top);
  stepUntil(() => G.scenes.top instanceof FieldScene, 200);
  check('vuelve al campo tras el combate', G.scenes.top instanceof FieldScene);
  field = fieldNow();
}

// --- Cueva ---
console.log('\n▸ Cueva de los Ecos');
field.warp({ map: 'cueva1', x: 4, y: 18, dir: 'up' });
check('entra en la cueva', stepUntil(() => G.scenes.top?.mapId === 'cueva1', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();
field.encounterCounter = 99999;

place(field, 12, 17, 'right');
press('ok');
finishDialogue();
check('Nyx se une al grupo', G.hasMember('nyx'));
check('grupo completo de cuatro', G.party.length === 4);

field.warp({ map: 'cueva2', x: 3, y: 18, dir: 'up' });
check('baja al segundo nivel', stepUntil(() => G.scenes.top?.mapId === 'cueva2', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();
field.encounterCounter = 99999;

// Jefe intermedio
place(field, 14, 5, 'up');
press('ok');
finishDialogue();
check('empieza el combate contra el Caballero Negro', G.scenes.top instanceof BattleScene);
if (G.scenes.top instanceof BattleScene) {
  winBattle(G.scenes.top);
  stepUntil(() => G.scenes.top instanceof FieldScene, 200);
  finishDialogue();
  check('el Caballero Negro cae', G.flag('caballeroDefeated'));
  check('se obtiene la Llave de Piedra', G.countItem('llave_cueva') >= 1);
  field = fieldNow();
}

// Puerta sellada del santuario
place(field, 14, 2, 'up');
nudge('up', 14);
check('entra al santuario', stepUntil(() => G.scenes.top?.mapId === 'santuario', 300), `mapa=${G.scenes.top?.mapId}`);
settle();
field = fieldNow();

// --- Final ---
console.log('\n▸ Santuario de la Aurora');
place(field, 10, 9, 'up');
walk(field, 'up', 14);
finishDialogue();
check('empieza la batalla final', G.scenes.top instanceof BattleScene);
if (G.scenes.top instanceof BattleScene) {
  const boss = G.scenes.top;
  check('Vaelor tiene dos fases', !!boss.enemies[0].phase2);
  boss.enemies[0].hp = Math.floor(boss.enemies[0].maxhp * 0.45);
  boss.checkEnemyPhase(boss.enemies[0]);
  check('Vaelor se transforma al bajar de la mitad', boss.enemies[0].phase === 2);
  winBattle(boss);
  stepUntil(() => G.scenes.top?.constructor?.name === 'EndingScene', 300);
  check('se alcanza el final', G.scenes.top?.constructor?.name === 'EndingScene', G.scenes.top?.constructor?.name);
}

// --- Resultado ---
console.log(`\n${passes} comprobaciones correctas, ${failures} fallos.`);
if (failures) process.exit(1);
