// Validación estática de datos: mapas, eventos, guiones y referencias.
// Uso: node tests/validate.mjs

import { MAPS } from '../src/data/maps.js';
import { TILE_INFO, isSolid } from '../src/gfx/tiles.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ITEMS, SHOP_STOCK } from '../src/data/items.js';
import { SPELLS } from '../src/data/spells.js';
import { CHARACTERS, canEquip, statsOf, createMember } from '../src/data/characters.js';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const knownFlags = new Set();
const stubG = (flags = {}) => ({
  flags,
  flag: (n) => !!flags[n],
  hasMember: () => false,
  party: [],
  gold: 0,
  avgLevel: () => 1,
  addMember: () => ({ name: 'X' }),
  giveItem: () => {},
  setFlag: (n) => { flags[n] = true; },
  addGold: () => {},
});

function walkCommands(cmds, mapId, origin, flags) {
  if (!Array.isArray(cmds)) {
    err(`${mapId}/${origin}: guion no devuelve un array`);
    return;
  }
  for (const cmd of cmds) {
    if (!cmd || typeof cmd !== 'object') {
      err(`${mapId}/${origin}: comando inválido`);
      continue;
    }
    if (cmd.warp) {
      const m = MAPS[cmd.warp.map];
      if (!m) err(`${mapId}/${origin}: warp a mapa inexistente '${cmd.warp.map}'`);
      else {
        const tx = cmd.warp.x;
        const ty = cmd.warp.y;
        if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) {
          err(`${mapId}/${origin}: warp fuera de límites a ${cmd.warp.map} (${tx},${ty})`);
        } else if (isSolid(m.grid[ty][tx])) {
          err(`${mapId}/${origin}: warp a casilla sólida en ${cmd.warp.map} (${tx},${ty}) = ${m.grid[ty][tx]}`);
        }
      }
    }
    if (cmd.battle) {
      const spec = typeof cmd.battle === 'function' ? cmd.battle(stubG(flags)) : cmd.battle;
      for (const e of spec.enemies || []) {
        if (!ENEMIES[e.id]) err(`${mapId}/${origin}: enemigo desconocido '${e.id}'`);
      }
    }
    if (cmd.shop && !SHOP_STOCK[cmd.shop]) err(`${mapId}/${origin}: tienda desconocida '${cmd.shop}'`);
    if (cmd.give && !ITEMS[cmd.give]) err(`${mapId}/${origin}: objeto desconocido '${cmd.give}'`);
    if (cmd.join && !CHARACTERS[cmd.join]) err(`${mapId}/${origin}: personaje desconocido '${cmd.join}'`);
    if (cmd.ask) {
      walkCommands(cmd.ask.yes || [], mapId, origin + '/ask.yes', flags);
      walkCommands(cmd.ask.no || [], mapId, origin + '/ask.no', flags);
    }
    if (cmd.onWin) walkCommands(cmd.onWin, mapId, origin + '/onWin', flags);
    if (cmd.then) walkCommands(cmd.then, mapId, origin + '/then', flags);
    if (cmd.else) walkCommands(cmd.else, mapId, origin + '/else', flags);
  }
}

// ---- Mapas ----
for (const [id, map] of Object.entries(MAPS)) {
  if (!Array.isArray(map.grid) || map.grid.length !== map.h) {
    err(`${id}: la rejilla no tiene ${map.h} filas`);
    continue;
  }
  map.grid.forEach((row, y) => {
    if (!Array.isArray(row)) {
      err(`${id}: fila ${y} no es un array de baldosas`);
      return;
    }
    if (row.length !== map.w) err(`${id}: fila ${y} mide ${row.length}, se esperaba ${map.w}`);
    for (const cell of row) {
      if (!TILE_INFO[cell]) err(`${id}: tile desconocido '${cell}' en fila ${y}`);
    }
  });

  if (map.spawn) {
    const { x, y } = map.spawn;
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) err(`${id}: spawn fuera de límites`);
    else if (isSolid(map.grid[y][x])) err(`${id}: spawn sobre tile sólido ${map.grid[y][x]} (${x},${y})`);
  }

  for (const ev of map.events) {
    if (ev.x < 0 || ev.y < 0 || ev.x >= map.w || ev.y >= map.h) {
      err(`${id}: evento ${ev.type} fuera de límites (${ev.x},${ev.y})`);
      continue;
    }
    if (ev.type === 'npc' || ev.type === 'boss') {
      if (isSolid(map.grid[ev.y][ev.x])) err(`${id}: NPC ${ev.id} sobre tile sólido (${ev.x},${ev.y})`);
      if (ev.type === 'boss') {
        for (const e of ev.battle?.enemies || []) {
          if (!ENEMIES[e.id]) err(`${id}: jefe con enemigo desconocido '${e.id}'`);
        }
      }
    }
    if (ev.type === 'chest' && !ITEMS[ev.item]) err(`${id}: cofre con objeto desconocido '${ev.item}'`);
    if (ev.type === 'door' && ev.to) {
      const target = MAPS[ev.to];
      if (!target) err(`${id}: puerta a mapa inexistente '${ev.to}'`);
      else if (isSolid(target.grid[ev.ty][ev.tx])) {
        err(`${id}: puerta a casilla sólida en ${ev.to} (${ev.tx},${ev.ty})`);
      }
    }
    if (ev.type === 'trigger' && !ev.script) warn(`${id}: trigger sin guion (${ev.x},${ev.y})`);
    if (ev.script) {
      for (const flags of [{}, { lyraJoined: true, bramJoined: true, nyxJoined: true, questStarted: true, caballeroDefeated: true, vaelorDefeated: true }]) {
        let cmds;
        try {
          cmds = typeof ev.script === 'function' ? ev.script(stubG(flags)) : ev.script;
        } catch (e) {
          err(`${id}: guion de ${ev.type} ${ev.id || ''} lanza: ${e.message}`);
          continue;
        }
        walkCommands(cmds, id, `${ev.type}:${ev.id || `${ev.x},${ev.y}`}`, flags);
      }
    }
    if (ev.flag) knownFlags.add(ev.flag);
  }

  if (map.encounters) {
    for (const g of map.encounters.groups) {
      for (const e of g.enemies) {
        if (!ENEMIES[e.id]) err(`${id}: encuentro con enemigo desconocido '${e.id}'`);
      }
    }
    if (!(map.encounters.steps[0] > 0 && map.encounters.steps[1] >= map.encounters.steps[0])) {
      err(`${id}: rango de pasos de encuentro inválido`);
    }
  }
}

