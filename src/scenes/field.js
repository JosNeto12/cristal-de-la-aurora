// Escena de exploración: mapa, movimiento por casillas, NPCs, eventos y encuentros.

import { G } from '../core/state.js';
import { MAPS } from '../data/maps.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS } from '../data/characters.js';
import { TILE_INFO, drawTile, isSolid } from '../gfx/tiles.js';
import { drawActor, registerPalette, drawObject, drawEnemy, drawSparkle } from '../gfx/sprites.js';
import { drawText, drawWindow, textWidth } from '../gfx/ui.js';
import { DialogueBox } from '../ui/dialogue.js';
import { BattleScene } from './battle.js';
import { MenuScene } from './menu.js';
import { ShopScene } from './shop.js';
import { EndingScene } from './ending.js';

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const MOVE_DUR = 0.13;
const WALK_CYCLE = [1, 0, 2, 0];

function normalize(text) {
  return Array.isArray(text) ? text : [text];
}

// ---------------------------------------------------------------------------
// Ejecutor de guiones de eventos
// ---------------------------------------------------------------------------
class ScriptRunner {
  constructor(field) {
    this.field = field;
    this.queue = [];
    this.active = false;
    this.wait = 0;
  }

  start(commands) {
    if (!commands) return;
    this.queue = Array.isArray(commands) ? commands.slice() : [commands];
    this.active = true;
    this.wait = 0;
    this.next();
  }

  next() {
    if (!this.active) return;
    if (this.wait > 0) return;
    const cmd = this.queue.shift();
    if (!cmd) {
      this.active = false;
      this.field.onScriptDone();
      return;
    }
    this.exec(cmd);
  }

  update(dt) {
    if (!this.active || this.wait <= 0) return;
    this.wait -= dt;
    if (this.wait <= 0) {
      this.wait = 0;
      this.next();
    }
  }

  exec(cmd) {
    const field = this.field;
    if (cmd.if) {
      const branch = cmd.if(G) ? cmd.then : cmd.else;
      if (branch) this.queue = branch.concat(this.queue);
      this.next();
      return;
    }
    if (cmd.say !== undefined) {
      field.dialogue.say(cmd.say, () => this.next());
      return;
    }
    if (cmd.give) {
      G.giveItem(cmd.give, cmd.n || 1);
      G.audio?.sfx('item');
      this.next();
      return;
    }
    if (cmd.gold) {
      G.addGold(cmd.gold);
      G.audio?.sfx('item');
      this.next();
      return;
    }
    if (cmd.flag) {
      G.setFlag(cmd.flag, cmd.value !== false);
      this.next();
      return;
    }
    if (cmd.join) {
      const member = G.addMember(cmd.join);
      field.joinBanner = { name: member ? member.name : cmd.join, t: 2.2 };
      G.audio?.sfx('levelup');
      this.next();
      return;
    }
    if (cmd.sfx) {
      G.audio?.sfx(cmd.sfx);
      this.next();
      return;
    }
    if (cmd.music !== undefined) {
      if (cmd.music === 'stop') G.audio?.stopMusic();
      else G.audio?.playMusic(cmd.music);
      this.next();
      return;
    }
    if (cmd.flash) {
      G.flash.alpha = 0.9;
      G.audio?.sfx('magic');
      this.next();
      return;
    }
    if (cmd.shake) {
      G.shake = cmd.shake || 5;
      this.next();
      return;
    }
    if (cmd.wait) {
      this.wait = cmd.wait;
      return;
    }
    if (cmd.heal) {
      G.healParty();
      G.audio?.sfx('heal');
      this.next();
      return;
    }
    if (cmd.battle) {
      const spec = typeof cmd.battle === 'function' ? cmd.battle(G) : cmd.battle;
      field.startBattle(spec, (won) => {
        if (won) {
          const extra = cmd.onWin || [];
          this.queue = extra.concat(this.queue);
          this.next();
        } else {
          const extra = cmd.onLose || [];
          this.queue = extra.concat(this.queue);
          this.next();
        }
      });
      return;
    }
    if (cmd.ask) {
      const { prompt, price = 0, yes = [], no = [] } = cmd.ask;
      field.dialogue.ask(prompt, ['Sí', 'No'], (index) => {
        if (index === 0) {
          if (price > 0 && G.gold < price) {
            field.dialogue.say(['No tienes oro suficiente...'], () => this.next());
            return;
          }
          if (price > 0) G.spendGold(price);
          this.queue = yes.concat(this.queue);
        } else {
          this.queue = no.concat(this.queue);
        }
        this.next();
      });
      return;
    }
    if (cmd.shop) {
      field.openShop(cmd.shop, () => this.next());
      return;
    }
    if (cmd.warp) {
      this.active = false;
      field.warp(cmd.warp);
      return;
    }
    if (cmd.ending) {
      this.active = false;
      G.scenes.set(new EndingScene());
      return;
    }
    if (cmd.onVictory) {
      this.active = false;
      G.scenes.set(new EndingScene());
      return;
    }
    if (cmd.toast) {
      field.banner = { text: String(cmd.toast), t: 2.2 };
      this.next();
      return;
    }
    if (cmd.end) {
      this.active = false;
      field.onScriptDone();
      return;
    }
    // Comando desconocido: seguir
    this.next();
  }
}

