// Prueba de los menús de batalla: ataque, magia, objetos y huida.
// Uso: node tests/battle-flow.mjs

import { G } from '../src/core/state.js';
import { BattleScene } from '../src/scenes/battle.js';

const input = {
  just: new Set(),
  dirValue: null,
  isDown() { return false; },
  pressed(a) { return this.just.has(a); },
  releasedNow() { return false; },
  dir() { return null; },
  endFrame() { this.just.clear(); },
};
G.input = input;
G.audio = null;
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
  if (cond) { passes++; console.log(`  ✓ ${name}`); }
  else { failures++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
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
function makeBattle(enemies, opts = {}) {
  G.newGame();
  for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
  for (const m of G.party) {
    m.lvl = opts.level || 5;
    m.exp = 0;
  }
  G.healParty();
  const b = new BattleScene({
    enemies,
    nowait: true,
    ...opts,
    onDone: (r) => { b.result = r; },
  });
  G.scenes.set(b);
  step(4);
  return b;
}

console.log('\n▸ Menús de batalla');

// --- Ataque ---
let b = makeBattle([{ id: 'limo', n: 2 }]);
let actor = b.party[0];
b.openCommand(actor);
check('el menú de comandos se abre', b.menu.mode === 'command');
check('el primer comando es Atacar', b.commandOptions(actor)[0].id === 'attack');
const targetHp = b.aliveEnemies()[0].hp;
press('ok');
check('entra en selección de objetivo', b.menu.mode === 'target', b.menu.mode);
press('ok');
check('la acción entra en resolución', b.phase === 'acting' || b.phase === 'idle', b.phase);
step(80);
check('el enemigo recibe daño', b.enemies[0].hp < targetHp || b.enemies[1].hp < targetHp,
  `hp=${b.enemies[0].hp},${b.enemies[1].hp}`);

// --- Magia ---
b = makeBattle([{ id: 'goblin', n: 1 }], { level: 5 });
actor = b.party[0];
actor.mp = 99;
b.openCommand(actor);
press('down'); // Magia
press('ok');
check('submenú de magia', b.menu.mode === 'magic', b.menu.mode);
check('Kael conoce Golpe de Luz', b.spellList(actor)[0].label === 'Golpe de Luz');
const hpBeforeSpell = b.enemies[0].hp;
press('ok');
if (b.menu.mode === 'target') press('ok');
step(90);
check('la magia hace daño', b.enemies[0].hp < hpBeforeSpell, `hp=${b.enemies[0].hp}`);
check('la magia consume PM', actor.mp < 99, `pm=${actor.mp}`);

// --- Objeto ---
b = makeBattle([{ id: 'limo', n: 1 }], { level: 5 });
G.giveItem('pocion', 3);
b.party[1].hp = 10;
const potions = G.countItem('pocion');
const hpBeforeItem = b.party[1].hp;
b.openCommand(b.party[1]);
press('down');
press('down'); // Objeto
press('ok');
check('submenú de objetos', b.menu.mode === 'item', b.menu.mode);
const potionIdx = b.itemList().findIndex((it) => it.id === 'pocion');
for (let i = 0; i < Math.max(0, potionIdx); i++) press('down');
press('ok'); // poción
check('elige aliado para la poción', b.menu.mode === 'target', b.menu.mode);
if (b.menu.mode === 'target') {
  // seleccionar al aliado herido
  const idx = b.menu.pending.targets.findIndex((u) => u === b.party[1]);
  for (let i = 0; i < Math.max(0, idx); i++) press('right');
  press('ok');
}
step(70);
check('la poción cura', b.party[1].hp > hpBeforeItem, `hp=${b.party[1].hp}`);
check('la poción se consume', G.countItem('pocion') === potions - 1, `quedan=${G.countItem('pocion')}`);

// --- Huir deshabilitado en jefe ---
b = makeBattle([{ id: 'caballero_negro', n: 1 }], { boss: true, level: 8 });
const fleeOpt = b.commandOptions(b.party[0]).find((o) => o.id === 'flee');
check('no se puede huir de un jefe', fleeOpt.disabled === true);

// --- Defensa ---
b = makeBattle([{ id: 'goblin', n: 1 }], { level: 4 });
b.openCommand(b.party[0]);
press('down'); press('down'); press('down'); // Defender
press('ok');
check('el personaje se protege', b.party[0].defending === true);

// --- Turno enemigo y daño ---
b = makeBattle([{ id: 'goblin', n: 1 }], { level: 2 });
const hpParty = b.party.map((p) => p.hp);
const enemy = b.enemies[0];
enemy.atb = 1;
step(120);
const anyHurt = b.party.some((p, i) => p.hp < hpParty[i]);
check('el enemigo ataca y hace daño', anyHurt, `hp=${b.party.map((p) => p.hp).join(',')}`);

// --- Victoria ---
let result = null;
G.newGame();
for (const id of ['lyra', 'bram', 'nyx']) G.addMember(id);
G.healParty();
const vb = new BattleScene({
  enemies: [{ id: 'limo', n: 1 }],
  nowait: true,
  onDone: (r) => { result = r; },
});
G.scenes.set(vb);
step(2);
const goldBefore = G.gold;
vb.enemies.forEach((e) => { e.hp = 0; e.alive = false; });
vb.checkEnd();
step(3);
press('ok');
step(3);
check('la victoria devuelve "win"', result === 'win', String(result));
check('la victoria da oro', G.gold > goldBefore, `${goldBefore}→${G.gold}`);

console.log(`\n${passes} comprobaciones correctas, ${failures} fallos.`);
if (failures) process.exit(1);