// ---- Personajes y objetos ----
for (const [id, c] of Object.entries(CHARACTERS)) {
  for (const spell of c.learn) {
    if (!SPELLS[spell.spell]) err(`personaje ${id}: magia desconocida '${spell.spell}'`);
  }
  const member = createMember(id, 1);
  for (const slot of ['weapon', 'armor']) {
    const item = ITEMS[member[slot]];
    if (!item) err(`personaje ${id}: ${slot} inicial inexistente '${member[slot]}'`);
    else if (!canEquip(member, member[slot])) err(`personaje ${id}: no puede equipar ${member[slot]}`);
  }
  const s = statsOf(member);
  for (const [k, v] of Object.entries(s)) {
    if (!Number.isFinite(v) || v <= 0) err(`personaje ${id}: estadística inválida ${k}=${v}`);
  }
}

for (const [id, item] of Object.entries(ITEMS)) {
  if (item.who) for (const w of item.who) if (!CHARACTERS[w]) err(`objeto ${id}: personaje '${w}' inexistente`);
  if (item.price === undefined) warn(`objeto ${id}: sin precio`);
}

for (const [shopId, shop] of Object.entries(SHOP_STOCK)) {
  for (const id of shop.goods) if (!ITEMS[id]) err(`tienda ${shopId}: objeto desconocido '${id}'`);
}

for (const [id, e] of Object.entries(ENEMIES)) {
  if (!e.sprite) err(`enemigo ${id}: sin sprite`);
  for (const a of e.actions) {
    if (a.type === 'spell' && !SPELLS[a.id]) err(`enemigo ${id}: magia desconocida '${a.id}'`);
  }
  if (e.phase2) {
    for (const a of e.phase2.actions) {
      if (a.type === 'spell' && !SPELLS[a.id]) err(`enemigo ${id} fase2: magia desconocida '${a.id}'`);
    }
  }
  for (const d of e.drops || []) if (!ITEMS[d.item]) err(`enemigo ${id}: botín desconocido '${d.item}'`);
}

// ---- Accesibilidad: BFS desde el spawn ----
for (const [id, map] of Object.entries(MAPS)) {
  const blocked = new Set();
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (isSolid(map.grid[y][x])) blocked.add(`${x},${y}`);
    }
  }
  const props = new Set();
  for (const ev of map.events) {
    if (['npc', 'boss', 'chest', 'sign', 'object', 'savepoint'].includes(ev.type)) {
      props.add(`${ev.x},${ev.y}`);
    }
  }
  const start = map.spawn || { x: 1, y: 1 };
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [[start.x, start.y]];
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
      if (blocked.has(key) || props.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  for (const ev of map.events) {
    if (!['npc', 'boss', 'chest', 'sign', 'object', 'savepoint', 'door'].includes(ev.type)) continue;
    const neighbors = [[ev.x + 1, ev.y], [ev.x - 1, ev.y], [ev.x, ev.y + 1], [ev.x, ev.y - 1]];
    const reachable = neighbors.some(([nx, ny]) => seen.has(`${nx},${ny}`));
    if (!reachable) {
      err(`${id}: ${ev.type} '${ev.id || ev.x + ',' + ev.y}' no es accesible desde el spawn`);
    }
  }
}

// ---- Resultado ----
for (const w of warnings) console.log('  aviso:', w);
if (errors.length) {
  console.error(`\n${errors.length} errores de validación:`);
  for (const e of errors) console.error('  ✗', e);
  process.exit(1);
}
console.log(`Validación OK: ${Object.keys(MAPS).length} mapas, ${Object.keys(ENEMIES).length} enemigos, ${Object.keys(ITEMS).length} objetos, ${Object.keys(SPELLS).length} magias.`);