// ---------------------------------------------------------------------------
// Escena de campo
// ---------------------------------------------------------------------------
export class FieldScene {
  constructor(mapId, opts = {}) {
    this.mapId = MAPS[mapId] ? mapId : 'vallebruma';
    this.map = MAPS[this.mapId];
    this.grid = this.map.grid;
    this.time = 0;
    this.dialogue = new DialogueBox();
    this.script = new ScriptRunner(this);
    this.banner = { text: this.map.name, t: 2.6 };
    this.joinBanner = null;
    this.cam = { x: 0, y: 0 };
    this.locked = false;
    this.encounterCounter = this.rollEncounterSteps();

    const spawn = opts.x !== undefined
      ? { x: opts.x, y: opts.y, dir: opts.dir || 'down' }
      : (this.map.spawn || { x: 1, y: 1, dir: 'down' });

    this.player = {
      x: spawn.x,
      y: spawn.y,
      dir: spawn.dir,
      px: spawn.x * 16 + 8,
      py: spawn.y * 16 + 14,
      frame: 0,
      walkT: 0,
    };
    this.move = null;

    this.props = [];
    this.entities = [];
    this.buildEvents();
    this.updateCamera(true);
    G.mapId = this.mapId;
    G.pos = { x: this.player.x, y: this.player.y, dir: this.player.dir };
    G.audio?.playMusic(this.map.music);
    G.fadeTo(0, null, 3);
  }

  rollEncounterSteps() {
    const e = this.map.encounters;
    if (!e) return Infinity;
    return Math.floor(e.steps[0] + Math.random() * (e.steps[1] - e.steps[0] + 1));
  }

  buildEvents() {
    for (const ev of this.map.events) {
      if (ev.type === 'npc' || ev.type === 'boss') {
        if (ev.palette && ev.id) registerPalette(`npc:${ev.id}`, ev.palette);
        this.entities.push({
          ev,
          x: ev.x,
          y: ev.y,
          dir: ev.dir || 'down',
          frame: 0,
        });
      }
      if (ev.type === 'chest' || ev.type === 'sign' || ev.type === 'savepoint' || ev.type === 'object') {
        this.props.push(ev);
      }
    }
  }

  entityVisible(ent) {
    const ev = ent.ev;
    if (ev.type === 'boss' && ev.flag && G.flag(ev.flag)) return false;
    if (G.hasMember(ev.id) && CHARACTERS[ev.id]) return false;
    if (ev.requires && !G.flag(ev.requires)) return false;
    return true;
  }

  eventAt(x, y, types = null) {
    for (const ev of this.map.events) {
      if (ev.x !== x || ev.y !== y) continue;
      if (types && !types.includes(ev.type)) continue;
      if (ev.type === 'boss' && ev.flag && G.flag(ev.flag)) continue;
      // NPCs que ya se han unido al grupo dejan de existir en el mapa
      if ((ev.type === 'npc' || ev.type === 'boss') && CHARACTERS[ev.id] && G.hasMember(ev.id)) continue;
      return ev;
    }
    return null;
  }

