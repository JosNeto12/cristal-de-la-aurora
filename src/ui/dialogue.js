// Caja de diálogo estilo SNES: texto progresivo, paginación y elecciones.

import { drawDialogWindow, drawText, drawCursor } from '../gfx/ui.js';
import { wrapText } from '../gfx/font.js';
import { G } from '../core/state.js';

const BOX = { x: 8, y: 174, w: 304, h: 58 };
const TEXT_W = 284;
const MAX_LINES = 3;

function paginate(text) {
  const lines = wrapText(text, TEXT_W);
  const pages = [];
  for (let i = 0; i < lines.length; i += MAX_LINES) {
    pages.push(lines.slice(i, i + MAX_LINES).join('\n'));
  }
  return pages.length ? pages : [''];
}

export class DialogueBox {
  constructor() {
    this.open = false;
    this.pages = [];
    this.page = 0;
    this.reveal = 0;
    this.speed = 62;
    this.cb = null;
    this.choices = null;
    this.choiceIndex = 0;
    this.blink = 0;
    this.advanceLock = 0;
  }

  say(pages, cb = null) {
    const list = Array.isArray(pages) ? pages : [pages];
    this.pages = [];
    for (const p of list) {
      if (p === null || p === undefined) continue;
      this.pages.push(...paginate(String(p)));
    }
    if (!this.pages.length) this.pages = [''];
    this.page = 0;
    this.reveal = 0;
    this.cb = cb;
    this.choices = null;
    this.open = true;
    this.advanceLock = 0.12;
  }

  ask(prompt, options, cb) {
    this.pages = paginate(prompt);
    this.page = 0;
    this.reveal = 9999;
    this.cb = cb;
    this.choices = options;
    this.choiceIndex = 0;
    this.open = true;
    this.advanceLock = 0.1;
  }

  close() {
    this.open = false;
    this.choices = null;
    const cb = this.cb;
    this.cb = null;
    if (cb) cb();
  }

  update(dt, input) {
    if (!this.open) return;
    this.blink += dt;
    this.advanceLock = Math.max(0, this.advanceLock - dt);

    if (this.choices) {
      if (input.pressed('left') || input.pressed('up')) {
        this.choiceIndex = (this.choiceIndex + this.choices.length - 1) % this.choices.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('right') || input.pressed('down')) {
        this.choiceIndex = (this.choiceIndex + 1) % this.choices.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('ok') && this.advanceLock <= 0) {
        const idx = this.choiceIndex;
        G.audio?.sfx('ok');
        this.open = false;
        this.choices = null;
        const cb = this.cb;
        this.cb = null;
        if (cb) cb(idx);
      }
      return;
    }

    const current = this.pages[this.page] || '';
    if (this.reveal < current.length) {
      this.reveal = Math.min(current.length, this.reveal + this.speed * dt);
      if (input.pressed('ok') && this.advanceLock <= 0) this.reveal = current.length;
    } else if (input.pressed('ok') && this.advanceLock <= 0) {
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.reveal = 0;
        G.audio?.sfx('cursor');
      } else {
        G.audio?.sfx('cursor');
        this.close();
      }
    }
  }

  draw(ctx) {
    if (!this.open) return;
    drawDialogWindow(ctx, BOX.x, BOX.y, BOX.w, BOX.h);

    const text = this.pages[this.page] || '';
    const shown = text.slice(0, Math.floor(this.reveal));
    drawText(ctx, shown, BOX.x + 10, BOX.y + 10, {
      color: '#f4f6ff',
      lineHeight: 10,
      shadow: '#1a2040',
    });

    if (this.reveal >= text.length && !this.choices) {
      const blink = Math.sin(this.blink * 5) > 0;
      if (blink) {
        const lastLine = shown.split('\n').pop() || '';
        const w = Math.min(TEXT_W, lastLine.length * 6);
        drawText(ctx, '▼', BOX.x + 10 + w + 4, BOX.y + 10 + (shown.split('\n').length - 1) * 10, {
          color: '#f4d58d',
        });
      }
    }

    if (this.choices) {
      const baseY = BOX.y + 38;
      let cx = BOX.x + 18;
      for (let i = 0; i < this.choices.length; i++) {
        const label = this.choices[i];
        if (i === this.choiceIndex) drawCursor(ctx, cx - 9, baseY - 1, this.blink * 0.5);
        drawText(ctx, label, cx, baseY, { color: i === this.choiceIndex ? '#ffe9a8' : '#c8d0ee' });
        cx += label.length * 6 + 26;
      }
    }
  }
}
