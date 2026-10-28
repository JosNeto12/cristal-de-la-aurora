// Batalla por turnos con medidor ATB estilo Final Fantasy IV–VI.

import { G } from '../core/state.js';
import { ENEMIES, buildEnemies } from '../data/enemies.js';
import { SPELLS } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { statsOf, learnedSpells, grantExp } from '../data/characters.js';
import {
  physicalDamage, magicDamage, healAmount, fleeChance, turnRate,
  applyDamage, applyHeal, tickBuffs, poisonDamage, pickWeighted, expFor, gilFor,
} from '../logic/battleMath.js';
import { drawEnemy } from '../gfx/sprites.js';
import { drawWindow, drawText, drawCursor, drawStatBar, hpColor } from '../gfx/ui.js';
import { poly } from '../gfx/pixel.js';
import { GameOverScene } from './gameover.js';

const PANEL_Y = 148;

export class BattleScene {
  constructor(opts) {
    this.opts = opts;
    this.onDone = opts.onDone;
    this.bgKind = opts.bg || 'day';
    this.time = 0;
    this.phase = 'intro';
    this.introT = 0.5;
    this.timeline = [];
    this.seqActive = false;
    this.stepTimer = 0;
    this.onTimelineEnd = null;
    this.menu = { mode: null, index: 0, targetIndex: 0, actor: null, pending: null, scroll: 0 };
    this.log = [];
    this.popups = [];
    this.particles = [];
    this.slashes = [];
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.victoryData = null;
    this.finished = false;
    this.escapeAllowed = !opts.boss && opts.canFlee !== false;

    this.party = G.party.map((m) => this.makePartyUnit(m));
    this.enemies = buildEnemies(opts.enemies || [], opts.levelBonus || 0).map((e, i) => this.makeEnemyUnit(e, i));
    this.layoutEnemies();

    G.audio?.playMusic(opts.music || 'battle');
    if (opts.boss) G.audio?.sfx('boss');
    this.flash = 0.5;
    this.flashColor = '#ffffff';

    if (opts.nowait) {
      this.phase = 'idle';
      this.introT = 0;
      this.flash = 0;
      this.message(this.opts.boss ? '¡Un enemigo poderoso!' : '¡Enemigos!', 1.2);
    }
    if (opts.openMenu) {
      this.phase = 'idle';
      this.introT = 0;
      this.flash = 0;
      const ready = this.party.find((p) => p.alive);
      if (ready) this.openCommand(ready);
    }
  }

  makePartyUnit(member) {
    const s = statsOf(member);
    return {
      name: member.name,
      ref: member,
      isEnemy: false,
      hp: member.hp,
      maxhp: s.maxhp,
      mp: member.mp,
      maxmp: s.maxmp,
      atk: s.atk,
      def: s.def,
      mag: s.mag,
      mdef: s.mdef,
      spd: s.spd,
      buffs: {},
      defending: false,
      poison: false,
      atb: Math.random() * 0.35,
      alive: member.hp > 0,
      hitT: 0,
    };
  }

  makeEnemyUnit(e, index) {
    const base = ENEMIES[e.id] || e;
    return {
      ...e,
      name: base.name,
      isEnemy: true,
      sprite: base.sprite,
      weak: base.weak || [],
      resist: base.resist || [],
      actions: base.actions || [{ type: 'attack', w: 100 }],
      boss: !!base.boss,
      final: !!base.final,
      phase2: base.phase2 || null,
      phase: 1,
      buffs: {},
      defending: false,
      atb: 0.25 + Math.random() * 0.4,
      alive: true,
      hitT: 0,
      index,
      x: 160,
      y: 130,
    };
  }

  layoutEnemies() {
    const n = this.enemies.length;
    const pos = n <= 1 ? [[160, 134]]
      : n === 2 ? [[112, 128], [208, 134]]
        : n === 3 ? [[84, 126], [160, 136], [236, 126]]
          : [[68, 124], [128, 138], [192, 138], [252, 124]];
    this.enemies.forEach((e, i) => {
      const p = pos[i] || pos[pos.length - 1];
      e.x = p[0];
      e.y = p[1];
    });
  }

  // -------------------------------------------------------------------------
  // Utilidades de secuencia
  // -------------------------------------------------------------------------
  runSequence(steps, onEnd = null) {
    this.timeline = steps.slice();
    this.seqActive = true;
    this.stepTimer = 0;
    this.onTimelineEnd = onEnd;
    this.phase = 'acting';
    this.menu.mode = null;
  }

  updateSequence(dt) {
    if (!this.seqActive) return;
    this.stepTimer -= dt;
    if (this.stepTimer > 0) return;
    const step = this.timeline.shift();
    if (!step) {
      this.seqActive = false;
      const cb = this.onTimelineEnd;
      this.onTimelineEnd = null;
      if (cb) cb();
      return;
    }
    step.fn();
    this.stepTimer = step.delay ?? 0.35;
  }

  message(text, hold = 0.9) {
    this.log.push(text);
    if (this.log.length > 3) this.log.shift();
    this.messageHold = hold;
  }

  addPopup(target, text, color, scale = 1) {
    const x = target.isEnemy ? target.x : 160;
    const y = target.isEnemy ? target.y - 40 : PANEL_Y + 10;
    this.popups.push({ x: x + (Math.random() * 16 - 8), y, text, color, t: 0, life: 0.9, scale });
  }