  entityAt(x, y) {
    return this.entities.find((e) => e.x === x && e.y === y && this.entityVisible(e));
  }

  blockedByProp(x, y) {
    return this.props.some((p) => p.x === x && p.y === y);
  }

  canWalk(x, y) {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return false;
    const tile = this.grid[y][x];
    if (isSolid(tile)) return false;
    if (this.entityAt(x, y)) return false;
    if (this.blockedByProp(x, y)) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Movimiento
  // -------------------------------------------------------------------------
  tryStartMove(dir) {
    const p = this.player;
    p.dir = dir;
    if (this.move) return;
    const d = DIRS[dir];
    const nx = p.x + d.x;
    const ny = p.y + d.y;

    const door = this.eventAt(nx, ny, ['door']);
    if (door) {
      this.useDoor(door);
      return;
    }

    if (this.entityAt(nx, ny)) {
      const ent = this.entityAt(nx, ny);
      if (ent.ev.type === 'npc') ent.dir = opposite(dir);
      return;
    }

    if (!this.canWalk(nx, ny)) return;
    this.move = { fromX: p.x, fromY: p.y, toX: nx, toY: ny, t: 0 };
    p.walkT = 0;
  }

  updateMovement(dt) {
    const p = this.player;
    if (this.move) {
      this.move.t += dt / MOVE_DUR;
      p.walkT += dt;
      p.frame = WALK_CYCLE[Math.floor(p.walkT * 9) % WALK_CYCLE.length];
      const t = Math.min(1, this.move.t);
      p.px = (this.move.fromX + (this.move.toX - this.move.fromX) * t) * 16 + 8;
      p.py = (this.move.fromY + (this.move.toY - this.move.fromY) * t) * 16 + 14;
      if (this.move.t >= 1) {
        p.x = this.move.toX;
        p.y = this.move.toY;
        p.px = p.x * 16 + 8;
        p.py = p.y * 16 + 14;
        this.move = null;
        this.onStepComplete();
      }
      return;
    }

    const dir = G.input.dir();
    if (dir) {
      this.tryStartMove(dir);
    } else {
      p.frame = 0;
      p.walkT = 0;
    }
  }

  onStepComplete() {
    const x = this.player.x;
    const y = this.player.y;

    // Triggers del mapa
    for (const ev of this.map.events) {
      if (ev.type !== 'trigger') continue;
      const w = ev.w || 1;
      const h = ev.h || 1;
      if (x < ev.x || x >= ev.x + w || y < ev.y || y >= ev.y + h) continue;
      const flag = ev.flag || `trig_${this.mapId}_${ev.x}_${ev.y}`;
      if (ev.once && G.flag(flag)) continue;
      if (ev.once) G.setFlag(flag);
      const cmds = typeof ev.script === 'function' ? ev.script(G) : ev.script;
      this.script.start(cmds);
      return;
    }

    // Encuentros aleatorios
    if (!this.map.encounters || this.script.active) return;
    const tile = this.grid[y][x];
    if (tile === 'stairs' || tile === 'door' || tile === 'bridge') return;
    this.encounterCounter--;
    if (this.encounterCounter <= 0) {
      this.encounterCounter = this.rollEncounterSteps();
      this.startRandomBattle();
    }
  }

  // -------------------------------------------------------------------------
  // Interacción
  // -------------------------------------------------------------------------
  interact() {
    if (this.dialogue.open || this.script.active || this.locked) return;
    const d = DIRS[this.player.dir];
    const tx = this.player.x + d.x;
    const ty = this.player.y + d.y;
    let ev = this.eventAt(tx, ty, ['npc', 'sign', 'chest', 'boss', 'object', 'savepoint', 'door']);
    // Se puede hablar con el tendero al otro lado del mostrador
    if (!ev && this.grid[ty]?.[tx] === 'counter') {
      ev = this.eventAt(tx + d.x, ty + d.y, ['npc']);
    }
    if (!ev) return;
    this.triggerEvent(ev);
  }

  triggerEvent(ev) {
    switch (ev.type) {
      case 'npc': {
        const cmds = typeof ev.script === 'function' ? ev.script(G) : ev.script;
        this.script.start(cmds);
        break;
      }
      case 'sign':
        this.dialogue.say(ev.text || ['No se lee nada.']);
        break;
      case 'object':
        this.dialogue.say(ev.text || ['No hay nada interesante.']);
        break;
      case 'savepoint': {
        G.healParty();
        G.audio?.sfx('crystal');
        G.flash.alpha = 0.5;
        this.dialogue.say(['El cristal de viaje os envuelve en una luz tibia.', 'Vuestras heridas se cierran y la magia vuelve a fluir.']);
        break;
      }
      case 'chest': {
        if (ev.flag && G.flag(ev.flag)) {
          this.dialogue.say(['El cofre está vacío.']);
          break;
        }
        const item = ITEMS[ev.item];
        G.giveItem(ev.item, ev.n || 1);
        if (ev.flag) G.setFlag(ev.flag);
        G.audio?.sfx('chest');
        this.dialogue.say([`¡Encontraste ${item ? item.name : ev.item}!`]);
        break;
      }
      case 'door':
        this.useDoor(ev);
        break;
      case 'boss':
        this.startBoss(ev);
        break;
      default:
        break;
    }
  }

  useDoor(ev) {
    if (ev.locked) {
      this.dialogue.say(ev.text || ['La puerta está cerrada.']);
      return;
    }
    if (ev.requires && !G.flag(ev.requires)) {
      this.dialogue.say(ev.lockedText || ['Está sellado.']);
      return;
    }
    G.audio?.sfx('door');
    this.warp({ map: ev.to, x: ev.tx, y: ev.ty, dir: ev.dir });
  }

  startBoss(ev) {
    const intro = normalize(ev.intro || ['¡Un enemigo poderoso bloquea el camino!']);
    this.dialogue.say(intro, () => {
      this.startBattle(ev.battle, (won) => {
        if (won) {
          const cmds = typeof ev.onWin === 'function' ? ev.onWin(G) : (ev.onWin || []);
          this.script.start(cmds);
        }
      });
    });
  }

  startRandomBattle() {
    const enc = this.map.encounters;
    if (!enc) return;
    if (this.script.active || this.dialogue.open) return;
    const total = enc.groups.reduce((s, g) => s + (g.w || 1), 0);
    let roll = Math.random() * total;
    let group = enc.groups[0];
    for (const g of enc.groups) {
      roll -= g.w || 1;
      if (roll <= 0) { group = g; break; }
    }
    const spec = {
      enemies: group.enemies,
      bg: this.map.ambient,
      levelBonus: enc.levelBonus || 0,
      music: 'battle',
    };
    G.audio?.sfx('encounter');
    G.flash.alpha = 0.85;
    this.startBattle(spec, null);
  }

  startBattle(spec, cb) {
    this.locked = true;
    const scene = new BattleScene({
      ...spec,
      bg: spec.bg || this.map.ambient || 'day',
      onDone: (result) => {
        G.scenes.pop();
        this.locked = false;
        G.audio?.playMusic(this.map.music);
        if (cb) cb(result === 'win');
      },
    });
    scene.field = this;
    G.scenes.push(scene);
  }

  onScriptDone() {
    // Al terminar un guion, refrescar entidades (por si alguien se unió)
    this.entities = [];
    this.buildEvents();
  }

  warp(target) {
    if (this.locked && G.fade.target === 1) return;
    this.locked = true;
    G.audio?.sfx('door');
    G.fadeTo(1, () => {
      const scene = new FieldScene(target.map, { x: target.x, y: target.y, dir: target.dir });
      G.scenes.set(scene);
      G.fadeTo(0, null, 3);
    }, 5);
  }

  openShop(id, onClose) {
    this.locked = true;
    const scene = new ShopScene(id, this, () => {
      G.scenes.pop();
      this.locked = false;
      if (onClose) onClose();
    });
    G.scenes.push(scene);
  }

  openMenu() {
    if (this.locked || this.script.active || this.dialogue.open) return;
    G.audio?.sfx('menu');
    G.scenes.push(new MenuScene(this));
  }

  // -------------------------------------------------------------------------
  // Ciclo
  // -------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    G.playtime += dt;
    // Mantener sincronizada la posición para guardar/continuar
    G.mapId = this.mapId;
    G.pos.x = this.player.x;
    G.pos.y = this.player.y;
    G.pos.dir = this.player.dir;
    const dialogueWasOpen = this.dialogue.open;
    this.dialogue.update(dt, G.input);
    this.script.update(dt);

    if (this.banner && this.banner.t > 0) this.banner.t -= dt;
    if (this.joinBanner) {
      this.joinBanner.t -= dt;
      if (this.joinBanner.t <= 0) this.joinBanner = null;
    }

    const busy = this.dialogue.open || this.script.active || this.locked || G.fade.alpha > 0.02;
    if (busy) {
      this.player.frame = 0;
      return;
    }

    // Solo interactuar si el diálogo no estaba abierto al empezar el fotograma:
    // así el OK que cierra una conversación no la vuelve a abrir.
    if (!dialogueWasOpen && G.input.pressed('ok')) this.interact();
    if (G.input.pressed('cancel') || G.input.pressed('menu')) {
      this.openMenu();
      return;
    }

    this.updateMovement(dt);
    this.updateCamera(false, dt);
  }

