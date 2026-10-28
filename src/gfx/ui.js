// Interfaz estilo Final Fantasy de SNES: ventanas azul profundo, cursor dorado,
// barras de estado y elementos auxiliares.

import { C } from '../core/const.js';
import { drawText, textWidth } from './font.js';

/**
 * Ventana clásica con borde claro y relleno en degradado azul.
 */
export function drawWindow(ctx, x, y, w, h, opts = {}) {
  const {
    alpha = 0.94,
    border = '#f2f4ff',
    top = '#28346e',
    bottom = '#0d1430',
    shadow = true,
    inner = true,
  } = opts;

  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);

  ctx.save();
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 2, y + 3, w, h);
  }

  // Borde exterior
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, h);

  // Relleno con degradado
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, '#182250');
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  if (inner) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#060a18';
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
    ctx.fillRect(x + 2, y + 2, 1, h - 4);
    ctx.fillStyle = '#7f8fd8';
    ctx.fillRect(x + 3, y + h - 3, w - 6, 1);
    ctx.fillRect(x + w - 3, y + 3, 1, h - 6);
  }
  ctx.restore();
}

// Ventana de diálogo con borde ornamentado
export function drawDialogWindow(ctx, x, y, w, h) {
  drawWindow(ctx, x, y, w, h, { top: '#1d2a5e', bottom: '#0a1028' });
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#8fa2ff';
  for (const [cx, cy, dx, dy] of [
    [x + 4, y + 4, 1, 1], [x + w - 5, y + 4, -1, 1],
    [x + 4, y + h - 5, 1, -1], [x + w - 5, y + h - 5, -1, -1],
  ]) {
    ctx.fillRect(cx, cy, 2 * dx, 1);
    ctx.fillRect(cx, cy, 1, 2 * dy);
  }
  ctx.restore();
}

export function drawTextShadow(ctx, text, x, y, color = '#ffffff', align = 'left') {
  drawText(ctx, text, x, y, { color: '#000000', align, shadow: null });
  drawText(ctx, text, x, y, { color, align });
}

// Cursor dorado con leve flotación
export function drawCursor(ctx, x, y, t = 0, color = '#f4d58d') {
  const bob = Math.round(Math.sin(t * 6) * 1);
  const px = Math.round(x);
  const py = Math.round(y) + bob;
  ctx.fillStyle = '#1a1208';
  ctx.beginPath();
  ctx.moveTo(px, py - 1);
  ctx.lineTo(px + 7, py + 3);
  ctx.lineTo(px, py + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 1, py + 1);
  ctx.lineTo(px + 5, py + 3);
  ctx.lineTo(px + 1, py + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(px + 1, py + 2, 2, 1);
}

// Lista vertical con cursor y elementos deshabilitados
export function drawList(ctx, items, index, x, y, opts = {}) {
  const {
    lineHeight = 12,
    width = 100,
    color = '#ffffff',
    disabled = () => false,
    right = null,
    maxVisible = Infinity,
    scroll = 0,
  } = opts;
  const start = Math.max(0, Math.min(scroll, items.length - maxVisible));
  const end = Math.min(items.length, start + maxVisible);
  for (let i = start; i < end; i++) {
    const iy = y + (i - start) * lineHeight;
    const off = disabled(items[i], i);
    if (i === index) drawCursor(ctx, x - 9, iy - 1, performance.now() / 1000);
    drawText(ctx, items[i], x, iy, { color: off ? '#6a7194' : color });
    if (right) {
      const txt = right(items[i], i);
      if (txt) drawText(ctx, txt, x + width, iy, { color: off ? '#6a7194' : '#c8d0ee', align: 'right' });
    }
  }
  return { start, end };
}

// Barra de PV/PM con etiqueta
export function drawStatBar(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = '#05070f';
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = '#2a3358';
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  const fw = Math.round((w - 2) * Math.max(0, Math.min(1, ratio)));
  if (fw > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fw, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + 1, y + 1, fw, 1);
  }
}

export function hpColor(ratio) {
  if (ratio > 0.5) return '#5ee06a';
  if (ratio > 0.22) return '#f4d58d';
  return '#e8455e';
}

// Sombra de texto simple (una pasada) para títulos
export function label(ctx, text, x, y, color = C.white, align = 'left') {
  drawText(ctx, text, x + 1, y + 1, { color: '#000000', align });
  drawText(ctx, text, x, y, { color, align });
}

export function centerLabel(ctx, text, cx, y, color = C.white) {
  label(ctx, text, cx, y, color, 'center');
}

export { drawText, textWidth };
