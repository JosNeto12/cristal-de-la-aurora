// Simulación de combates para calibrar dificultad. No usa DOM.
// Uso: node tests/battle-sim.mjs

import { ENEMIES } from '../src/data/enemies.js';
import { SPELLS } from '../src/data/spells.js';
import { createMember, statsOf, learnedSpells, grantExp } from '../src/data/characters.js';
import {
  physicalDamage, magicDamage, healAmount, applyDamage, applyHeal,
  tickBuffs, pickWeighted, effectiveStat,
} from '../src/logic/battleMath.js';

const EQUIP_SETS = [
  { minLevel: 1, gear: { kael: ['espada_oxidada', 'tunica_viajero'], lyra: ['baston_viejo', 'tunica_viajero'], bram: ['hacha_oxidada', 'tunica_viajero'], nyx: ['dagas', 'tunica_viajero'] } },
  { minLevel: 3, gear: { kael: ['espada_hierro', 'cota_cuero'], lyra: ['baston_sagrado', 'robe_aprendiz'], bram: ['hacha_guerra', 'cota_cuero'], nyx: ['dagas_sombra', 'cota_cuero'] } },
  { minLevel: 6, gear: { kael: ['espada_acero', 'cota_malla'], lyra: ['baculo_aurora', 'robe_arcano'], bram: ['hacha_guerra', 'cota_malla'], nyx: ['filo_aurora', 'capa_sombra'] } },
];

function equipFor(id, lvl) {
  let set = EQUIP_SETS[0];
  for (const s of EQUIP_SETS) if (lvl >= s.minLevel) set = s;
  return set.gear[id];
}

function makeParty(level, ids) {
  return ids.map((id) => {
    const m = createMember(id, level);
    const [weapon, armor] = equipFor(id, level);
    m.weapon = weapon;
    m.armor = armor;
    const s = statsOf(m);
    return {
      name: m.name, id: m.id, ref: m, isEnemy: false,
      hp: s.maxhp, maxhp: s.maxhp, mp: s.maxmp, maxmp: s.maxmp,
      atk: s.atk, def: s.def, mag: s.mag, mdef: s.mdef, spd: s.spd,
      buffs: {}, defending: false, alive: true,
    };
  });
}

function makeEnemies(specs, bonus = 0) {
  const out = [];
  for (const spec of specs) {
    const base = ENEMIES[spec.id];
    for (let i = 0; i < (spec.n || 1); i++) {
      out.push({
        ...base, id: spec.id, name: base.name, isEnemy: true,
        hp: base.hp + bonus * 4, maxhp: base.hp + bonus * 4,
        atk: base.atk + bonus, def: base.def + Math.floor(bonus * 0.6),
        mag: base.mag + bonus, mdef: base.mdef + Math.floor(bonus * 0.5),
        spd: base.spd, buffs: {}, alive: true, phase: 1,
      });
    }
  }
  return out;
}

function partyTurn(unit, party, enemies, items) {
  const alive = party.filter((p) => p.alive);
  const foes = enemies.filter((e) => e.alive);
  if (!foes.length) return;

  // Curandera
  if (unit.id === 'lyra') {
    const dead = party.find((p) => !p.alive);
    if (dead && unit.mp >= 18 && learnedSpells(unit.ref).includes('resucitar')) {
      unit.mp -= 18;
      dead.alive = true;
      dead.hp = Math.floor(dead.maxhp * 0.5);
      return;
    }
    const hurt = alive.filter((p) => p.hp < p.maxhp * 0.55).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
    if (hurt && unit.mp >= 5) {
      const spell = SPELLS.cura;
      unit.mp -= spell.mp;
      applyHeal(hurt, healAmount(spell, unit));
      return;
    }
  }

  // Poción de emergencia
  if (unit.hp < unit.maxhp * 0.25 && items.pocion > 0 && unit.id !== 'lyra') {
    items.pocion--;
    applyHeal(unit, 60);
    return;
  }

  // Magia elemental si el enemigo es débil
  const spells = learnedSpells(unit.ref).map((id) => SPELLS[id]).filter(Boolean);
  const attackSpell = spells.find((s) => s.kind === 'magic' && unit.mp >= s.mp
    && foes.some((f) => f.weak?.includes(s.element)));
  if (attackSpell && Math.random() < 0.7) {
    unit.mp -= attackSpell.mp;
    const target = foes.find((f) => f.weak?.includes(attackSpell.element)) || foes[0];
    const { dmg } = magicDamage(attackSpell, unit, target);
    applyDamage(target, dmg);
    return;
  }

  // Habilidad física
  const phys = spells.find((s) => s.kind === 'physical' && unit.mp >= s.mp);
  if (phys && Math.random() < 0.45) {
    unit.mp -= phys.mp;
    const target = foes[Math.floor(Math.random() * foes.length)];
    const { dmg } = physicalDamage(unit, target, { mult: phys.mult });
    applyDamage(target, dmg);
    return;
  }

  const target = foes[Math.floor(Math.random() * foes.length)];
  const { dmg } = physicalDamage(unit, target, {});
  applyDamage(target, dmg);
}