  spawnParticles(target, color, count = 18) {
    const x = target.isEnemy ? target.x : 160;
    const y = target.isEnemy ? target.y - 18 : PANEL_Y - 10;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 55;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.4 + Math.random() * 0.4,
        t: 0,
        color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  screenFlash(color, amount = 0.5) {
    this.flash = amount;
    this.flashColor = color;
  }

  // -------------------------------------------------------------------------
  // Ciclo principal
  // -------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 2.2);

    for (const p of this.popups) { p.t += dt; p.y -= dt * 18; }
    this.popups = this.popups.filter((p) => p.t < p.life);

    for (const p of this.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);

    for (const s of this.slashes) s.t -= dt;
    this.slashes = this.slashes.filter((s) => s.t > 0);

    for (const e of this.enemies) if (e.hitT > 0) e.hitT -= dt;

    if (this.phase === 'intro') {
      this.introT -= dt;
      if (this.introT <= 0) {
        this.phase = 'idle';
        this.message(this.opts.boss ? '¡Un enemigo poderoso!' : '¡Enemigos!', 1.2);
      }
      return;
    }

    if (this.phase === 'defeat') {
      this.defeatT -= dt;
      if (this.defeatT <= 0 && !this.finished) {
        this.finished = true;
        G.scenes.set(new GameOverScene());
      }
      return;
    }

    this.updateSequence(dt);

    if (this.phase === 'victory') {
      if (G.input.pressed('ok') && !this.seqActive) {
        G.audio?.sfx('ok');
        this.finish('win');
      }
      return;
    }

    if (this.phase === 'idle') {
      this.updateATB(dt);
    }

    if (this.menu.mode) this.updateMenu();
  }

  updateATB(dt) {
    if (this.menu.mode || this.seqActive) return;
    for (const e of this.enemies) if (e.alive) e.atb += turnRate(e) * dt;
    for (const p of this.party) if (p.alive) p.atb += turnRate(p) * dt;

    const readyParty = this.party.find((p) => p.alive && p.atb >= 1);
    if (readyParty) {
      this.openCommand(readyParty);
      return;
    }
    const readyEnemy = this.enemies.find((e) => e.alive && e.atb >= 1);
    if (readyEnemy) {
      this.enemyTurn(readyEnemy);
    }
  }

