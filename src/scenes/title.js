// Pantalla de título con cristal animado, estrellas y menú.

import { G, formatPlaytime } from '../core/state.js';
import { hasSave, saveSummary, loadGame } from '../core/save.js';
import { drawText, drawWindow } from '../gfx/ui.js';
import { poly } from '../gfx/pixel.js';
import { IntroScene } from './intro.js';
import { FieldScene } from './field.js';

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 73 + 19) % 320,
  y: (i * 37 + 11) % 168,
  s: i % 7 === 0 ? 2 : 1,
  p: (i * 1.7) % 6.28,
}));

export class TitleScene {
  constructor() {
    this.time = 0;
    this.index = 0;
    this.options = ['Nueva partida', 'Continuar', 'Cómo jugar', 'Créditos'];
    this.summary = saveSummary();
    this.info = null;
    this.infoT = 0;
    this.busy = false;
    G.audio?.playMusic('title');
  }

  update(dt) {
    this.time += dt;
    const input = G.input;
    if (this.infoT > 0) {
      this.infoT -= dt;
      if (input.pressed('ok') || input.pressed('cancel')) this.infoT = 0;
      return;
    }
    if (this.busy) return;

    if (input.pressed('up')) {
      this.index = (this.index + this.options.length - 1) % this.options.length;
      G.audio?.sfx('cursor');
    }
    if (input.pressed('down')) {
      this.index = (this.index + 1) % this.options.length;
      G.audio?.sfx('cursor');
    }
    if (input.pressed('ok')) {
      G.audio?.sfx('ok');
      this.choose(this.options[this.index]);
    }
  }

  choose(option) {
    if (option === 'Nueva partida') {
      this.busy = true;
      G.fadeTo(1, () => {
        G.newGame();
        G.scenes.set(new IntroScene());
        G.fadeTo(0, null, 2.5);
      }, 2.4);
    } else if (option === 'Continuar') {
      if (!hasSave()) {
        G.audio?.sfx('deny');
        this.info = 'No hay ninguna partida guardada.';
        this.infoT = 2;
        return;
      }
      this.busy = true;
      G.fadeTo(1, () => {
        if (loadGame()) {
          G.scenes.set(new FieldScene(G.mapId, { x: G.pos.x, y: G.pos.y, dir: G.pos.dir }));
          G.fadeTo(0, null, 2.5);
        } else {
          G.scenes.set(new TitleScene());
          G.fadeTo(0, null, 2);
        }
      }, 2.4);
    } else if (option === 'Cómo jugar') {
      this.info = 'Flechas o WASD: moverte. Z/Enter: hablar y confirmar. X/Esc: menú. En combate, elige con las flechas y confirma con Z.';
      this.infoT = 6;
    } else if (option === 'Créditos') {
      this.info = 'Cristal de la Aurora — un RPG original creado para este proyecto. Código, arte y música generados desde cero.';
      this.infoT = 6;
    }
  }

  draw(ctx) {
    // Cielo nocturno
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#05060f');
    grad.addColorStop(0.55, '#0c1230');
    grad.addColorStop(1, '#171a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    // Estrellas
    for (const s of STARS) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.2 + s.p));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // Montañas lejanas
    poly(ctx, [[-20, 190], [50, 132], [120, 190]], '#0a0e20');
    poly(ctx, [[80, 190], [160, 120], [240, 190]], '#0c1128');
    poly(ctx, [[200, 190], [280, 138], [340, 190]], '#0a0e20');
    ctx.fillStyle = '#070a16';
    ctx.fillRect(0, 188, 320, 52);

    this.drawCrystal(ctx, 160, 60, this.time);

    // Título
    drawText(ctx, 'CRISTAL', 162, 96, { color: '#05040a', align: 'center', scale: 3 });
    drawText(ctx, 'CRISTAL', 160, 94, { color: '#f4d58d', align: 'center', scale: 3 });
    drawText(ctx, 'DE LA AURORA', 162, 120, { color: '#05040a', align: 'center', scale: 2 });
    drawText(ctx, 'DE LA AURORA', 160, 118, { color: '#cfe0ff', align: 'center', scale: 2 });