  updateCamera(instant = false, dt = 0.016) {
    const mapW = this.map.w * 16;
    const mapH = this.map.h * 16;
    let tx;
    let ty;
    if (mapW >= 320) {
      tx = Math.max(0, Math.min(mapW - 320, this.player.px - 160));
    } else {
      tx = (mapW - 320) / 2;
    }
    if (mapH >= 240) {
      ty = Math.max(0, Math.min(mapH - 240, this.player.py - 120));
    } else {
      ty = (mapH - 240) / 2;
    }
    if (instant) {
      this.cam.x = tx;
      this.cam.y = ty;
    } else {
      this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 14);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 14);
    }
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------
  draw(ctx) {
    const camX = Math.round(this.cam.x);
    const camY = Math.round(this.cam.y);

    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, 320, 240);

    const startX = Math.floor(camX / 16);
    const startY = Math.floor(camY / 16);
    for (let y = startY; y <= startY + 15; y++) {
      for (let x = startX; x <= startX + 21; x++) {
        if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) continue;
        const kind = this.grid[y][x];
        drawTile(ctx, kind, x * 16 - camX, y * 16 - camY, x, y, this.time);
      }
    }

    // Objetos y personajes ordenados por profundidad
    const drawables = [];
    for (const p of this.props) drawables.push({ y: p.y * 16 + 16, kind: 'prop', obj: p });
    for (const e of this.entities) {
      if (!this.entityVisible(e)) continue;
      drawables.push({ y: e.y * 16 + 16, kind: 'entity', obj: e });
    }
    drawables.push({ y: this.player.py, kind: 'player' });
    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === 'prop') this.drawProp(ctx, d.obj, camX, camY);
      else if (d.kind === 'entity') this.drawEntity(ctx, d.obj, camX, camY);
      else this.drawPlayer(ctx, camX, camY);
    }

    this.drawAmbient(ctx, camX, camY);
    this.drawIndicators(ctx, camX, camY);
    this.drawHud(ctx);
    this.dialogue.draw(ctx);
    G.input.touch.active && this.drawTouchHint(ctx);
  }

  drawPlayer(ctx, camX, camY) {
    const p = this.player;
    drawActor(ctx, 'kael', p.px - camX, p.py - camY, p.dir, p.frame);
  }

  drawEntity(ctx, ent, camX, camY) {
    const px = ent.x * 16 + 8 - camX;
    const py = ent.y * 16 + 16 - camY;
    const ev = ent.ev;
    if (ev.type === 'boss') {
      drawEnemy(ctx, ev.sprite, px, py);
      return;
    }
    const key = ev.palette && ev.id ? `npc:${ev.id}` : ev.sprite;
    drawActor(ctx, key, px, py, ent.dir, ent.frame, ev.opts || {});
  }

  drawProp(ctx, prop, camX, camY) {
    const px = prop.x * 16 + 8 - camX;
    const py = prop.y * 16 + 16 - camY;
    if (prop.type === 'chest') {
      const opened = prop.flag && G.flag(prop.flag);
      drawObject(ctx, opened ? 'chestOpen' : 'chest', px, py, { anchor: 'bottom' });
    } else if (prop.type === 'sign') {
      drawObject(ctx, 'sign', px, py, { anchor: 'bottom' });
    } else if (prop.type === 'savepoint') {
      drawObject(ctx, 'save', px, py, { anchor: 'bottom' });
      drawSparkle(ctx, px - 4, py - 18, this.time);
      drawSparkle(ctx, px + 5, py - 10, this.time + 1.3);
    } else if (prop.type === 'object') {
      const tile = this.grid[prop.y]?.[prop.x];
      if (['crystal', 'rune', 'table'].includes(tile)) return;
      drawObject(ctx, prop.kind || 'rock', px, py, { anchor: 'bottom' });
    }
  }

  drawAmbient(ctx, camX, camY) {
    const amb = this.map.ambient;
    if (amb === 'cave') {
      const px = this.player.px - camX;
      const py = this.player.py - camY - 10;
      const grad = ctx.createRadialGradient(px, py, 26, px, py, 118);
      grad.addColorStop(0, 'rgba(8,4,20,0)');
      grad.addColorStop(0.65, 'rgba(8,4,20,0.35)');
      grad.addColorStop(1, 'rgba(6,3,16,0.78)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = 'rgba(40, 20, 70, 0.18)';
      ctx.fillRect(0, 0, 320, 240);
    } else if (amb === 'sanctum') {
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, 'rgba(60, 30, 120, 0.18)');
      grad.addColorStop(1, 'rgba(10, 6, 30, 0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
    } else if (amb === 'warm') {
      ctx.fillStyle = 'rgba(255, 170, 90, 0.05)';
      ctx.fillRect(0, 0, 320, 240);
    }
  }

  drawIndicators(ctx, camX, camY) {
    // Aviso de interacción sobre el objeto que miramos
    const d = DIRS[this.player.dir];
    let tx = this.player.x + d.x;
    let ty = this.player.y + d.y;
    let ev = this.eventAt(tx, ty, ['npc', 'sign', 'chest', 'boss', 'object', 'savepoint', 'door']);
    if (!ev && this.grid[ty]?.[tx] === 'counter') {
      const ev2 = this.eventAt(tx + d.x, ty + d.y, ['npc']);
      if (ev2) {
        ev = ev2;
        tx += d.x;
        ty += d.y;
      }
    }
    if (!ev) return;
    const px = tx * 16 + 8 - camX;
    const py = ty * 16 - camY - 4 + Math.sin(this.time * 4) * 1.5;
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(px - 4, py - 9, 9, 11);
    ctx.fillStyle = '#f4d58d';
    ctx.fillRect(px - 3, py - 8, 7, 9);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(px - 1, py - 7, 2, 4);
    ctx.fillRect(px - 1, py - 2, 2, 2);
  }

  drawHud(ctx) {
    if (this.banner && this.banner.t > 0) {
      const alpha = Math.min(1, this.banner.t / 0.4);
      const w = Math.max(96, textWidth(this.banner.text) + 26);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawWindow(ctx, Math.round(160 - w / 2), 12, w, 20, { alpha: 0.85 });
      drawText(ctx, this.banner.text, 160, 18, { color: '#f4f6ff', align: 'center' });
      ctx.restore();
    }

    if (this.joinBanner) {
      const t = this.joinBanner.t;
      const alpha = Math.min(1, t / 0.3);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawWindow(ctx, 66, 100, 188, 34);
      drawText(ctx, '¡Se une al grupo!', 160, 106, { color: '#f4d58d', align: 'center' });
      drawText(ctx, this.joinBanner.name, 160, 118, { color: '#ffffff', align: 'center' });
      ctx.restore();
    }

    // Pistas de control discretas
  }

  drawTouchHint(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(48, 196, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(272, 196, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function opposite(dir) {
  return { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
}
