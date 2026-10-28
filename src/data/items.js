// Objetos: consumibles, armas, armaduras y objetos clave.

export const ITEMS = {
  // ---------- Consumibles ----------
  pocion: {
    name: 'Poción', kind: 'consumable', price: 50, heal: 60,
    desc: 'Restaura 60 PV a un aliado.', color: '#7dffa0',
  },
  pocion_mayor: {
    name: 'Poción+', kind: 'consumable', price: 180, heal: 220,
    desc: 'Restaura 220 PV a un aliado.', color: '#7dffa0',
  },
  eter: {
    name: 'Éter', kind: 'consumable', price: 200, mp: 30,
    desc: 'Restaura 30 PM a un aliado.', color: '#9fc4ff',
  },
  elixir: {
    name: 'Elixir', kind: 'consumable', price: 1200, full: true,
    desc: 'Restaura todos los PV y PM.', color: '#ffe9a8',
  },
  antidoto: {
    name: 'Antídoto', kind: 'consumable', price: 30, cure: 'poison',
    desc: 'Cura el veneno.', color: '#b8ffcf',
  },
  fenix: {
    name: 'Pluma Fénix', kind: 'consumable', price: 300, revive: 0.5,
    desc: 'Revive a un aliado caído con la mitad de sus PV.', color: '#ffb37a',
  },
  bomba: {
    name: 'Bomba', kind: 'consumable', price: 150, damage: 90, element: 'fire', targetAll: true,
    desc: 'Daña a todos los enemigos con fuego.', color: '#ff8a3d',
  },

  // ---------- Armas ----------
  espada_oxidada: {
    name: 'Espada oxidada', kind: 'weapon', slot: 'weapon', price: 0, atk: 3, who: ['kael'],
    desc: 'La vieja espada de tu padre. Aún corta.', color: '#c8d0ee',
  },
  espada_hierro: {
    name: 'Espada de hierro', kind: 'weapon', slot: 'weapon', price: 420, atk: 10, who: ['kael'],
    desc: 'Forjada en Vallebruma. Sólida y fiable.', color: '#c8d0ee',
  },
  espada_acero: {
    name: 'Espada de acero', kind: 'weapon', slot: 'weapon', price: 1200, atk: 18, who: ['kael'],
    desc: 'Acero de las minas del norte.', color: '#e2e8ff',
  },
  espada_aurora: {
    name: 'Espada Aurora', kind: 'weapon', slot: 'weapon', price: 0, atk: 28, mag: 5, who: ['kael'],
    desc: 'Late con la luz del cristal. Solo para el elegido.', color: '#ffe9a8',
  },
  baston_viejo: {
    name: 'Bastón de fresno', kind: 'weapon', slot: 'weapon', price: 0, atk: 2, mag: 4, who: ['lyra'],
    desc: 'Un bastón sencillo, gastado por el uso.', color: '#d8b98a',
  },
  baston_sagrado: {
    name: 'Bastón sagrado', kind: 'weapon', slot: 'weapon', price: 600, atk: 4, mag: 11, who: ['lyra'],
    desc: 'Bendecido en el templo de la aurora.', color: '#fff3c4',
  },
  baculo_aurora: {
    name: 'Báculo de aurora', kind: 'weapon', slot: 'weapon', price: 1600, atk: 6, mag: 20, mdef: 4, who: ['lyra'],
    desc: 'Canaliza la luz del cristal sin esfuerzo.', color: '#ffe9a8',
  },
  hacha_oxidada: {
    name: 'Hacha mellada', kind: 'weapon', slot: 'weapon', price: 0, atk: 7, who: ['bram'],
    desc: 'Pesa más de lo que parece. A Bram le da igual.', color: '#c8d0ee',
  },
  hacha_guerra: {
    name: 'Hacha de guerra', kind: 'weapon', slot: 'weapon', price: 700, atk: 18, who: ['bram'],
    desc: 'Un filo que parte escudos.', color: '#e2e8ff',
  },
  hacha_titan: {
    name: 'Hacha del titán', kind: 'weapon', slot: 'weapon', price: 1800, atk: 28, spd: -2, who: ['bram'],
    desc: 'Forjada para gigantes. Lenta, pero brutal.', color: '#ffd8a8',
  },
  dagas: {
    name: 'Dagas gemelas', kind: 'weapon', slot: 'weapon', price: 0, atk: 6, spd: 3, who: ['nyx'],
    desc: 'Ligeras, rápidas, silenciosas.', color: '#c8d0ee',
  },
  dagas_sombra: {
    name: 'Dagas de sombra', kind: 'weapon', slot: 'weapon', price: 750, atk: 15, spd: 5, who: ['nyx'],
    desc: 'Apenas reflejan la luz.', color: '#b18cff',
  },
  filo_aurora: {
    name: 'Filo de aurora', kind: 'weapon', slot: 'weapon', price: 2000, atk: 24, spd: 7, who: ['nyx'],
    desc: 'Acero bañado en luz de cristal.', color: '#ffe9a8',
  },

  // ---------- Armaduras ----------
  tunica_viajero: {
    name: 'Túnica de viajero', kind: 'armor', slot: 'armor', price: 0, def: 3, who: ['kael', 'lyra', 'bram', 'nyx'],
    desc: 'Ropa de camino, cómoda y gastada.', color: '#b8a88a',
  },
  cota_cuero: {
    name: 'Cota de cuero', kind: 'armor', slot: 'armor', price: 250, def: 6, who: ['kael', 'bram', 'nyx'],
    desc: 'Cuero endurecido. Mejor que nada.', color: '#b07a4a',
  },
  cota_malla: {
    name: 'Cota de malla', kind: 'armor', slot: 'armor', price: 700, def: 11, who: ['kael', 'bram'],
    desc: 'Anillos de hierro entrelazados.', color: '#b8c0d8',
  },
  armadura_aurora: {
    name: 'Armadura aurora', kind: 'armor', slot: 'armor', price: 2100, def: 18, mdef: 6, who: ['kael', 'bram'],
    desc: 'Brilla con luz propia. Casi no pesa.', color: '#ffe9a8',
  },
  robe_aprendiz: {
    name: 'Robe de aprendiz', kind: 'armor', slot: 'armor', price: 200, def: 3, mdef: 6, who: ['lyra', 'nyx'],
    desc: 'Tela encantada para principiantes.', color: '#9fc4ff',
  },
  robe_arcano: {
    name: 'Robe arcano', kind: 'armor', slot: 'armor', price: 800, def: 6, mdef: 13, who: ['lyra', 'nyx'],
    desc: 'Hilos de plata que repelen la magia.', color: '#c3a8ff',
  },
  capa_sombra: {
    name: 'Capa de sombra', kind: 'armor', slot: 'armor', price: 650, def: 7, spd: 3, who: ['nyx'],
    desc: 'Te vuelve difícil de ver... y de golpear.', color: '#8a7ba8',
  },

  // ---------- Objetos clave ----------
  sello_luz: {
    name: 'Sello de Luz', kind: 'key', price: 0,
    desc: 'Un fragmento del Cristal de la Aurora. Palpita con calidez.', color: '#ffe9a8',
  },
  llave_cueva: {
    name: 'Llave de piedra', kind: 'key', price: 0,
    desc: 'Abre la puerta sellada del santuario.', color: '#c8c0a8',
  },
};

export const SHOP_STOCK = {
  vallebruma: {
    name: 'Bazar de Mirna',
    goods: [
      'pocion', 'pocion_mayor', 'eter', 'antidoto', 'fenix', 'bomba',
      'espada_hierro', 'baston_sagrado', 'cota_cuero', 'robe_aprendiz',
    ],
  },
  pradera: {
    name: 'Caravana de Tobi',
    goods: [
      'pocion', 'pocion_mayor', 'eter', 'antidoto', 'fenix', 'bomba', 'elixir',
      'cota_malla', 'robe_arcano', 'capa_sombra', 'armadura_aurora',
      'espada_acero', 'hacha_guerra', 'hacha_titan', 'dagas_sombra', 'filo_aurora',
    ],
  },
};

// Precio de venta (mitad, redondeado)
export function sellPrice(id) {
  const item = ITEMS[id];
  return item ? Math.max(1, Math.floor(item.price / 2)) : 0;
}
