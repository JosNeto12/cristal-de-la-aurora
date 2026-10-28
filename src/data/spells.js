// Magias y habilidades. Todo el combate se apoya en estas definiciones.

export const SPELLS = {
  // --- Magia negra elemental ---
  fuego: {
    name: 'Fuego', mp: 5, kind: 'magic', element: 'fire', power: 16, target: 'oneEnemy',
    color: '#ff8a3d', anim: 'fire', desc: 'Una llamarada consume a un enemigo.',
  },
  hielo: {
    name: 'Hielo', mp: 5, kind: 'magic', element: 'ice', power: 16, target: 'oneEnemy',
    color: '#7fe3ff', anim: 'ice', desc: 'Estalactitas de hielo perforan a un enemigo.',
  },
  rayo: {
    name: 'Rayo', mp: 5, kind: 'magic', element: 'thunder', power: 16, target: 'oneEnemy',
    color: '#ffe066', anim: 'thunder', desc: 'Un relámpago cae sobre un enemigo.',
  },
  pira: {
    name: 'Pira', mp: 12, kind: 'magic', element: 'fire', power: 42, target: 'oneEnemy',
    color: '#ff6a2a', anim: 'fire', desc: 'Una explosión ígnea de gran potencia.',
  },
  ventisca: {
    name: 'Ventisca', mp: 12, kind: 'magic', element: 'ice', power: 42, target: 'oneEnemy',
    color: '#a8f0ff', anim: 'ice', desc: 'Una tormenta de hielo desgarra al enemigo.',
  },
  tormenta: {
    name: 'Tormenta', mp: 12, kind: 'magic', element: 'thunder', power: 42, target: 'oneEnemy',
    color: '#fff07a', anim: 'thunder', desc: 'Una descarga eléctrica devastadora.',
  },
  celu_luz: {
    name: 'Celeste', mp: 18, kind: 'magic', element: 'holy', power: 58, target: 'allEnemies',
    color: '#ffe9a8', anim: 'holy', desc: 'Luz sagrada golpea a todos los enemigos.',
  },
  sombra: {
    name: 'Sombra', mp: 14, kind: 'magic', element: 'dark', power: 50, target: 'oneEnemy',
    color: '#b18cff', anim: 'dark', desc: 'Una garra de oscuridad desgarra el alma.',
  },
  terremoto: {
    name: 'Terremoto', mp: 16, kind: 'magic', element: 'earth', power: 46, target: 'allEnemies',
    color: '#d8a06a', anim: 'earth', desc: 'La tierra tiembla bajo los enemigos.',
  },

  // --- Magia blanca ---
  cura: {
    name: 'Cura', mp: 5, kind: 'heal', power: 34, target: 'ally',
    color: '#7dffa0', anim: 'heal', desc: 'Restaura PV de un aliado.',
  },
  cura_mayor: {
    name: 'Cura+', mp: 12, kind: 'heal', power: 96, target: 'ally',
    color: '#7dffa0', anim: 'heal', desc: 'Restaura una gran cantidad de PV.',
  },
  ultra: {
    name: 'Ultra', mp: 26, kind: 'heal', power: 0, healAll: true, target: 'allAllies',
    color: '#d8ffe8', anim: 'heal', desc: 'Restaura todos los PV de todo el grupo.',
  },
  pura: {
    name: 'Pura', mp: 4, kind: 'cure', status: 'poison', target: 'ally',
    color: '#b8ffcf', anim: 'heal', desc: 'Elimina el veneno de un aliado.',
  },
  resucitar: {
    name: 'Resucitar', mp: 18, kind: 'revive', power: 0.5, target: 'deadAlly',
    color: '#fff3c4', anim: 'holy', desc: 'Devuelve a la vida a un aliado caído.',
  },
  escudo: {
    name: 'Escudo', mp: 6, kind: 'buff', buff: 'def', mult: 1.7, turns: 5, target: 'ally',
    color: '#9fc4ff', anim: 'buff', desc: 'Aumenta la defensa de un aliado.',
  },
  muro: {
    name: 'Muro', mp: 6, kind: 'buff', buff: 'mdef', mult: 1.7, turns: 5, target: 'ally',
    color: '#c3a8ff', anim: 'buff', desc: 'Aumenta la defensa mágica de un aliado.',
  },
  prisa: {
    name: 'Prisa', mp: 8, kind: 'buff', buff: 'spd', mult: 1.8, turns: 5, target: 'ally',
    color: '#ffe066', anim: 'buff', desc: 'Acelera el turno de un aliado.',
  },
  fuerza: {
    name: 'Fuerza', mp: 8, kind: 'buff', buff: 'atk', mult: 1.6, turns: 5, target: 'ally',
    color: '#ff9c7a', anim: 'buff', desc: 'Aumenta el ataque de un aliado.',
  },
  drenar: {
    name: 'Drenar', mp: 10, kind: 'drain', element: 'dark', power: 30, target: 'oneEnemy',
    color: '#c48cff', anim: 'dark', desc: 'Roba PV del enemigo para curarte.',
  },

  // --- Habilidades físicas ---
  golpe_luz: {
    name: 'Golpe de Luz', mp: 4, kind: 'physical', element: 'holy', mult: 1.7, target: 'oneEnemy',
    color: '#ffe9a8', anim: 'slash', desc: 'Un tajo imbuido de luz sagrada.',
  },
  tajo_aurora: {
    name: 'Tajo Aurora', mp: 12, kind: 'physical', element: 'holy', mult: 2.6, target: 'oneEnemy',
    color: '#fff3b0', anim: 'slash', desc: 'El filo de la aurora corta la oscuridad.',
  },
  golpe_pesado: {
    name: 'Golpe Pesado', mp: 5, kind: 'physical', mult: 1.9, target: 'oneEnemy',
    color: '#ffb37a', anim: 'slash', desc: 'Un golpe brutal que rompe defensas.',
  },
  grito_guerra: {
    name: 'Grito de Guerra', mp: 7, kind: 'buff', buff: 'atk', mult: 1.5, turns: 6, target: 'allAllies',
    color: '#ff9c7a', anim: 'buff', desc: 'Aumenta el ataque de todo el grupo.',
  },
  carga: {
    name: 'Carga', mp: 9, kind: 'physical', mult: 2.2, target: 'oneEnemy',
    color: '#ffb37a', anim: 'slash', desc: 'Embestida con todo el peso del cuerpo.',
  },
};

export const ELEMENTS = {
  fire: { name: 'Fuego', color: '#ff8a3d' },
  ice: { name: 'Hielo', color: '#7fe3ff' },
  thunder: { name: 'Rayo', color: '#ffe066' },
  holy: { name: 'Luz', color: '#fff3b0' },
  dark: { name: 'Oscuridad', color: '#b18cff' },
  earth: { name: 'Tierra', color: '#d8a06a' },
};