  openCommand(actor) {
    this.menu = {
      mode: 'command',
      index: 0,
      targetIndex: 0,
      actor,
      pending: null,
      scroll: 0,
    };
    actor.atb = 1;
    actor.defending = false;

    if (actor.poison) {
      const dmg = poisonDamage(actor);
      applyDamage(actor, dmg);
      this.addPopup(actor, String(dmg), '#b18cff');
      this.message(`${actor.name} sufre por el veneno.`, 1.1);
      G.audio?.sfx('hit');
      if (!actor.alive) {
        this.menu.mode = null;
        this.checkEnd();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Menús de batalla
  // -------------------------------------------------------------------------
  commandOptions(actor) {
    const spells = learnedSpells(actor.ref);
    return [
      { id: 'attack', label: 'Atacar' },
      { id: 'magic', label: 'Magia', disabled: spells.length === 0 },
      { id: 'item', label: 'Objeto', disabled: G.itemList(['consumable']).length === 0 },
      { id: 'defend', label: 'Defender' },
      { id: 'flee', label: 'Huir', disabled: !this.escapeAllowed },
    ];
  }

  spellList(actor) {
    return learnedSpells(actor.ref)
      .map((id) => SPELLS[id])
      .filter(Boolean)
      .map((spell) => ({
        spell,
        label: spell.name,
        right: `${spell.mp}`,
        disabled: actor.mp < spell.mp,
      }));
  }

  itemList() {
    return G.itemList(['consumable']).map((id) => ({
      id,
      item: ITEMS[id],
      label: ITEMS[id].name,
      right: `x${G.countItem(id)}`,
    }));
  }

  updateMenu() {
    const input = G.input;
    const menu = this.menu;
    const actor = menu.actor;

    if (menu.mode === 'command') {
      const options = this.commandOptions(actor);
      this.navIndex(options.length);
      if (input.pressed('ok')) {
        const opt = options[menu.index];
        if (!opt || opt.disabled) { G.audio?.sfx('deny'); return; }
        G.audio?.sfx('ok');
        if (opt.id === 'attack') this.beginTarget('enemy', { type: 'attack' });
        else if (opt.id === 'magic') {
          menu.mode = 'magic';
          menu.index = 0;
          menu.scroll = 0;
        } else if (opt.id === 'item') {
          menu.mode = 'item';
          menu.index = 0;
          menu.scroll = 0;
        } else if (opt.id === 'defend') {
          this.doDefend(actor);
        } else if (opt.id === 'flee') {
          this.doFlee();
        }
      }
      if (input.pressed('cancel')) G.audio?.sfx('deny');
      return;
    }

    if (menu.mode === 'magic') {
      const spells = this.spellList(actor);
      this.navIndex(spells.length);
      if (input.pressed('ok')) {
        const pick = spells[menu.index];
        if (!pick || pick.disabled) { G.audio?.sfx('deny'); return; }
        G.audio?.sfx('ok');
        const spell = pick.spell;
        if (spell.target === 'oneEnemy' || spell.target === 'ally' || spell.target === 'deadAlly') {
          this.beginTarget(spell.target === 'oneEnemy' ? 'enemy' : 'ally', { type: 'spell', spell });
        } else {
          this.performSpell(spell, actor, spell.target === 'allEnemies' ? this.aliveEnemies() : this.aliveParty());
        }
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        menu.mode = 'command';
        menu.index = 0;
      }
      return;
    }

    if (menu.mode === 'item') {
      const items = this.itemList();
      this.navIndex(items.length);
      if (input.pressed('ok')) {
        const pick = items[menu.index];
        if (!pick) { G.audio?.sfx('deny'); return; }
        G.audio?.sfx('ok');
        const item = pick.item;
        if (item.damage) {
          this.performItem(pick.id, item, actor, null);
        } else if (item.revive) {
          this.beginTarget('deadAlly', { type: 'item', id: pick.id, item });
        } else {
          this.beginTarget('ally', { type: 'item', id: pick.id, item });
        }
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        menu.mode = 'command';
        menu.index = 0;
      }
      return;
    }

    if (menu.mode === 'target') {
      const list = menu.pending.targets;
      if (list.length === 0) { menu.mode = 'command'; return; }
      if (input.pressed('left') || input.pressed('up')) {
        menu.targetIndex = (menu.targetIndex + list.length - 1) % list.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('right') || input.pressed('down')) {
        menu.targetIndex = (menu.targetIndex + 1) % list.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('ok')) {
        const target = list[menu.targetIndex];
        G.audio?.sfx('ok');
        const pending = menu.pending;
        menu.mode = null;
        if (pending.type === 'attack') this.performPhysical(actor, target);
        else if (pending.type === 'spell') this.performSpell(pending.spell, actor, target);
        else if (pending.type === 'item') this.performItem(pending.id, pending.item, actor, target);
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        menu.mode = pendingBackMode(menu.pending);
        menu.index = 0;
      }
      return;
    }
  }

  navIndex(len) {
    if (len <= 0) return;
    const input = G.input;
    if (input.pressed('up')) {
      this.menu.index = (this.menu.index + len - 1) % len;
      G.audio?.sfx('cursor');
    }
    if (input.pressed('down')) {
      this.menu.index = (this.menu.index + 1) % len;
      G.audio?.sfx('cursor');
    }
  }

  beginTarget(kind, pending) {
    let targets;
    if (kind === 'enemy') targets = this.aliveEnemies();
    else if (kind === 'deadAlly') targets = this.party.filter((p) => !p.alive);
    else targets = this.party.filter((p) => p.alive);
    if (!targets.length) {
      this.menu.mode = 'command';
      return;
    }
    this.menu.mode = 'target';
    this.menu.targetIndex = 0;
    this.menu.pending = { ...pending, targets };
  }

  aliveEnemies() {
    return this.enemies.filter((e) => e.alive);
  }

  aliveParty() {
    return this.party.filter((p) => p.alive);
  }

  // -------------------------------------------------------------------------
  // Acciones
  // -------------------------------------------------------------------------
  doDefend(actor) {
    actor.defending = true;
    this.menu.mode = null;
    this.message(`${actor.name} se protege.`);
    this.runSequence([
      { delay: 0.5, fn: () => this.afterAction(actor) },
    ]);
  }

  doFlee() {
    const chance = fleeChance(this.party.filter((p) => p.alive), this.aliveEnemies());
    this.menu.mode = null;
    if (Math.random() < chance) {
      G.audio?.sfx('flee');
      this.message('¡Habéis escapado!');
      this.phase = 'flee';
      this.runSequence([{ delay: 0.9, fn: () => this.finish('flee') }]);
    } else {
      G.audio?.sfx('deny');
      this.message('¡No pudisteis escapar!');
      this.runSequence([{ delay: 0.8, fn: () => this.afterAction(this.menu.actor, true) }]);
    }
  }

  performPhysical(actor, target) {
    if (!target || !target.alive) {
      this.afterAction(actor);
      return;
    }
    const isParty = !actor.isEnemy;
    this.runSequence([
      { delay: 0.1, fn: () => { this.message(`${actor.name} ataca.`, 0.6); G.audio?.sfx('slash'); } },
      {
        delay: 0.22,
        fn: () => {
          const { dmg, crit } = physicalDamage(actor, target);
          applyDamage(target, dmg);
          this.addPopup(target, crit ? `${dmg}!` : String(dmg), crit ? '#f4d58d' : '#ffffff', crit ? 1 : 1);
          target.hitT = 0.22;
          G.audio?.sfx(crit ? 'crit' : 'hit');
          G.shake = crit ? 5 : 2;
          this.slashes.push({ target, t: 0.22 });
          if (!target.alive) this.message(`${target.name} cae.`, 0.8);
          else if (target.weak && target.weak.includes('physical')) this.message('¡Golpe débil!', 0.6);
          if (isParty) G.audio?.sfx('hit');
        },
      },
      {
        delay: 0.55,
        fn: () => {
          this.checkEnemyPhase(this.enemies.find((e) => e === target));
          this.afterAction(actor);
        },
      },
    ]);
  }

  performSpell(spell, actor, target) {
    if (!spell) { this.afterAction(actor); return; }
    actor.mp = Math.max(0, actor.mp - spell.mp);
    this.menu.mode = null;
    G.audio?.sfx(spell.kind === 'heal' || spell.kind === 'revive' ? 'heal' : 'magic');

    const targets = Array.isArray(target) ? target.filter(Boolean) : [target].filter(Boolean);
    if (!targets.length) { this.afterAction(actor); return; }

    this.runSequence([
      { delay: 0.12, fn: () => this.message(`${actor.name} usa ${spell.name}.`, 0.7) },
      {
        delay: 0.3,
        fn: () => {
          this.screenFlash(spell.color || '#ffffff', 0.22);
          for (const t of targets) {
            this.spawnParticles(t, spell.color || '#ffffff', 16);
            this.applySpellTo(spell, actor, t);
          }
          G.shake = 2;
        },
      },
      {
        delay: 0.7,
        fn: () => {
          for (const t of this.enemies) this.checkEnemyPhase(t);
          this.afterAction(actor);
        },
      },
    ]);
  }

  applySpellTo(spell, actor, target) {
    if (spell.kind === 'magic' || spell.kind === 'drain') {
      if (!target.alive) return;
      if (spell.kind === 'drain' && actor.isEnemy) {
        // enemigo que drena
        const { dmg } = magicDamage(spell, actor, target);
        applyDamage(target, dmg);
        applyHeal(actor, Math.round(dmg * 0.5));
        this.addPopup(target, String(dmg), spell.color);
        if (!target.alive) this.message(`${target.name} cae.`, 0.7);
        return;
      }
      if (target.isEnemy && target.alive) {
        const weak = spell.element && target.weak && target.weak.includes(spell.element);
        const resist = spell.element && target.resist && target.resist.includes(spell.element);
        const { dmg } = magicDamage(spell, actor, target);
        applyDamage(target, dmg);
        this.addPopup(target, weak ? `${dmg}!` : String(dmg), weak ? '#ffe066' : (spell.color || '#ffffff'));
        target.hitT = 0.2;
        if (weak) this.message('¡Es eficaz!', 0.6);
        else if (resist) this.message('Apenas le afecta...', 0.6);
        if (spell.kind === 'drain') {
          const healed = applyHeal(actor, Math.round(dmg * 0.5));
          this.addPopup(actor, `+${healed}`, '#7dffa0');
        }
        if (!target.alive) this.message(`${target.name} cae.`, 0.7);
        return;
      }
      if (!target.isEnemy && target.alive) {
        const { dmg } = magicDamage(spell, actor, target);
        applyDamage(target, dmg);
        this.addPopup(target, String(dmg), spell.color || '#ff7a7a');
        if (!target.alive) this.message(`${target.name} cae.`, 0.7);
        return;
      }
    } else if (spell.kind === 'heal') {
      if (!target.alive) return;
      const amount = spell.healAll ? target.maxhp : healAmount(spell, actor);
      const healed = applyHeal(target, amount);
      this.addPopup(target, `+${healed}`, '#7dffa0');
      G.audio?.sfx('heal');
    } else if (spell.kind === 'revive') {
      if (target.alive) {
        this.message(`${target.name} ya está en pie.`, 0.7);
        return;
      }
      target.alive = true;
      target.hp = Math.max(1, Math.floor(target.maxhp * (spell.power || 0.5)));
      target.atb = 0;
      this.addPopup(target, '¡Revive!', '#fff3c4');
      this.message(`${target.name} vuelve en sí.`, 0.8);
    } else if (spell.kind === 'cure') {
      target.poison = false;
      this.addPopup(target, '¡Curado!', '#b8ffcf');
    } else if (spell.kind === 'buff') {
      target.buffs[spell.buff] = { mult: spell.mult, turns: spell.turns || 4 };
      this.addPopup(target, '↑', '#9fc4ff');
      this.message(`${target.name}: ${spell.name}.`, 0.7);
    } else if (spell.kind === 'physical') {
      if (!target.alive) return;
      const { dmg, crit } = physicalDamage(actor, target, { mult: spell.mult });
      applyDamage(target, dmg);
      this.addPopup(target, crit ? `${dmg}!` : String(dmg), spell.color || '#ffffff');
      target.hitT = 0.2;
      G.audio?.sfx(crit ? 'crit' : 'slash');
      G.shake = 3;
      this.slashes.push({ target, t: 0.22 });
      if (!target.alive) this.message(`${target.name} cae.`, 0.7);
    }
  }

  performItem(id, item, actor, target) {
    if (!item || G.countItem(id) <= 0) { this.afterAction(actor); return; }
    this.menu.mode = null;
    G.takeItem(id, 1);
    G.audio?.sfx('item');

    this.runSequence([
      { delay: 0.1, fn: () => this.message(`${actor.name} usa ${item.name}.`, 0.6) },
      {
        delay: 0.3,
        fn: () => {
          if (item.damage) {
            const targets = this.aliveEnemies();
            for (const t of targets) {
              applyDamage(t, item.damage);
              this.addPopup(t, String(item.damage), '#ff8a3d');
              this.spawnParticles(t, '#ff8a3d', 14);
              t.hitT = 0.2;
              if (!t.alive) this.message(`${t.name} cae.`, 0.6);
            }
            this.screenFlash('#ff8a3d', 0.2);
            G.audio?.sfx('magic');
          } else if (target) {
            if (item.revive && !target.alive) {
              target.alive = true;
              target.hp = Math.max(1, Math.floor(target.maxhp * item.revive));
              this.addPopup(target, '¡Revive!', '#fff3c4');
            } else if (item.heal) {
              const healed = applyHeal(target, item.heal);
              this.addPopup(target, `+${healed}`, '#7dffa0');
            } else if (item.mp) {
              target.mp = Math.min(target.maxmp, target.mp + item.mp);
              this.addPopup(target, `+${item.mp} PM`, '#9fc4ff');
            } else if (item.full) {
              target.hp = target.maxhp;
              target.mp = target.maxmp;
              this.addPopup(target, '¡Completo!', '#fff3c4');
            } else if (item.cure) {
              target.poison = false;
              this.addPopup(target, '¡Curado!', '#b8ffcf');
            }
          }
          G.audio?.sfx('heal');
        },
      },
      {
        delay: 0.6,
        fn: () => {
          for (const e of this.enemies) this.checkEnemyPhase(e);
          this.afterAction(actor);
        },
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // Turno enemigo
  // -------------------------------------------------------------------------
  enemyTurn(enemy) {
    if (!enemy.alive) { this.checkEnd(); return; }
    enemy.atb = 0;
    enemy.defending = false;
    this.checkEnemyPhase(enemy);

    const action = pickWeighted(enemy.actions || [{ type: 'attack', w: 100 }]);
    const targets = this.aliveParty();
    if (!targets.length) { this.checkEnd(); return; }
    const target = targets[Math.floor(Math.random() * targets.length)];

    this.menu.mode = null;

    if (action.type === 'attack') {
      this.runSequence([
        { delay: 0.1, fn: () => { this.message(`${enemy.name} ataca.`, 0.6); G.audio?.sfx('slash'); } },
        {
          delay: 0.25,
          fn: () => {
            const { dmg, crit } = physicalDamage(enemy, target, { mult: action.power || 1 });
            applyDamage(target, dmg);
            this.addPopup(target, crit ? `${dmg}!` : String(dmg), crit ? '#f4d58d' : '#ff9c9c');
            target.hitT = 0.2;
            G.audio?.sfx('hit');
            G.shake = crit ? 5 : 3;
            if (action.poison && target.alive) {
              target.poison = true;
              this.message(`${target.name} está envenenado.`, 0.9);
            }
            if (!target.alive) this.message(`${target.name} cae.`, 0.8);
          },
        },
        { delay: 0.6, fn: () => this.afterAction(enemy) },
      ]);
      return;
    }

    if (action.type === 'spell') {
      const spell = SPELLS[action.id];
      if (!spell) { this.afterAction(enemy); return; }
      const spellTargets = spell.target === 'allEnemies' ? targets : [target];
      this.runSequence([
        { delay: 0.1, fn: () => { this.message(`${enemy.name} usa ${spell.name}.`, 0.6); G.audio?.sfx('magic'); } },
        {
          delay: 0.35,
          fn: () => {
            this.screenFlash(spell.color || '#ffffff', 0.18);
            for (const t of spellTargets) {
              this.spawnParticles(t, spell.color || '#ffffff', 10);
              this.applySpellTo(spell, enemy, t);
            }
          },
        },
        { delay: 0.6, fn: () => this.afterAction(enemy) },
      ]);
      return;
    }

    if (action.type === 'buff') {
      enemy.buffs[action.buff] = { mult: action.mult, turns: action.turns || 3 };
      this.runSequence([
        { delay: 0.2, fn: () => { this.message(`${enemy.name} se enfurece.`, 0.8); this.addPopup(enemy, '↑', '#ff9c7a'); } },
        { delay: 0.5, fn: () => this.afterAction(enemy) },
      ]);
    }
  }

  // -------------------------------------------------------------------------
  // Fin de acción / comprobaciones
  // -------------------------------------------------------------------------
  afterAction(actor, force = false) {
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'flee') return;
    tickBuffs(actor);
    actor.atb = 0;
    this.checkEnd();
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.phase = 'idle';
    this.menu.mode = null;
  }

  checkEnemyPhase(enemy) {
    if (!enemy || !enemy.alive || !enemy.phase2 || enemy.phase >= 2) return;
    if (enemy.hp <= enemy.maxhp * enemy.phase2.at) {
      enemy.phase = 2;
      enemy.hp = Math.max(enemy.hp, Math.round(enemy.maxhp * (enemy.phase2.healTo || 0.5)));
      enemy.atk = enemy.phase2.atk ?? enemy.atk;
      enemy.mag = enemy.phase2.mag ?? enemy.mag;
      enemy.spd = enemy.phase2.spd ?? enemy.spd;
      enemy.actions = enemy.phase2.actions || enemy.actions;
      this.screenFlash('#b18cff', 0.6);
      G.audio?.sfx('boss');
      G.shake = 8;
      this.message(enemy.phase2.message || '¡El enemigo se transforma!', 2);
    }
  }

  checkEnd() {
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'flee') return;
    if (this.enemies.every((e) => !e.alive)) {
      this.victory();
      return;
    }
    if (this.party.every((p) => !p.alive)) {
      this.defeat();
    }
  }

  syncParty() {
    for (const unit of this.party) {
      unit.ref.hp = Math.max(0, unit.hp);
      unit.ref.mp = Math.max(0, unit.mp);
    }
  }

  victory() {
    this.phase = 'victory';
    this.menu.mode = null;
    this.syncParty();
    G.audio?.playMusic('victory');
    G.audio?.sfx('levelup');

    const exp = expFor(this.enemies);
    const gil = gilFor(this.enemies);
    G.addGold(gil);
    const drops = [];
    for (const e of this.enemies) {
      for (const d of e.drops || []) {
        if (Math.random() < (d.p || 0.2)) {
          G.giveItem(d.item, 1);
          drops.push(ITEMS[d.item]?.name || d.item);
        }
      }
    }

    const levelUps = [];
    for (const member of G.party) {
      const beforeSpells = learnedSpells(member);
      const res = grantExp(member, exp);
      if (res.levels.length) {
        levelUps.push(`${member.name} alcanza el nivel ${res.to}.`);
        const afterSpells = learnedSpells(member);
        for (const spellId of afterSpells) {
          if (!beforeSpells.includes(spellId)) {
            levelUps.push(`${member.name} aprende ${SPELLS[spellId]?.name || spellId}.`);
          }
        }
      }
    }
    this.syncParty();

    this.victoryData = {
      exp,
      gil,
      drops,
      levelUps,
      t: 0,
    };
    this.log = [];
    this.message('¡Victoria!', 1.2);
  }

  defeat() {
    this.phase = 'defeat';
    this.defeatT = 2.2;
    this.syncParty();
    this.menu.mode = null;
    G.audio?.stopMusic();
    G.audio?.playMusic('gameover');
    G.audio?.sfx('death');
    this.message('El grupo ha caído...', 2.5);
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.syncParty();
    this.onDone?.(result);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------
  draw(ctx) {
    this.drawBackground(ctx);

    // Enemigos
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const intro = this.phase === 'intro' ? 1 - Math.max(0, this.introT / 0.5) : 1;
      ctx.save();
      ctx.globalAlpha = intro;
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - 1, Math.min(18, 10 + e.maxhp / 80), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      drawEnemy(ctx, e.sprite || e.id, e.x, e.y, e.hitT > 0);
      ctx.restore();
      if (e.hitT > 0) {
        // destello extra
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x - 14, e.y - 30, 28, 30);
        ctx.restore();
      }
    }

    // Efectos
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const s of this.slashes) {
      const t = s.target;
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.t / 0.22);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      const x = t.isEnemy ? t.x : 160;
      const y = t.isEnemy ? t.y - 18 : PANEL_Y - 4;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 12);
      ctx.lineTo(x + 14, y + 12);
      ctx.moveTo(x + 14, y - 12);
      ctx.lineTo(x - 16, y + 12);
      ctx.stroke();
      ctx.restore();
    }

    // Objetivo seleccionado
    if (this.menu.mode === 'target') {
      const list = this.menu.pending?.targets || [];
      const target = list[this.menu.targetIndex];
      if (target && target.isEnemy) {
        const bob = Math.sin(this.time * 8) * 2;
        drawCursor(ctx, target.x - 3, target.y - 50 + bob, this.time, '#ffe066');
        drawText(ctx, target.name, target.x, target.y - 56 + bob, {
          color: '#ffe9a8', align: 'center', shadow: '#000000',
        });
      }
    }

    // Daños
    for (const p of this.popups) {
      const alpha = Math.max(0, 1 - (p.t / p.life) ** 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawText(ctx, p.text, p.x, p.y, { color: p.color, align: 'center', shadow: '#000000' });
      ctx.restore();
    }

    if (this.opts.debugHud) {
      drawText(ctx, `${this.phase} t=${this.introT.toFixed(2)} p=${this.party.length} e=${this.enemies.length}`, 4, 2, {
        color: '#00ff00', shadow: '#000000',
      });
    }

    if (this.phase === 'intro') {
      ctx.fillStyle = `rgba(255,255,255,${(this.flash).toFixed(3)})`;
      ctx.fillRect(0, 0, 320, 240);
      return;
    }

    this.drawPartyPanel(ctx);
    this.drawMenuPanel(ctx);
    this.drawLog(ctx);

    if (this.opts.boss && this.enemies[0]) {
      drawText(ctx, this.enemies[0].name, 160, 20, { color: '#f4d58d', align: 'center', shadow: '#000000' });
    }

    if (this.phase === 'victory') this.drawVictory(ctx);
    if (this.phase === 'defeat') this.drawDefeat(ctx);

    if (this.opts.debugHud) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 148, 320, 2);
    }

    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, 320, 240);
      ctx.restore();
    }
  }

  drawBackground(ctx) {
    const kind = this.bgKind;
    if (kind === 'cave') {
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, '#120a20');
      grad.addColorStop(0.6, '#241636');
      grad.addColorStop(1, '#0a0612');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);
      // estalactitas
      ctx.fillStyle = '#1a1028';
      for (let i = 0; i < 10; i++) {
        const x = i * 36 + 8;
        poly(ctx, [[x, 0], [x + 10, 0], [x + 5, 30 + (i % 3) * 16]], '#1e1330');
      }
      ctx.fillStyle = '#2a1c40';
      ctx.fillRect(0, 142, 320, 98);
      ctx.fillStyle = '#1d1230';
      for (let y = 146; y < 240; y += 12) {
        ctx.fillRect(0, y, 320, 1);
      }
      // brillos
      for (let i = 0; i < 14; i++) {
        const x = (i * 53 + 20) % 320;
        const y = 30 + ((i * 37) % 100);
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(this.time * 2 + i);
        ctx.fillStyle = i % 2 ? '#7fe3ff' : '#b18cff';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (kind === 'sanctum') {
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, '#120a28');
      grad.addColorStop(0.5, '#2a1a4a');
      grad.addColorStop(1, '#0c0718');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 320, 240);

      // Halo central
      const glow = ctx.createRadialGradient(160, 116, 6, 160, 130, 150);
      glow.addColorStop(0, 'rgba(150, 110, 255, 0.35)');
      glow.addColorStop(0.5, 'rgba(110, 70, 200, 0.12)');
      glow.addColorStop(1, 'rgba(60, 30, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 320, 240);

      // Columnas
      for (const x of [24, 76, 244, 296]) {
        ctx.fillStyle = '#332350';
        ctx.fillRect(x - 10, 14, 20, 136);
        ctx.fillStyle = '#4a356e';
        ctx.fillRect(x - 7, 18, 4, 128);
        ctx.fillStyle = '#241738';
        ctx.fillRect(x + 5, 18, 3, 128);
        ctx.fillStyle = '#5a4280';
        ctx.fillRect(x - 14, 10, 28, 6);
        ctx.fillRect(x - 14, 146, 28, 6);
        ctx.fillStyle = '#1e1330';
        ctx.fillRect(x - 12, 16, 24, 2);
      }

      // Runas flotantes
      for (let i = 0; i < 16; i++) {
        const x = (i * 61 + 15) % 320;
        const y = 26 + ((i * 41) % 110) + Math.sin(this.time * 1.2 + i) * 3;
        ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(this.time * 1.5 + i));
        ctx.fillStyle = i % 3 === 0 ? '#ffe9a8' : '#b18cff';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Suelo de piedra
      ctx.fillStyle = '#241738';
      ctx.fillRect(0, 146, 320, 94);
      ctx.fillStyle = '#2e1f46';
      for (let y = 150; y < 240; y += 10) {
        for (let x = (y % 20) ? 0 : 10; x < 320; x += 20) {
          ctx.fillRect(x, y, 18, 1);
          ctx.fillRect(x, y, 1, 8);
        }
      }
      // Círculo ritual
      ctx.save();
      ctx.strokeStyle = 'rgba(177, 140, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(160, 206, 92, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(127, 227, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(160, 206, 70, 19, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Cielo diurno
    const grad = ctx.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, '#3a6ac8');
    grad.addColorStop(0.55, '#7fb0e8');
    grad.addColorStop(1, '#c8e0f8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 150);

    // Nubes
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const cloudShift = (this.time * 6) % 360;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 110 + cloudShift) % 380) - 30;
      const y = 22 + (i % 2) * 18;
      ctx.fillRect(x, y, 34, 5);
      ctx.fillRect(x + 8, y - 4, 20, 4);
      ctx.fillRect(x + 14, y + 4, 24, 3);
    }

    // Montañas lejanas
    poly(ctx, [[-10, 150], [50, 86], [110, 150]], '#5a7a9a');
    poly(ctx, [[70, 150], [130, 70], [200, 150]], '#4a6a8a');
    poly(ctx, [[160, 150], [222, 92], [290, 150]], '#5a7a9a');
    poly(ctx, [[250, 150], [305, 78], [340, 150]], '#4a6a8a');
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(128, 74, 8, 6);
    ctx.fillRect(302, 82, 7, 5);

    // Suelo
    ctx.fillStyle = '#4e8a3a';
    ctx.fillRect(0, 142, 320, 98);
    ctx.fillStyle = '#3f7430';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect((i * 37) % 320, 150 + ((i * 13) % 70), 18, 2);
    }
    ctx.fillStyle = '#5a9a44';
    ctx.fillRect(0, 142, 320, 4);
  }

  drawPartyPanel(ctx) {
    drawWindow(ctx, 3, PANEL_Y, 170, 90);
    for (let i = 0; i < 4; i++) {
      const unit = this.party[i];
      const y = PANEL_Y + 4 + i * 22;
      if (!unit) continue;
      const dead = !unit.alive;
      const selected = this.menu.mode === 'target'
        && this.menu.pending?.targets?.[this.menu.targetIndex] === unit;
      drawText(ctx, unit.name, 10, y, { color: dead ? '#8a6a7a' : (selected ? '#ffe9a8' : '#ffffff') });
      if (dead) {
        drawText(ctx, 'K.O.', 164, y, { color: '#e8455e', align: 'right' });
      } else {
        drawText(ctx, `${unit.hp}/${unit.maxhp}`, 124, y, { color: hpColor(unit.hp / unit.maxhp), align: 'right' });
        drawText(ctx, `${unit.mp}/${unit.maxmp}`, 164, y, { color: '#9fc4ff', align: 'right' });
        drawStatBar(ctx, 10, y + 9, 154, unit.hp / unit.maxhp, hpColor(unit.hp / unit.maxhp));
        const atb = Math.min(1, unit.atb);
        ctx.fillStyle = '#0a0e1e';
        ctx.fillRect(10, y + 15, 154, 2);
        ctx.fillStyle = atb >= 1 ? '#ffe066' : '#5b8cff';
        ctx.fillRect(10, y + 15, Math.round(154 * atb), 2);
      }
      if (selected) drawCursor(ctx, 0, y - 1, this.time, '#ffe066');
    }
  }

  drawMenuPanel(ctx) {
    const x = 176;
    drawWindow(ctx, x, PANEL_Y, 141, 90);
    const menu = this.menu;
    const actor = menu.actor;

    if (!menu.mode || !actor) {
      drawText(ctx, '...', x + 12, PANEL_Y + 10, { color: '#8a93b8' });
      const ready = this.party.find((p) => p.alive && p.atb >= 1);
      if (ready) drawText(ctx, ready.name, x + 12, PANEL_Y + 24, { color: '#c8d0ee' });
      return;
    }

    drawText(ctx, actor.name, x + 10, PANEL_Y + 6, { color: '#f4d58d', shadow: '#000000' });

    if (menu.mode === 'command') {
      const options = this.commandOptions(actor);
      options.forEach((opt, i) => {
        const y = PANEL_Y + 20 + i * 13;
        if (i === menu.index) drawCursor(ctx, x + 10, y - 1, this.time);
        drawText(ctx, opt.label, x + 22, y, {
          color: opt.disabled ? '#5a6184' : i === menu.index ? '#ffe9a8' : '#ffffff',
        });
      });
      return;
    }

    if (menu.mode === 'magic') {
      const spells = this.spellList(actor);
      const visible = 5;
      const start = Math.max(0, Math.min(menu.index - visible + 1, spells.length - visible));
      for (let i = start; i < Math.min(spells.length, start + visible); i++) {
        const sp = spells[i];
        const y = PANEL_Y + 20 + (i - start) * 13;
        if (i === menu.index) drawCursor(ctx, x + 10, y - 1, this.time);
        drawText(ctx, sp.label, x + 22, y, { color: sp.disabled ? '#5a6184' : i === menu.index ? '#ffe9a8' : '#ffffff' });
        drawText(ctx, sp.right, x + 132, y, { color: sp.disabled ? '#5a6184' : '#9fc4ff', align: 'right' });
      }
      return;
    }

    if (menu.mode === 'item') {
      const items = this.itemList();
      const visible = 5;
      const start = Math.max(0, Math.min(menu.index - visible + 1, items.length - visible));
      for (let i = start; i < Math.min(items.length, start + visible); i++) {
        const it = items[i];
        const y = PANEL_Y + 20 + (i - start) * 13;
        if (i === menu.index) drawCursor(ctx, x + 10, y - 1, this.time);
        drawText(ctx, it.label, x + 22, y, { color: i === menu.index ? '#ffe9a8' : '#ffffff' });
        drawText(ctx, it.right, x + 132, y, { color: '#c8d0ee', align: 'right' });
      }
      if (!items.length) drawText(ctx, 'Nada útil.', x + 22, PANEL_Y + 20, { color: '#8a93b8' });
      return;
    }

    if (menu.mode === 'target') {
      const list = menu.pending?.targets || [];
      const target = list[menu.targetIndex];
      drawText(ctx, 'Objetivo', x + 10, PANEL_Y + 20, { color: '#8fa2ff' });
      drawText(ctx, target ? target.name : '—', x + 10, PANEL_Y + 34, { color: '#ffffff' });
      if (target && !target.isEnemy) {
        drawText(ctx, `${target.hp}/${target.maxhp}`, x + 10, PANEL_Y + 48, { color: hpColor(target.hp / target.maxhp) });
      }
      drawText(ctx, 'Z: ok  X: atrás', x + 10, PANEL_Y + 68, { color: '#8a93b8' });
    }
  }

  drawLog(ctx) {
    for (let i = 0; i < this.log.length; i++) {
      const text = this.log[this.log.length - 1 - i];
      const y = 8 + i * 11;
      if (i > 1) break;
      drawText(ctx, text, 160, y, { color: '#ffffff', align: 'center', shadow: '#000000' });
    }
  }

  drawVictory(ctx) {
    ctx.fillStyle = 'rgba(4, 6, 20, 0.55)';
    ctx.fillRect(0, 0, 320, 240);
    drawWindow(ctx, 42, 36, 236, 156);
    drawText(ctx, '¡Victoria!', 160, 46, { color: '#f4d58d', align: 'center' });
    drawText(ctx, `EXP ${this.victoryData.exp}`, 58, 70, { color: '#ffffff' });
    drawText(ctx, `Oro ${this.victoryData.gil}`, 238, 70, { color: '#f4d58d', align: 'right' });
    let y = 88;
    for (const line of this.victoryData.levelUps.slice(0, 3)) {
      drawText(ctx, line, 58, y, { color: '#7dffa0' });
      y += 12;
    }
    if (this.victoryData.drops.length) {
      drawText(ctx, `Botín: ${this.victoryData.drops.join(', ')}`, 58, y, { color: '#9fc4ff' });
      y += 12;
    }
    drawText(ctx, 'Z para continuar', 160, 178, { color: '#c8d0ee', align: 'center' });
  }

  drawDefeat(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 320, 240);
    drawText(ctx, 'El grupo ha caído...', 160, 110, { color: '#e8455e', align: 'center' });
  }
}

function pendingBackMode(pending) {
  return pending && pending.type === 'spell' ? 'magic' : pending && pending.type === 'item' ? 'item' : 'command';
}
