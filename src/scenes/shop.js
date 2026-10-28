// Tienda: comprar y vender con ventanas al estilo SNES.

import { G } from '../core/state.js';
import { ITEMS, SHOP_STOCK, sellPrice } from '../data/items.js';
import { drawWindow, drawText, drawCursor } from '../gfx/ui.js';

export class ShopScene {
  constructor(id, field, onClose) {
    this.shop = SHOP_STOCK[id] || SHOP_STOCK.vallebruma;
    this.id = id;
    this.field = field;
    this.onClose = onClose;
    this.mode = 'menu';
    this.index = 0;
    this.time = 0;
    this.message = '';
    this.messageT = 0;
    this.options = ['Comprar', 'Vender', 'Salir'];
    this.list = [];
    this.title = '';
    G.audio?.sfx('menu');
  }

  close() {
    G.audio?.sfx('cancel');
    this.onClose?.();
  }

  say(msg) {
    this.message = msg;
    this.messageT = 2.2;
  }

  update(dt) {
    this.time += dt;
    if (this.messageT > 0) this.messageT -= dt;
    const input = G.input;

    if (this.mode === 'menu') {
      this.nav(this.options.length);
      if (input.pressed('ok')) {
        G.audio?.sfx('ok');
        const opt = this.options[this.index];
        if (opt === 'Comprar') this.openBuy();
        else if (opt === 'Vender') this.openSell();
        else this.close();
      }
      if (input.pressed('cancel')) this.close();
      return;
    }

    if (this.mode === 'buy' || this.mode === 'sell') {
      this.nav(this.list.length);
      if (input.pressed('ok')) {
        const entry = this.list[this.index];
        if (!entry || entry.disabled) { G.audio?.sfx('deny'); return; }
        if (this.mode === 'buy') this.buy(entry);
        else this.sell(entry);
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        this.mode = 'menu';
        this.index = 0;
      }
      return;
    }
  }

  nav(len) {
    const input = G.input;
    if (len <= 0) return;
    if (input.pressed('up')) {
      this.index = (this.index + len - 1) % len;
      G.audio?.sfx('cursor');
    }
    if (input.pressed('down')) {
      this.index = (this.index + 1) % len;
      G.audio?.sfx('cursor');
    }
  }

  openBuy() {
    this.mode = 'buy';
    this.title = 'Comprar';
    this.list = this.shop.goods.map((id) => {
      const item = ITEMS[id];
      return {
        id,
        label: item.name,
        right: `${item.price} oro`,
        desc: item.desc,
        disabled: G.gold < item.price,
      };
    });
  }

  openSell() {
    this.mode = 'sell';
    this.title = 'Vender';
    const ids = Object.keys(G.inventory).filter((id) => ITEMS[id] && ITEMS[id].kind !== 'key');
    this.list = ids.map((id) => {
      const item = ITEMS[id];
      return {
        id,
        label: item.name,
        right: `${sellPrice(id)} oro  x${G.countItem(id)}`,
        desc: item.desc,
        disabled: false,
      };
    });
    if (!this.list.length) {
      this.list = [{ label: 'No tienes nada que vender.', disabled: true, desc: '' }];
    }
  }

  buy(entry) {
    const item = ITEMS[entry.id];
    if (G.gold < item.price) { this.say('No tienes oro suficiente.'); G.audio?.sfx('deny'); return; }
    G.spendGold(item.price);
    G.giveItem(entry.id, 1);
    G.audio?.sfx('item');
    this.say(`${item.name} comprado.`);
    this.openBuy();
    this.index = Math.min(this.index, this.list.length - 1);
  }

  sell(entry) {
    if (!entry.id) return;
    const price = sellPrice(entry.id);
    if (G.takeItem(entry.id, 1)) {
      G.addGold(price);
      G.audio?.sfx('item');
      this.say(`Vendido por ${price} de oro.`);
    }
    this.openSell();
    this.index = Math.min(this.index, this.list.length - 1);
  }

  draw(ctx) {
    if (this.field) {
      this.field.draw(ctx);
      ctx.fillStyle = 'rgba(4, 6, 20, 0.66)';
      ctx.fillRect(0, 0, 320, 240);
    } else {
      ctx.fillStyle = '#080a14';
      ctx.fillRect(0, 0, 320, 240);
    }

    // Cabecera
    drawWindow(ctx, 6, 6, 308, 26);
    drawText(ctx, this.shop.name, 18, 13, { color: '#f4d58d' });
    drawText(ctx, `${G.gold} oro`, 302, 13, { color: '#ffffff', align: 'right' });

    if (this.mode === 'menu') {
      drawWindow(ctx, 90, 64, 140, 96);
      this.options.forEach((opt, i) => {
        const y = 78 + i * 26;
        if (i === this.index) drawCursor(ctx, 100, y - 1, this.time);
        drawText(ctx, opt, 112, y, { color: i === this.index ? '#ffe9a8' : '#ffffff' });
      });
      drawWindow(ctx, 6, 198, 308, 36);
      drawText(ctx, 'Bienvenido. Mira, toca y paga.', 160, 208, { color: '#a8b2d8', align: 'center' });
      return;
    }

    // Lista de compra/venta
    drawWindow(ctx, 6, 38, 222, 154);
    drawText(ctx, this.title, 18, 46, { color: '#8fa2ff' });
    const visible = 9;
    const scroll = Math.max(0, Math.min(this.index - visible + 1, this.list.length - visible));
    const start = Math.max(0, scroll);
    for (let i = start; i < Math.min(this.list.length, start + visible); i++) {
      const entry = this.list[i];
      const y = 62 + (i - start) * 14;
      if (i === this.index) drawCursor(ctx, 18, y - 1, this.time);
      drawText(ctx, entry.label, 30, y, {
        color: entry.disabled ? '#6a7194' : i === this.index ? '#ffe9a8' : '#ffffff',
      });
      if (entry.right) {
        drawText(ctx, entry.right, 220, y, { color: entry.disabled ? '#6a7194' : '#c8d0ee', align: 'right' });
      }
    }

    // Detalle
    drawWindow(ctx, 232, 38, 82, 154);
    const entry = this.list[this.index];
    drawText(ctx, 'Detalle', 244, 46, { color: '#8fa2ff' });
    if (entry) {
      drawText(ctx, entry.desc || '', 240, 60, { color: '#dfe6ff', maxWidth: 68, wrap: true, lineHeight: 10 });
      const item = ITEMS[entry.id];
      if (item) {
        const stats = ['atk', 'def', 'mag', 'mdef', 'spd']
          .filter((k) => item[k]).map((k) => `${k.toUpperCase()}+${item[k]}`).join(' ');
        if (stats) drawText(ctx, stats, 240, 120, { color: '#8fa2ff', maxWidth: 68, wrap: true, lineHeight: 10 });
        if (item.who) {
          drawText(ctx, 'Para: ' + item.who.map((w) => w.toUpperCase()).join(', '), 240, 150, {
            color: '#8a93b8', maxWidth: 68, wrap: true, lineHeight: 10,
          });
        }
      }
    }

    drawWindow(ctx, 6, 198, 308, 36);
    if (this.messageT > 0) {
      drawText(ctx, this.message, 160, 206, { color: '#f4d58d', align: 'center' });
    } else {
      drawText(ctx, 'Z: comprar/vender   X: volver', 160, 206, { color: '#8a93b8', align: 'center' });
    }
    drawText(ctx, this.mode === 'buy' ? 'Compra' : 'Venta', 18, 216, { color: '#8fa2ff' });
  }
}
