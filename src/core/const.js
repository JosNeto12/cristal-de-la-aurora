// Constantes globales del juego. Resolución interna tipo consola de 16 bits.
export const W = 320;
export const H = 240;
export const TILE = 16;
export const VIEW_W = W / TILE;   // 20
export const VIEW_H = H / TILE;   // 15
export const FONT_H = 8;
export const FONT_LINE = 10;

// Paleta general (hex directos, estilo SNES)
export const C = {
  black: '#000000',
  ink: '#0a0a18',
  night: '#101430',
  white: '#ffffff',
  cream: '#fdf6e3',
  gold: '#f4d58d',
  goldDark: '#a9822f',
  gray: '#8b93b8',
  grayDark: '#3b4266',
  grayLight: '#c8d0ee',
  red: '#e8455e',
  redDark: '#8c1c33',
  green: '#56d364',
  greenDark: '#1f7a3a',
  blue: '#5b8cff',
  blueDark: '#23357a',
  cyan: '#7fe3ff',
  purple: '#a97bff',
  orange: '#ffa447',
  brown: '#8a5a34',
  shadow: 'rgba(0,0,0,0.55)',
};

// Direcciones de 4 sentidos
export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Colores de texto de daño / mensajes
export const DMG_COLORS = {
  physical: C.white,
  magic: C.cyan,
  heal: C.green,
  crit: C.gold,
  miss: C.gray,
  status: C.purple,
};
