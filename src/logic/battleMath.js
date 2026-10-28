// Fórmulas de combate puras (sin DOM) para poder probarlas en Node.

export const STAT_KEYS = ['atk', 'def', 'mag', 'mdef', 'spd'];

export function effectiveStat(unit, stat) {
  let value = unit[stat] || 0;
  const buff = unit.buffs && unit.buffs[stat];
  if (buff && buff.turns > 0) value *= buff.mult;
  return value;
}

export function physicalDamage(attacker, defender, opts = {}) {
  const atk = effectiveStat(attacker, 'atk');
  const def = effectiveStat(defender, 'def');
  let base = atk * 1.55 - def * 0.8;
  if (opts.mult) base *= opts.mult;
  if (defender.defending) base *= 0.5;
  base *= 0.9 + Math.random() * 0.2;
  let dmg = Math.max(1, Math.round(base));
  const crit = Math.random() < (opts.critChance ?? 0.06);
  if (crit) dmg = Math.round(dmg * 1.8);
  return { dmg, crit };
}

export function magicDamage(spell, caster, target) {
  const power = spell.power || 0;
  const mag = effectiveStat(caster, 'mag');
  const mdef = effectiveStat(target, 'mdef');
  let base = power * 1.2 + mag * 1.3 - mdef * 0.9;
  if (spell.element && target.weak && target.weak.includes(spell.element)) base *= 1.55;
  if (spell.element && target.resist && target.resist.includes(spell.element)) base *= 0.55;
  if (target.defending) base *= 0.6;
  base *= 0.92 + Math.random() * 0.16;
  return { dmg: Math.max(1, Math.round(base)) };
}

export function healAmount(spell, caster) {
  if (spell.healAll) return Infinity;
  const mag = effectiveStat(caster, 'mag');
  return Math.max(1, Math.round((spell.power || 0) * 1.1 + mag * 1.3));
}

export function fleeChance(party, enemies) {
  const p = party.reduce((s, u) => s + effectiveStat(u, 'spd'), 0) / Math.max(1, party.length);
  const e = enemies.reduce((s, u) => s + effectiveStat(u, 'spd'), 0) / Math.max(1, enemies.length);
  return Math.max(0.2, Math.min(0.9, 0.5 + (p - e) * 0.025));
}

export function turnRate(unit) {
  // velocidad del medidor ATB por segundo
  return 0.22 + effectiveStat(unit, 'spd') * 0.018;
}

// Aplica daño a una unidad; devuelve true si muere.
export function applyDamage(unit, dmg) {
  const real = Math.max(0, Math.min(unit.hp, Math.round(dmg)));
  unit.hp -= real;
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.alive = false;
  }
  return unit.hp <= 0;
}

export function applyHeal(unit, amount) {
  if (!unit.alive) return 0;
  const max = unit.maxhp;
  const real = Math.max(0, Math.min(max - unit.hp, Math.round(amount)));
  unit.hp += real;
  return real;
}

export function tickBuffs(unit) {
  if (!unit.buffs) return;
  for (const key of Object.keys(unit.buffs)) {
    unit.buffs[key].turns -= 1;
    if (unit.buffs[key].turns <= 0) delete unit.buffs[key];
  }
}

export function poisonDamage(unit) {
  return Math.max(1, Math.round(unit.maxhp * 0.06));
}

export function expFor(enemies) {
  return enemies.reduce((s, e) => s + (e.exp || 0), 0);
}

export function gilFor(enemies) {
  return enemies.reduce((s, e) => s + (e.gil || 0), 0);
}

export function pickWeighted(actions, rng = Math.random) {
  const total = actions.reduce((s, a) => s + (a.w || 1), 0);
  let roll = rng() * total;
  for (const a of actions) {
    roll -= a.w || 1;
    if (roll <= 0) return a;
  }
  return actions[actions.length - 1];
}
