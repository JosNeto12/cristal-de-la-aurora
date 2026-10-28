// Entrada unificada: teclado, mando y pantalla táctil. Acciones abstractas y flancos.

const KEY_ACTIONS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'ok', Enter: 'ok', Space: 'ok', NumpadEnter: 'ok',
  KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
  KeyC: 'menu', ShiftLeft: 'menu', ShiftRight: 'menu', Tab: 'menu',
  KeyF: 'fullscreen',
  KeyL: 'scanlines',
  KeyM: 'mute',
};

const PAD_MAP = {
  0: 'ok', 1: 'cancel', 2: 'cancel', 3: 'menu', 8: 'menu', 9: 'menu',
  12: 'up', 13: 'down', 14: 'left', 15: 'right',
};

export class Input {
  constructor() {
    this.keys = new Set();     // acciones pulsadas por teclado
    this.pad = new Set();      // acciones pulsadas por mando
    this.just = new Set();
    this.released = new Set();
    this.since = new Map();
    this.onFirstGesture = null;
    this.touch = { active: false, x: 0, y: 0, ox: 0, oy: 0, t: 0 };
    this.touchJust = new Set();

    window.addEventListener('keydown', (e) => this._key(e, true));
    window.addEventListener('keyup', (e) => this._key(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pad.clear();
      this.since.clear();
    });
  }

  attachTouch(canvas) {
    const local = (ev) => {
      const r = canvas.getBoundingClientRect();
      const t = ev.changedTouches?.[0] || ev.touches?.[0] || ev;
      return {
        x: ((t.clientX - r.left) / r.width) * 320,
        y: ((t.clientY - r.top) / r.height) * 240,
      };
    };
    canvas.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      this._gesture();
      const p = local(ev);
      this.touch = { active: true, x: p.x, y: p.y, ox: p.x, oy: p.y, t: performance.now() };
      if (p.x > 170 && p.y > 130) {
        this.touchJust.add('ok');
        this._press('ok');
      } else if (p.x > 250 && p.y < 80) {
        this._press('menu');
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (ev) => {
      ev.preventDefault();
      if (!this.touch.active) return;
      const p = local(ev);
      this.touch.x = p.x;
      this.touch.y = p.y;
    }, { passive: false });

    const end = (ev) => {
      ev.preventDefault();
      this.touch.active = false;
    };
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  _gesture() {
    if (this.onFirstGesture) {
      const fn = this.onFirstGesture;
      this.onFirstGesture = null;
      try { fn(); } catch { /* sin audio disponible */ }
    }
  }

  _press(action) {
    if (!this.keys.has(action) && !this.pad.has(action)) {
      this.just.add(action);
      this.since.set(action, performance.now());
    }
  }

  _key(e, down) {
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
    this._gesture();
    if (down) {
      if (e.repeat) return;
      this._press(action);
      this.keys.add(action);
    } else {
      this.keys.delete(action);
      if (!this.pad.has(action)) {
        this.released.add(action);
        this.since.delete(action);
      }
    }
  }

  pollGamepad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = pads && Array.from(pads).find(Boolean);
    if (!pad) {
      if (this.pad.size) { this.pad.clear(); this.released.add('gamepad'); }
      return;
    }
    for (const [idx, action] of Object.entries(PAD_MAP)) {
      const btn = pad.buttons[Number(idx)];
      if (!btn) continue;
      if (btn.pressed) {
        if (!this.pad.has(action)) {
          this._press(action);
          this._gesture();
        }
        this.pad.add(action);
      } else if (this.pad.has(action)) {
        this.pad.delete(action);
        if (!this.keys.has(action)) this.released.add(action);
      }
    }
    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    const dead = 0.45;
    const dirs = { left: ax < -dead, right: ax > dead, up: ay < -dead, down: ay > dead };
    for (const [action, on] of Object.entries(dirs)) {
      if (on && !this.pad.has(action)) {
        this._press(action);
        this.pad.add(action);
        this._gesture();
      } else if (!on && this.pad.has(action) && !this.keys.has(action)) {
        this.pad.delete(action);
        this.released.add(action);
      }
    }
  }

  isDown(action) {
    return this.keys.has(action) || this.pad.has(action) || this.touchJust.has(action);
  }

  pressed(action) {
    return this.just.has(action);
  }

  releasedNow(action) {
    return this.released.has(action);
  }

  heldFor(action) {
    if (!this.isDown(action)) return 0;
    return performance.now() - (this.since.get(action) || performance.now());
  }

  anyPressed() {
    return this.just.size > 0;
  }

  // Dirección efectiva (teclado, mando o arrastre táctil)
  dir() {
    if (this.touch.active) {
      const dx = this.touch.x - this.touch.ox;
      const dy = this.touch.y - this.touch.oy;
      if (Math.hypot(dx, dy) > 12) {
        if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
        return dy > 0 ? 'down' : 'up';
      }
      return null;
    }
    // El último eje que se pulsó manda
    const order = ['down', 'up', 'left', 'right'];
    for (const d of order) if (this.isDown(d)) return d;
    return null;
  }

  endFrame() {
    this.just.clear();
    this.released.clear();
    this.touchJust.clear();
  }
}
