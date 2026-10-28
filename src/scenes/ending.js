// Epílogo y créditos tras vencer al Emperador.

import { G, formatPlaytime } from '../core/state.js';
import { drawText } from '../gfx/ui.js';
import { poly } from '../gfx/pixel.js';
import { TitleScene } from './title.js';

const PAGES = [
  'La luz del cristal estalla. Por un instante, el mundo entero contiene la respiración.',
  'Vaelor cae de rodillas. «Solo quería... no volver a arrodillarme ante nadie.» Su armadura se deshace en ceniza.',
  'Los fragmentos del Cristal de la Aurora se alzan y se unen. La grieta se cierra. Amanece.',
  'Kael volvió a Vallebruma. Colgó la espada sobre la puerta de la herrería... y la bajó cada vez que alguien necesitó ayuda.',
  'Lyra se quedó en el templo, escuchando al cristal. Ya no susurraba: cantaba.',
  'Bram abrió una taberna. Nunca cobró a quien llegaba con hambre.',
  'Nyx desapareció una mañana. Dejó una nota: «Vuelvo cuando haya algo que robar». Debajo, había dibujado un corazón.',
  'Y en el cielo, cada amanecer, la aurora les recordó que la luz no se hereda: se defiende.',
];

export class EndingScene {
  constructor() {
    this.page = 0;
    this.t = 0;
    this.pageT = 0;
    this.finished = false;
    this.credits = false;
    G.audio?.playMusic('ending');
  }

  update(dt) {
    this.t += dt;
    this.pageT += dt;
    if (this.finished) return;
    if (G.input.pressed('ok')) {
      G.audio?.sfx('cursor');
      if (this.credits) {
        this.finished = true;
        G.fadeTo(1, () => {
          G.scenes.set(new TitleScene());
          G.fadeTo(0, null, 2);
        }, 2);
        return;
      }
      if (this.page < PAGES.length - 1) {
        this.page++;
        this.pageT = 0;
      } else {
        this.credits = true;
        this.pageT = 0;
      }
    }
  }

  draw(ctx) {
    // Amanecer
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#0a1638');
    grad.addColorStop(0.35, '#2a3a7a');
    grad.addColorStop(0.62, '#c86a8a');
    grad.addColorStop(0.8, '#f4b06a');
    grad.addColorStop(1, '#4a3a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    // Sol naciente
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(160, 168, 26 + Math.sin(this.t * 0.8) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(160, 168, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Montañas
    poly(ctx, [[-20, 190], [40, 138], [110, 190]], '#3a2a4a');
    poly(ctx, [[60, 190], [150, 126], [230, 190]], '#2e2240');
    poly(ctx, [[190, 190], [270, 142], [340, 190]], '#3a2a4a');
    ctx.fillStyle = '#241a30';
    ctx.fillRect(0, 190, 320, 50);

    // Cristal restaurado
    if (this.page >= 2 || this.credits) {
      const cx = 160;
      const cy = 74 + Math.sin(this.t * 1.2) * 2;
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 52);
      glow.addColorStop(0, 'rgba(255, 240, 190, 0.55)');
      glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 60, cy - 60, 120, 120);
      poly(ctx, [[cx, cy - 26], [cx + 13, cy - 4], [cx + 8, cy + 18], [cx - 8, cy + 18], [cx - 13, cy - 4]], '#ffe9a8');
      poly(ctx, [[cx, cy - 26], [cx + 13, cy - 4], [cx + 2, cy], [cx, cy + 8]], '#fff8dc');
      poly(ctx, [[cx, cy - 26], [cx, cy + 8], [cx - 2, cy], [cx - 13, cy - 4]], '#ffd88a');
      poly(ctx, [[cx - 8, cy + 18], [cx + 8, cy + 18], [cx + 3, cy + 23], [cx - 3, cy + 23]], '#c89a4a');
    }

    if (this.credits) {
      ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
      ctx.fillRect(20, 30, 280, 172);
      drawText(ctx, 'FIN', 160, 46, { color: '#f4d58d', align: 'center', scale: 3 });
      drawText(ctx, 'CRISTAL DE LA AURORA', 160, 82, { color: '#dfe6ff', align: 'center' });
      drawText(ctx, 'Un RPG original para este proyecto', 160, 96, { color: '#8a93b8', align: 'center' });
      drawText(ctx, 'Diseño, código, arte pixelado y música chiptune', 160, 116, { color: '#c8d0ee', align: 'center' });
      drawText(ctx, 'generados desde cero con HTML5 Canvas.', 160, 128, { color: '#c8d0ee', align: 'center' });
      drawText(ctx, `Tiempo de juego: ${formatPlaytime(G.playtime)}`, 160, 148, { color: '#8fa2ff', align: 'center' });
      drawText(ctx, 'Gracias por jugar.', 160, 170, { color: '#ffe9a8', align: 'center' });
      if (Math.sin(this.t * 4) > -0.2) {
        drawText(ctx, 'Z para volver al título', 160, 194, { color: '#8a93b8', align: 'center' });
      }
      return;
    }

    const fadeIn = Math.min(1, this.pageT / 0.9);
    ctx.save();
    ctx.globalAlpha = fadeIn * 0.5;
    ctx.fillStyle = '#080614';
    ctx.fillRect(26, 96, 268, 62);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fadeIn;
    drawText(ctx, PAGES[this.page], 160, 104, {
      color: '#ffffff',
      align: 'center',
      maxWidth: 246,
      wrap: true,
      lineHeight: 13,
      shadow: '#2a1220',
    });
    ctx.restore();

    if (this.pageT > 0.9 && Math.sin(this.t * 4) > 0) {
      drawText(ctx, 'Z ▼', 160, 210, { color: '#f4d58d', align: 'center' });
    }
  }
}