function enemyTurn(unit, party) {
  const targets = party.filter((p) => p.alive);
  if (!targets.length) return;
  if (unit.phase2 && unit.phase === 1 && unit.hp <= unit.maxhp * unit.phase2.at) {
    unit.phase = 2;
    unit.hp = Math.max(unit.hp, Math.round(unit.maxhp * unit.phase2.healTo));
    unit.atk = unit.phase2.atk ?? unit.atk;
    unit.mag = unit.phase2.mag ?? unit.mag;
    unit.actions = unit.phase2.actions;
  }
  const target = targets[Math.floor(Math.random() * targets.length)];
  const action = pickWeighted(unit.actions || [{ type: 'attack', w: 100 }]);
  if (action.type === 'attack') {
    const { dmg } = physicalDamage(unit, target, { mult: action.power || 1 });
    applyDamage(target, dmg);
  } else if (action.type === 'spell') {
    const spell = SPELLS[action.id];
    if (!spell) return;
    const victims = spell.target === 'allEnemies' ? targets : [target];
    for (const v of victims) {
      const { dmg } = magicDamage(spell, unit, v);
      applyDamage(v, dmg);
      if (spell.kind === 'drain') applyHeal(unit, Math.round(dmg * 0.5));
    }
  } else if (action.type === 'buff') {
    unit.buffs[action.buff] = { mult: action.mult, turns: action.turns || 3 };
  }
}

function simulate(level, ids, specs, bonus = 0) {
  const party = makeParty(level, ids);
  const enemies = makeEnemies(specs, bonus);
  const items = { pocion: 5 };
  let rounds = 0;

  while (rounds < 60) {
    rounds++;
    const actors = [...party, ...enemies]
      .filter((u) => u.alive)
      .map((u) => ({ u, roll: effectiveStat(u, 'spd') + Math.random() * 4 }))
      .sort((a, b) => b.roll - a.roll);

    for (const { u } of actors) {
      if (!u.alive) continue;
      if (u.isEnemy) enemyTurn(u, party);
      else partyTurn(u, party, enemies, items);
      if (party.every((p) => !p.alive)) return { win: false, rounds };
      if (enemies.every((e) => !e.alive)) return { win: true, rounds };
    }
    // buffs por turno
    for (const u of [...party, ...enemies]) if (u.alive) tickBuffs(u);
  }
  return { win: false, rounds };
}

const MATCHES = [
  { name: 'Limos x2 (nivel 1, Kael+Lyra)', level: 1, ids: ['kael', 'lyra'], specs: [{ id: 'limo', n: 2 }] },
  { name: 'Goblins x2 (nivel 2, Kael+Lyra)', level: 2, ids: ['kael', 'lyra'], specs: [{ id: 'goblin', n: 2 }] },
  { name: 'Cueva: esqueletos x2 (nivel 4)', level: 4, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'esqueleto', n: 2 }] },
  { name: 'Cueva: espectro + esqueleto (nivel 5)', level: 5, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'espectro', n: 1 }, { id: 'esqueleto', n: 1 }] },
  { name: 'Gólem (nivel 6)', level: 6, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'golem', n: 1 }] },
  { name: 'Caballero Negro (nivel 7)', level: 7, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'caballero_negro', n: 1 }] },
  { name: 'Caballero Negro (nivel 8)', level: 8, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'caballero_negro', n: 1 }] },
  { name: 'Vaelor (nivel 9)', level: 9, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'vaelor', n: 1 }] },
  { name: 'Vaelor (nivel 10)', level: 10, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'vaelor', n: 1 }] },
  { name: 'Vaelor (nivel 12)', level: 12, ids: ['kael', 'lyra', 'bram', 'nyx'], specs: [{ id: 'vaelor', n: 1 }] },
];

const RUNS = 500;
let bold = false;

for (const m of MATCHES) {
  let wins = 0;
  let totalRounds = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = simulate(m.level, m.ids, m.specs);
    if (r.win) wins++;
    totalRounds += r.rounds;
  }
  const rate = (wins / RUNS) * 100;
  const avg = (totalRounds / RUNS).toFixed(1);
  const flag = rate < 25 ? '  ⚠ demasiado difícil' : rate > 97 ? '  ⚠ demasiado fácil' : '';
  console.log(`${m.name.padEnd(42)} victorias ${rate.toFixed(1).padStart(5)}%  rondas ${avg}${flag}`);
}

// Comprobación de NaN / valores absurdos
const stats = statsOf(createMember('kael', 10));
for (const [k, v] of Object.entries(stats)) {
  if (!Number.isFinite(v) || v <= 0) {
    console.error(`Estadística inválida: ${k}=${v}`);
    process.exit(1);
  }
}
console.log('\nSimulación completada.');
