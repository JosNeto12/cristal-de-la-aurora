// Enemigos: estadísticas, debilidades, botín e inteligencia artificial.

export const ENEMIES = {
  limo: {
    name: 'Limo', sprite: 'limo', hp: 30, atk: 10, def: 4, mag: 2, mdef: 3, spd: 5,
    exp: 8, gil: 9, weak: ['fire'], resist: ['ice'],
    drops: [{ item: 'pocion', p: 0.22 }],
    actions: [{ type: 'attack', w: 100 }],
    desc: 'Una gelatina verde que brota en los caminos húmedos.',
  },
  murcielago: {
    name: 'Murciélago', sprite: 'murcielago', hp: 26, atk: 12, def: 4, mag: 0, mdef: 4, spd: 14,
    exp: 9, gil: 8, weak: ['thunder'], resist: [],
    drops: [{ item: 'antidoto', p: 0.15 }],
    actions: [{ type: 'attack', w: 80 }, { type: 'attack', w: 20, power: 1.3 }],
    desc: 'Criatura de las cuevas. Ataca en silencio y en picado.',
  },
  goblin: {
    name: 'Goblin', sprite: 'goblin', hp: 48, atk: 15, def: 7, mag: 0, mdef: 5, spd: 8,
    exp: 14, gil: 15, weak: ['fire'], resist: [],
    drops: [{ item: 'pocion', p: 0.2 }],
    actions: [{ type: 'attack', w: 85 }, { type: 'attack', w: 15, power: 1.4 }],
    desc: 'Saqueador de las llanuras. Cobarde cuando está solo.',
  },
  lobo: {
    name: 'Lobo sombrío', sprite: 'lobo', hp: 64, atk: 18, def: 8, mag: 0, mdef: 6, spd: 13,
    exp: 20, gil: 18, weak: ['holy'], resist: ['dark'],
    drops: [{ item: 'pocion_mayor', p: 0.12 }],
    actions: [{ type: 'attack', w: 75 }, { type: 'buff', buff: 'atk', mult: 1.4, turns: 3, w: 25 }],
    desc: 'Un lobo de pelaje negro y ojos de brasa. La oscuridad lo cría.',
  },
  esqueleto: {
    name: 'Esqueleto', sprite: 'esqueleto', hp: 92, atk: 22, def: 12, mag: 6, mdef: 8, spd: 7,
    exp: 26, gil: 22, weak: ['holy'], resist: ['dark', 'ice'],
    drops: [{ item: 'antidoto', p: 0.2 }, { item: 'eter', p: 0.08 }],
    actions: [{ type: 'attack', w: 85 }, { type: 'spell', id: 'hielo', w: 15 }],
    desc: 'Restos de un soldado que nunca abandonó su puesto.',
  },
  espectro: {
    name: 'Espectro', sprite: 'espectro', hp: 86, atk: 14, def: 6, mag: 26, mdef: 16, spd: 11,
    exp: 30, gil: 26, weak: ['holy'], resist: ['dark', 'fire'],
    drops: [{ item: 'eter', p: 0.18 }],
    actions: [
      { type: 'spell', id: 'hielo', w: 45 },
      { type: 'spell', id: 'drenar', w: 25 },
      { type: 'attack', w: 30, poison: true },
    ],
    desc: 'Un lamento con forma. Su tacto hiela la sangre.',
  },
  golem: {
    name: 'Gólem de piedra', sprite: 'golem', hp: 300, atk: 30, def: 26, mag: 0, mdef: 10, spd: 5,
    exp: 55, gil: 60, weak: ['thunder'], resist: ['fire', 'ice'],
    drops: [{ item: 'pocion_mayor', p: 0.3 }],
    actions: [{ type: 'attack', w: 80 }, { type: 'attack', w: 20, power: 1.6 }],
    desc: 'Piedra que camina. La magia apenas le hace cosquillas.',
  },
  caballero_negro: {
    name: 'Caballero Negro', sprite: 'caballero', hp: 950, atk: 46, def: 20, mag: 26, mdef: 14, spd: 12,
    exp: 220, gil: 300, weak: ['holy'], resist: ['dark'],
    drops: [{ item: 'pocion_mayor', p: 1.0 }],
    boss: true,
    actions: [
      { type: 'attack', w: 60 },
      { type: 'spell', id: 'rayo', w: 22 },
      { type: 'spell', id: 'terremoto', w: 18 },
      { type: 'buff', buff: 'def', mult: 1.5, turns: 4, w: 15 },
    ],
    intro: 'Una armadura vacía se alza entre tú y el sello. El metal chirría: «Nadie pasa. Orden del Emperador.»',
    desc: 'Guardián del santuario, atado a su juramento más allá de la muerte.',
  },
  vaelor: {
    name: 'Emperador Vaelor', sprite: 'vaelor', hp: 2000, atk: 52, def: 24, mag: 48, mdef: 24, spd: 16,
    exp: 900, gil: 1800, weak: ['holy'], resist: ['dark'],
    boss: true, final: true,
    drops: [],
    actions: [
      { type: 'attack', w: 45 },
      { type: 'spell', id: 'sombra', w: 25 },
      { type: 'spell', id: 'pira', w: 20 },
      { type: 'spell', id: 'drenar', w: 10 },
    ],
    phase2: {
      at: 0.5,
      healTo: 0.55,
      atk: 64, mag: 58, spd: 20,
      message: 'Vaelor arranca el último fragmento del cristal. La oscuridad se derrama como tinta.',
      actions: [
        { type: 'attack', w: 35 },
        { type: 'spell', id: 'tormenta', w: 20 },
        { type: 'spell', id: 'terremoto', w: 18 },
        { type: 'spell', id: 'sombra', w: 22 },
        { type: 'spell', id: 'drenar', w: 15 },
      ],
    },
    intro: 'El Emperador sostiene el Cristal de la Aurora contra la luz. «Viniste hasta aquí por un pedazo de piedra. Qué tierno.»',
    desc: 'El hombre que quiso apagar la aurora para no volver a ver el amanecer.',
  },
};

// Grupo de encuentro: [{id, n}]
export function buildEnemies(groups, levelBonus = 0) {
  const list = [];
  for (const g of groups) {
    const base = ENEMIES[g.id];
    if (!base) continue;
    for (let i = 0; i < (g.n || 1); i++) {
      list.push({
        ...base,
        id: g.id,
        maxhp: base.hp + levelBonus * 4,
        hp: base.hp + levelBonus * 4,
        atk: base.atk + levelBonus,
        def: base.def + Math.floor(levelBonus * 0.6),
        mag: base.mag + levelBonus,
        mdef: base.mdef + Math.floor(levelBonus * 0.5),
        spd: base.spd,
        index: list.length,
        alive: true,
      });
    }
  }
  return list;
}