    // Línea decorativa
    ctx.fillStyle = 'rgba(180, 200, 255, 0.35)';
    ctx.fillRect(92, 134, 136, 1);
    ctx.fillRect(150, 133, 20, 3);

    drawText(ctx, 'UN RPG DE LA ERA SNES', 160, 146, { color: '#8fa2ff', align: 'center' });

    // Menú
    drawWindow(ctx, 62, 158, 196, 60, { alpha: 0.96 });
    const baseY = 167;
    this.options.forEach((opt, i) => {
      const y = baseY + i * 12;
      const disabled = opt === 'Continuar' && !this.summary;
      const color = disabled ? '#4a5278' : i === this.index ? '#ffe9a8' : '#dfe6ff';
      if (i === this.index) {
        const bob = Math.sin(this.time * 5) * 1;
        drawText(ctx, '▶', 96, y + bob, { color: '#f4d58d' });
      }
      drawText(ctx, opt, 160, y, { color, align: 'center' });
    });

    if (this.summary && this.index === 1) {
      const s = this.summary;
      drawText(ctx, `Nivel ${s.level} · ${formatPlaytime(s.playtime)} · ${s.gold} oro`, 160, 228, {
        color: '#8a93b8', align: 'center',
      });
    } else {
      drawText(ctx, 'Z: confirmar   ·   F: pantalla completa', 160, 228, { color: '#5f6a94', align: 'center' });
    }

    if (this.infoT > 0 && this.info) {
      drawWindow(ctx, 26, 68, 268, 94);
      drawText(ctx, 'Información', 160, 78, { color: '#f4d58d', align: 'center' });
      drawText(ctx, this.info, 160, 96, {
        color: '#dfe6ff',
        align: 'center',
        maxWidth: 246,
        wrap: true,
        lineHeight: 11,
      });
      drawText(ctx, 'Z: cerrar', 160, 148, { color: '#8a93b8', align: 'center' });
    }
  }

  drawCrystal(ctx, cx, cy, t) {
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 62);
    glow.addColorStop(0, 'rgba(180, 230, 255, 0.45)');
    glow.addColorStop(0.4, 'rgba(120, 180, 255, 0.18)');
    glow.addColorStop(1, 'rgba(80, 120, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 70, cy - 70, 140, 140);

    const bob = Math.sin(t * 1.4) * 3;
    const y = cy + bob;
    // Facetas principales
    poly(ctx, [[cx, y - 34], [cx + 17, y - 6], [cx + 11, y + 24], [cx - 11, y + 24], [cx - 17, y - 6]], '#7fd8ff');
    poly(ctx, [[cx, y - 34], [cx + 17, y - 6], [cx + 3, y - 2], [cx, y + 10]], '#d8faff');
    poly(ctx, [[cx, y - 34], [cx, y + 10], [cx - 3, y - 2], [cx - 17, y - 6]], '#a8ecff');
    poly(ctx, [[cx + 3, y - 2], [cx + 17, y - 6], [cx + 11, y + 24], [cx + 3, y + 12]], '#4aa8d8');
    poly(ctx, [[cx - 3, y - 2], [cx + 3, y + 12], [cx - 11, y + 24], [cx - 17, y - 6]], '#5cb8e0');
    poly(ctx, [[cx - 11, y + 24], [cx + 11, y + 24], [cx + 4, y + 30], [cx - 4, y + 30]], '#2a7aa8');

    // Destellos
    for (let i = 0; i < 5; i++) {
      const a = t * 0.9 + i * 1.4;
      const sx = cx + Math.cos(a) * (24 + i * 4);
      const sy = y + Math.sin(a * 1.3) * (18 + i * 3);
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 3 + i);
      ctx.fillStyle = '#e8faff';
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
    ctx.globalAlpha = 1;

    // Base
    ctx.fillStyle = '#1a2444';
    ctx.fillRect(cx - 24, y + 34, 48, 4);
    ctx.fillStyle = '#2a3860';
    ctx.fillRect(cx - 20, y + 32, 40, 3);
  }
}
