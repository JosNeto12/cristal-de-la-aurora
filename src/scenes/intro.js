// Introducción narrativa antes de empezar la aventura.

import { G } from '../core/state.js';
import { drawText } from '../gfx/ui.js';
import { FieldScene } from './field.js';

const PAGES = [
  'Hace mil años, cuatro héroes alzaron el Cristal de la Aurora contra la noche.',
  'El cristal ardía con la luz de mil amaneceres. Mientras ardiera, la oscuridad no podría tocar el mundo.',
  'Ahora, el Emperador Vaelor ha arrancado sus fragmentos uno a uno. La aurora se apaga, y con ella, la esperanza.',
  'En el pueblo de Vallebruma, un joven herrero llamado Kael sueña con espadas que brillan. Esta noche, el cristal de la plaza ha vuelto a latir.',
  'Esta es la historia de quienes devolvieron la luz.',
];

export class IntroScene {
  constructor() {
    this.page = 0;
    this.t = 0;
    this.pageT = 0;
    this.done = false;
    G.audio?.playMusic('title');
  }

  update(dt) {
    this.t += dt;
    this.pageT += dt;
    if (this.done) return;

    if (G.input.pressed('ok') || G.input.pressed('cancel')) {
      G.audio?.sfx('cursor');
      if (this.pageT < 0.5 && this.page > 0) return;
      this.page++;
      this.pageT = 0;
      if (this.page >= PAGES.length) {
        this.done = true;
        G.fadeTo(1, () => {
          G.scenes.set(new FieldScene('vallebruma'));
          G.fadeTo(0, null, 2.5);
        }, 2.2);
      }
    }
  }

  draw(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#04050c');
    grad.addColorStop(0.6, '#0a1028');
    grad.addColorStop(1, '#131a36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    // Aurora lejana
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.06 * Math.sin(this.t * 0.7);
    const aurora = ctx.createLinearGradient(0, 46, 0, 168);
    aurora.addColorStop(0, 'rgba(80, 200, 255, 0)');
    aurora.addColorStop(0.25, 'rgba(80, 200, 255, 0.65)');
    aurora.addColorStop(0.55, 'rgba(120, 120, 255, 0.35)');
    aurora.addColorStop(1, 'rgba(80, 60, 160, 0)');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 46, 320, 122);
    ctx.restore();

    // Estrellas
    for (let i = 0; i < 46; i++) {
      const x = (i * 83 + 7) % 320;
      const y = (i * 29 + 13) % 140;
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(this.t + i));
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Silueta del pueblo
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 190, 320, 50);
    ctx.fillRect(30, 176, 40, 16);
    ctx.fillRect(96, 182, 30, 12);
    ctx.fillRect(210, 178, 46, 16);
    ctx.fillRect(264, 184, 24, 10);
    ctx.fillStyle = '#f4d58d';
    for (const [x, y] of [[44, 182], [112, 187], [228, 184], [274, 189]]) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 2 + x);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Texto
    const fadeIn = Math.min(1, this.pageT / 0.7);
    const text = PAGES[Math.min(this.page, PAGES.length - 1)];
    ctx.save();
    ctx.globalAlpha = fadeIn;
    drawText(ctx, text, 160, 96, {
      color: '#e8eeff',
      align: 'center',
      maxWidth: 250,
      wrap: true,
      lineHeight: 13,
      shadow: '#000000',
    });
    ctx.restore();

    if (this.pageT > 0.8) {
      const blink = Math.sin(this.t * 4) > 0;
      if (blink) {
        drawText(ctx, 'Z ▼', 160, 214, { color: '#8fa2ff', align: 'center' });
      }
    }

    // Progreso
    const dots = PAGES.length;
    for (let i = 0; i < dots; i++) {
      ctx.fillStyle = i === this.page ? '#f4d58d' : '#2a3358';
      ctx.fillRect(160 - dots * 5 + i * 10, 226, 5, 2);
    }
  }
}
