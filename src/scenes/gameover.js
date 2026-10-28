// Pantalla de derrota: reintentar desde el guardado o volver al título.

import { G } from '../core/state.js';
import { hasSave, loadGame } from '../core/save.js';
import { drawText, drawCursor } from '../gfx/ui.js';
import { FieldScene } from './field.js';
import { TitleScene } from './title.js';

export class GameOverScene {
  constructor() {
    this.time = 0;
    this.canContinue = hasSave();
    this.index = this.canContinue ? 0 : 1;
    this.options = ['Continuar desde el guardado', 'Volver al título'];
    this.start = 0;
  }

  update(dt) {
    this.time += dt;
    if (this.time < 0.6) return;
    const input = G.input;
    const selectable = this.canContinue ? [0, 1] : [1];
    if (input.pressed('up') || input.pressed('down')) {
      const pos = Math.max(0, selectable.indexOf(this.index));
      this.index = selectable[(pos + 1) % selectable.length];
      G.audio?.sfx('cursor');
    }
    if (input.pressed('ok')) {
      G.audio?.sfx('ok');
      if (this.index === 0) {
        G.fadeTo(1, () => {
          if (loadGame()) {
            G.reviveAll();
            G.scenes.set(new FieldScene(G.mapId, { x: G.pos.x, y: G.pos.y, dir: G.pos.dir }));
          } else {
            G.scenes.set(new TitleScene());
          }
          G.fadeTo(0, null, 2);
        }, 2);
      } else {
        G.fadeTo(1, () => {
          G.scenes.set(new TitleScene());
          G.fadeTo(0, null, 2);
        }, 2);
      }
    }
  }

  draw(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#0a0206');
    grad.addColorStop(0.7, '#1a0810');
    grad.addColorStop(1, '#050208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#e8455e';
    ctx.fillRect(0, 96, 320, 1);
    ctx.restore();

    drawText(ctx, 'LA AURORA SE APAGA', 160, 66, { color: '#e8455e', align: 'center', scale: 2 });
    drawText(ctx, 'El grupo ha caído en la oscuridad.', 160, 112, { color: '#c8b0c0', align: 'center' });
    drawText(ctx, 'Pero el cristal aún recuerda vuestros nombres.', 160, 126, { color: '#8a7a94', align: 'center' });

    const baseY = 164;
    let shown = 0;
    for (let i = 0; i < 2; i++) {
      if (i === 0 && !this.canContinue) continue;
      const y = baseY + shown * 16;
      if (i === this.index) drawCursor(ctx, 78, y - 1, this.time);
      drawText(ctx, this.options[i], 92, y, { color: i === this.index ? '#ffe9a8' : '#c8b0c0' });
      shown++;
    }
    if (!this.canContinue) {
      drawText(ctx, 'No hay partida guardada.', 160, 196, { color: '#6a5a70', align: 'center' });
    }

    drawText(ctx, 'Z: confirmar', 160, 226, { color: '#6a5a70', align: 'center' });
  }
}
