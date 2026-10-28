// Personajes jugables: estadísticas base, crecimiento, equipo y magias aprendidas.

import { ITEMS } from './items.js';

export const CHARACTERS = {
  kael: {
    id: 'kael',
    name: 'Kael',
    job: 'Caballero de la Aurora',
    level: 1,
    base: { hp: 68, mp: 12, atk: 12, def: 11, mag: 6, mdef: 7, spd: 10 },
    growth: { hp: 11, mp: 3, atk: 2.2, def: 1.6, mag: 0.9, mdef: 1.0, spd: 1.0 },
    weapon: 'espada_oxidada',
    armor: 'tunica_viajero',
    colors: { hair: '#6b4423', skin: '#f0c8a0', cloth: '#3f6fd8', trim: '#d8e4ff', boots: '#26263f' },
    learn: [
      { lvl: 1, spell: 'golpe_luz' },
      { lvl: 5, spell: 'escudo' },
      { lvl: 8, spell: 'tajo_aurora' },
      { lvl: 12, spell: 'celu_luz' },
    ],
    bio: 'El hijo del herrero de Vallebruma. Soñaba con ser caballero; el cristal lo eligió antes de que supiera qué significaba.',
  },
  lyra: {
    id: 'lyra',
    name: 'Lyra',
    job: 'Sacerdotisa',
    level: 1,
    base: { hp: 48, mp: 32, atk: 7, def: 7, mag: 15, mdef: 14, spd: 9 },
    growth: { hp: 7, mp: 6, atk: 0.8, def: 1.1, mag: 2.6, mdef: 1.9, spd: 0.9 },
    weapon: 'baston_viejo',
    armor: 'tunica_viajero',
    colors: { hair: '#e8d070', skin: '#f7d6b4', cloth: '#e8eef8', trim: '#7fb4ff', boots: '#4a3a5a' },
    learn: [
      { lvl: 1, spell: 'cura' },
      { lvl: 1, spell: 'pura' },
      { lvl: 4, spell: 'escudo' },
      { lvl: 6, spell: 'cura_mayor' },
      { lvl: 8, spell: 'resucitar' },
      { lvl: 10, spell: 'muro' },
      { lvl: 12, spell: 'ultra' },
    ],
    bio: 'Criada en el templo de la aurora. Escucha al cristal susurrar desde niña, aunque nunca se lo ha contado a nadie.',
  },
  bram: {
    id: 'bram',
    name: 'Bram',
    job: 'Guerrero errante',
    level: 1,
    base: { hp: 96, mp: 8, atk: 17, def: 15, mag: 3, mdef: 5, spd: 6 },
    growth: { hp: 15, mp: 2, atk: 2.9, def: 2.2, mag: 0.4, mdef: 0.7, spd: 0.6 },
    weapon: 'hacha_oxidada',
    armor: 'tunica_viajero',
    colors: { hair: '#3a2a1e', skin: '#d8a878', cloth: '#8a3a2a', trim: '#c8a050', boots: '#3a2418' },
    learn: [
      { lvl: 1, spell: 'golpe_pesado' },
      { lvl: 4, spell: 'grito_guerra' },
      { lvl: 7, spell: 'fuerza' },
      { lvl: 10, spell: 'terremoto' },
      { lvl: 13, spell: 'carga' },
    ],
    bio: 'Ex soldado del reino, ahora borracho y bravucón. Bajo el mal genio sigue habiendo un hombre que no soporta las injusticias.',
  },
  nyx: {
    id: 'nyx',
    name: 'Nyx',
    job: 'Ladrona de sombras',
    level: 1,
    base: { hp: 56, mp: 20, atk: 11, def: 8, mag: 10, mdef: 9, spd: 15 },
    growth: { hp: 8, mp: 4, atk: 1.8, def: 1.1, mag: 1.5, mdef: 1.2, spd: 1.8 },
    weapon: 'dagas',
    armor: 'tunica_viajero',
    colors: { hair: '#7a4a9a', skin: '#e8c0a0', cloth: '#26263f', trim: '#a97bff', boots: '#1a1a28' },
    learn: [
      { lvl: 1, spell: 'hielo' },
      { lvl: 3, spell: 'prisa' },
      { lvl: 6, spell: 'drenar' },
      { lvl: 9, spell: 'ventisca' },
      { lvl: 12, spell: 'sombra' },
    ],
    bio: 'Ladrona de los callejones de Puerto Bruma. Roba por hambre, no por codicia; huye de todo menos de una buena pelea.',
  },
};

export const PARTY_ORDER = ['kael', 'lyra', 'bram', 'nyx'];

export function expForLevel(lvl) {
  if (lvl <= 1) return 0;
  return Math.floor(24 * Math.pow(lvl - 1, 1.7));
}

export function levelFromExp(exp) {
  let lvl = 1;
  while (lvl < 50 && exp >= expForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function createMember(id, level = 1) {
  const c = CHARACTERS[id];
  const member = {
    id,
    name: c.name,
    lvl: level,
    exp: expForLevel(level),
    hp: 1,
    mp: 1,
    weapon: c.weapon,
    armor: c.armor,
  };
  const s = statsOf(member);
  member.hp = s.maxhp;
  member.mp = s.maxmp;
  return member;
}

// Estadísticas finales con nivel + equipo.
export function statsOf(member) {
  const c = CHARACTERS[member.id];
  const lvl = member.lvl || 1;
  const out = {
    maxhp: Math.round(c.base.hp + c.growth.hp * (lvl - 1)),
    maxmp: Math.round(c.base.mp + c.growth.mp * (lvl - 1)),
    atk: Math.round(c.base.atk + c.growth.atk * (lvl - 1)),
    def: Math.round(c.base.def + c.growth.def * (lvl - 1)),
    mag: Math.round(c.base.mag + c.growth.mag * (lvl - 1)),
    mdef: Math.round(c.base.mdef + c.growth.mdef * (lvl - 1)),
    spd: Math.round(c.base.spd + c.growth.spd * (lvl - 1)),
  };
  for (const slot of ['weapon', 'armor']) {
    const item = ITEMS[member[slot]];
    if (!item) continue;
    for (const key of ['atk', 'def', 'mag', 'mdef', 'spd', 'maxhp', 'maxmp']) {
      if (item[key]) out[key] += item[key];
    }
  }
  return out;
}

export function learnedSpells(member) {
  const c = CHARACTERS[member.id];
  return c.learn.filter((l) => l.lvl <= member.lvl).map((l) => l.spell);
}

export function nextSpell(member) {
  const c = CHARACTERS[member.id];
  return c.learn.find((l) => l.lvl > member.lvl) || null;
}

// Aplica experiencia y devuelve los niveles ganados.
export function grantExp(member, amount) {
  const before = member.lvl;
  const oldMax = statsOf(member);
  member.exp += amount;
  const after = levelFromExp(member.exp);
  const gained = [];
  while (member.lvl < after) {
    member.lvl++;
    gained.push(member.lvl);
  }
  if (gained.length) {
    const newMax = statsOf(member);
    // Al subir de nivel, el personaje gana los PV/PM del nuevo máximo.
    member.hp = Math.min(newMax.maxhp, member.hp + (newMax.maxhp - oldMax.maxhp));
    member.mp = Math.min(newMax.maxmp, member.mp + (newMax.maxmp - oldMax.maxmp));
  }
  return { levels: gained, from: before, to: member.lvl };
}

export function fullHeal(member) {
  const s = statsOf(member);
  member.hp = s.maxhp;
  member.mp = s.maxmp;
}

export function canEquip(member, itemId) {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) return false;
  return !item.who || item.who.includes(member.id);
}
