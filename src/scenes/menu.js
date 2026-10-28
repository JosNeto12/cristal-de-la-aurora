// Menú de campo estilo FF: objetos, magia, equipo, estado y guardado.

import { G, formatPlaytime } from '../core/state.js';
import { ITEMS } from '../data/items.js';
import { SPELLS } from '../data/spells.js';
import { CHARACTERS, statsOf, learnedSpells, canEquip, expForLevel, nextSpell } from '../data/characters.js';
import { saveGame } from '../core/save.js';
import { drawWindow, drawText, drawCursor, drawStatBar, hpColor } from '../gfx/ui.js';

const W = 320;

const COMMAND_DESC = {
  Objetos: 'Usa pociones, éteres y otros consumibles.',
  Magia: 'Conjuros de curación y apoyo fuera de combate.',
  Equipo: 'Cambia armas y armaduras de cada héroe.',
  Estado: 'Consulta estadísticas, magia y biografía.',
  Guardar: 'Guarda la partida en el cartucho.',
  Salir: 'Cierra el menú y vuelve al camino.',
};

export class MenuScene {
  constructor(field) {
    this.field = field;
    this.mode = 'root';
    this.index = 0;
    this.memberIndex = 0;
    this.list = [];
    this.title = '';
    this.message = '';
    this.messageT = 0;
    this.confirmSave = 0;
    this.targets = null;
    this.pendingUse = null;
    this.slotIndex = 0;
    this.equipMember = null;
    this.time = 0;
    this.title = '';
    this.listReturn = 'root';
    this.rootItems = ['Objetos', 'Magia', 'Equipo', 'Estado', 'Guardar', 'Salir'];
  }

  close() {
    G.scenes.pop();
  }

  say(msg) {
    this.message = msg;
    this.messageT = 3;
  }

  // -------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    if (this.messageT > 0) this.messageT -= dt;
    const input = G.input;

    if (this.mode === 'root') {
      this.nav(this.rootItems.length);
      if (input.pressed('ok')) {
        G.audio?.sfx('ok');
        this.openCommand(this.rootItems[this.index]);
      }
      if (input.pressed('cancel') || input.pressed('menu')) this.close();
      return;
    }

    if (this.mode === 'save') {
      if (input.pressed('left') || input.pressed('right') || input.pressed('up') || input.pressed('down')) {
        this.confirmSave = 1 - this.confirmSave;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('ok')) {
        if (this.confirmSave === 0) {
          const ok = saveGame();
          G.audio?.sfx(ok ? 'save' : 'deny');
          this.say(ok ? 'Partida guardada en el cartucho.' : 'No se pudo guardar. El almacenamiento está bloqueado.');
        }
        this.mode = 'root';
      }
      if (input.pressed('cancel')) { G.audio?.sfx('cancel'); this.mode = 'root'; }
      return;
    }

    if (this.mode === 'list') {
      this.nav(this.list.length);
      if (input.pressed('ok')) {
        const entry = this.list[this.index];
        if (entry && !entry.disabled) {
          G.audio?.sfx('ok');
          entry.action();
        } else {
          G.audio?.sfx('deny');
        }
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        if (this.listReturn === 'equipSlots') this.mode = 'equipSlots';
        else this.toRoot();
      }
      return;
    }

    if (this.mode === 'target') {
      this.nav(this.targets.length);
      if (input.pressed('ok')) {
        const target = this.targets[this.index];
        if (!target || target.disabled) { G.audio?.sfx('deny'); return; }
        G.audio?.sfx('ok');
        const fn = this.pendingUse;
        this.pendingUse = null;
        this.mode = 'list';
        fn(target.member);
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        this.pendingUse = null;
        this.mode = 'list';
      }
      return;
    }

    if (this.mode === 'equipSlots') {
      this.nav(2);
      if (input.pressed('ok')) {
        G.audio?.sfx('ok');
        this.openEquipList(this.index === 0 ? 'weapon' : 'armor');
      }
      if (input.pressed('cancel')) {
        G.audio?.sfx('cancel');
        this.openEquipMembers();
      }
      return;
    }

    if (this.mode === 'status') {
      if (input.pressed('left')) {
        this.index = (this.index + G.party.length - 1) % G.party.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('right')) {
        this.index = (this.index + 1) % G.party.length;
        G.audio?.sfx('cursor');
      }
      if (input.pressed('cancel') || input.pressed('ok')) {
        G.audio?.sfx('cancel');
        this.openStatusList();
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

  toRoot() {
    this.mode = 'root';
    this.index = 0;
  }

  openCommand(cmd) {
    if (cmd === 'Objetos') this.openItems();
    else if (cmd === 'Magia') this.openMagic();
    else if (cmd === 'Equipo') this.openEquipMembers();
    else if (cmd === 'Estado') this.openStatusList();
    else if (cmd === 'Guardar') { this.mode = 'save'; this.confirmSave = 0; }
    else this.close();
  }

  // -------------------------------------------------------------------------
  // Objetos
  // -------------------------------------------------------------------------
  openItems() {
    this.mode = 'list';
    this.title = 'Objetos';
    this.listReturn = 'root';
    this.index = 0;
    const ids = G.itemList(['consumable', 'key']);
    this.list = ids.map((id) => {
      const item = ITEMS[id];
      const isKey = item.kind === 'key';
      return {
        label: item.name,
        right: isKey ? 'clave' : `x${G.countItem(id)}`,
        desc: item.desc,
        data: id,
        action: () => this.useItem(id),
      };
    });
    if (!this.list.length) {
      this.list = [{ label: 'No hay objetos.', disabled: true, desc: '', action: () => {} }];
    }
  }

  useItem(id) {
    const item = ITEMS[id];
    if (!item) return;
    if (item.kind === 'key') { this.say(item.desc || 'Es un objeto importante.'); return; }
    if (item.kind !== 'consumable') { this.say('No se puede usar aquí.'); return; }
    if (item.damage) { this.say('Solo se puede usar en combate.'); return; }

    const needsTarget = !!(item.heal || item.mp || item.revive || item.cure || item.full);
    if (!needsTarget) { this.say('No ocurre nada.'); return; }

    this.targets = G.party.map((m) => {
      let disabled = false;
      if (item.revive) disabled = m.hp > 0;
      else if (item.cure) disabled = m.hp <= 0;
      else disabled = m.hp <= 0;
      return { member: m, label: m.name, disabled };
    });
    this.pendingUse = (member) => this.applyItem(id, member);
    this.mode = 'target';
    this.index = Math.max(0, this.targets.findIndex((t) => !t.disabled));
  }

  applyItem(id, member) {
    const item = ITEMS[id];
    const stats = statsOf(member);
    let msg = '';
    if (item.revive && member.hp <= 0) {
      member.hp = Math.max(1, Math.floor(stats.maxhp * (item.revive || 0.5)));
      msg = `${member.name} vuelve en sí.`;
    } else if (item.heal) {
      const before = member.hp;
      member.hp = Math.min(stats.maxhp, member.hp + item.heal);
      msg = `${member.name} recupera ${member.hp - before} PV.`;
    } else if (item.mp) {
      const before = member.mp;
      member.mp = Math.min(stats.maxmp, member.mp + item.mp);
      msg = `${member.name} recupera ${member.mp - before} PM.`;
    } else if (item.full) {
      member.hp = stats.maxhp;
      member.mp = stats.maxmp;
      msg = `${member.name} recupera todo.`;
    } else if (item.cure) {
      msg = `${member.name} se siente mejor.`;
    }
    G.takeItem(id);
    G.audio?.sfx('heal');
    this.say(msg);
    this.openItems();
  }

  // -------------------------------------------------------------------------
  // Magia
  // -------------------------------------------------------------------------
  openMagic() {
    this.mode = 'list';
    this.title = 'Magia';
    this.listReturn = 'root';
    this.index = 0;
    this.list = [];
    for (const member of G.party) {
      if (member.hp <= 0) continue;
      for (const spellId of learnedSpells(member)) {
        const spell = SPELLS[spellId];
        if (!spell) continue;
        if (spell.kind === 'magic' || spell.kind === 'drain' || spell.kind === 'physical') continue;
        const usable = member.mp >= spell.mp;
        this.list.push({
          label: `${member.name}: ${spell.name}`,
          right: `${spell.mp} PM`,
          desc: spell.desc,
          disabled: !usable,
          action: () => this.castField(spellId, member),
        });
      }
    }
    if (!this.list.length) {
      this.list = [{ label: 'No hay magia útil fuera de combate.', disabled: true, desc: '', action: () => {} }];
    }
  }

  castField(spellId, member) {
    const spell = SPELLS[spellId];
    if (!spell || member.mp < spell.mp) { this.say('No hay PM suficientes.'); return; }
    const stats = statsOf(member);
    const apply = (target) => {
      if (spell.kind === 'heal') {
        const amount = spell.healAll ? statsOf(target).maxhp : Math.round(spell.power * 1.2 + stats.mag * 1.5);
        const before = target.hp;
        target.hp = Math.min(statsOf(target).maxhp, target.hp + amount);
        this.say(`${target.name} recupera ${target.hp - before} PV.`);
      } else if (spell.kind === 'revive') {
        target.hp = Math.max(1, Math.floor(statsOf(target).maxhp * (spell.power || 0.5)));
        this.say(`${target.name} vuelve en sí.`);
      } else if (spell.kind === 'buff') {
        this.say(`${target.name} se siente más fuerte.`);
      } else if (spell.kind === 'cure') {
        this.say(`${target.name} se siente mejor.`);
      }
      G.audio?.sfx('heal');
    };

    const finish = () => {
      member.mp = Math.max(0, member.mp - spell.mp);
      this.openMagic();
    };

    if (spell.target === 'ally' || spell.target === 'deadAlly') {
      this.targets = G.party.map((m) => ({
        member: m,
        label: m.name,
        disabled: spell.target === 'deadAlly' ? m.hp > 0 : m.hp <= 0,
      }));
      this.pendingUse = (m) => { this.mode = 'list'; apply(m); finish(); };
      this.mode = 'target';
      this.index = Math.max(0, this.targets.findIndex((t) => !t.disabled));
    } else if (spell.target === 'allAllies') {
      for (const m of G.party) if (m.hp > 0) apply(m);
      finish();
    } else {
      apply(member);
      finish();
    }
  }

  // -------------------------------------------------------------------------
  // Equipo
  // -------------------------------------------------------------------------
  openEquipMembers() {
    this.mode = 'list';
    this.title = 'Equipo — ¿Quién?';
    this.listReturn = 'root';
    this.index = 0;
    this.list = G.party.map((m) => ({
      label: m.name,
      right: CHARACTERS[m.id]?.job || '',
      desc: `Nivel ${m.lvl} · ${CHARACTERS[m.id]?.job || ''}`,
      action: () => {
        this.equipMember = m;
        this.mode = 'equipSlots';
        this.index = 0;
      },
    }));
  }

  openEquipList(slot) {
    const m = this.equipMember;
    this.mode = 'list';
    this.title = slot === 'weapon' ? 'Arma' : 'Armadura';
    this.listReturn = 'equipSlots';
    this.index = 0;
    const ids = Object.keys(G.inventory).filter((id) => {
      const it = ITEMS[id];
      return it && it.kind === slot && canEquip(m, id) && G.countItem(id) > 0;
    });
    this.list = ids.map((id) => {
      const it = ITEMS[id];
      const bonus = ['atk', 'def', 'mag', 'mdef', 'spd']
        .filter((k) => it[k])
        .map((k) => `${k.toUpperCase()}+${it[k]}`)
        .join(' ');
      return {
        label: it.name,
        right: bonus,
        desc: it.desc,
        action: () => {
          this.equip(m, id, slot);
          this.mode = 'equipSlots';
          this.index = 0;
        },
      };
    });
    this.list.push({
      label: '(Quitar)',
      right: '',
      desc: 'Deja el hueco vacío.',
      action: () => {
        this.unequip(m, slot);
        this.mode = 'equipSlots';
        this.index = 0;
      },
    });
    if (!ids.length) {
      this.list.unshift({ label: 'No tienes equipo compatible.', disabled: true, desc: '', action: () => {} });
    }
  }

  equip(member, itemId, slot) {
    const item = ITEMS[itemId];
    if (!item) return;
    G.takeItem(itemId);
    const old = member[slot];
    if (old) G.giveItem(old);
    member[slot] = itemId;
    const stats = statsOf(member);
    member.hp = Math.min(member.hp, stats.maxhp);
    member.mp = Math.min(member.mp, stats.maxmp);
    G.audio?.sfx('ok');
    this.say(`${member.name} equipa ${item.name}.`);
  }

  unequip(member, slot) {
    const old = member[slot];
    if (!old) { this.say('No hay nada equipado.'); return; }
    G.giveItem(old);
    member[slot] = null;
    G.audio?.sfx('ok');
    this.say(`${ITEMS[old].name} guardado.`);
  }

  // -------------------------------------------------------------------------
  // Estado
  // -------------------------------------------------------------------------
  openStatusList() {
    this.mode = 'list';
    this.title = 'Estado';
    this.listReturn = 'root';
    this.index = 0;
    this.list = G.party.map((m, i) => ({
      label: m.name,
      right: `Nv ${m.lvl}`,
      desc: CHARACTERS[m.id]?.job || '',
      action: () => {
        this.mode = 'status';
        this.index = i;
      },
    }));
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------
  draw(ctx) {
    if (this.field) {
      this.field.draw(ctx);
      ctx.fillStyle = 'rgba(4, 6, 20, 0.62)';
      ctx.fillRect(0, 0, W, 240);
    } else {
      ctx.fillStyle = '#080a14';
      ctx.fillRect(0, 0, 320, 240);
    }

    if (this.mode === 'root') this.drawRoot(ctx);
    else if (this.mode === 'list') this.drawListMode(ctx);
    else if (this.mode === 'target') this.drawTarget(ctx);
    else if (this.mode === 'save') this.drawSave(ctx);
    else if (this.mode === 'equipSlots') this.drawEquipSlots(ctx);
    else if (this.mode === 'status') this.drawStatus(ctx);

    if (this.messageT > 0 && this.message) {
      drawWindow(ctx, 24, 196, 272, 22, { alpha: 0.95 });
      drawText(ctx, this.message, 160, 202, { color: '#f4d58d', align: 'center' });
    }
  }

  drawRoot(ctx) {
    // Panel del grupo
    drawWindow(ctx, 6, 6, 160, 186);
    G.party.forEach((m, i) => {
      const y = 16 + i * 42;
      const stats = statsOf(m);
      const isDead = m.hp <= 0;
      drawText(ctx, m.name, 18, y, { color: isDead ? '#8a6a7a' : '#ffffff' });
      drawText(ctx, `Nv ${m.lvl}`, 138, y, { color: '#c8d0ee', align: 'right' });
      drawText(ctx, 'PV', 18, y + 11, { color: '#8a93b8' });
      drawText(ctx, `${m.hp}/${stats.maxhp}`, 138, y + 11, { color: hpColor(m.hp / stats.maxhp), align: 'right' });
      drawStatBar(ctx, 18, y + 19, 112, m.hp / stats.maxhp, hpColor(m.hp / stats.maxhp));
      drawText(ctx, 'PM', 18, y + 25, { color: '#8a93b8' });
      drawText(ctx, `${m.mp}/${stats.maxmp}`, 138, y + 25, { color: '#9fc4ff', align: 'right' });
      if (isDead) drawText(ctx, 'K.O.', 138, y + 11, { color: '#e8455e', align: 'right' });
    });

    // Comandos
    drawWindow(ctx, 172, 6, 142, 186);
    this.rootItems.forEach((item, i) => {
      const y = 18 + i * 28;
      if (i === this.index) drawCursor(ctx, 180, y - 1, this.time);
      drawText(ctx, item, 192, y, { color: i === this.index ? '#ffe9a8' : '#ffffff' });
    });

    // Pie
    drawWindow(ctx, 6, 198, 308, 34);
    drawText(ctx, `${G.gold} de oro`, 18, 206, { color: '#f4d58d' });
    drawText(ctx, `Tiempo ${formatPlaytime(G.playtime)}`, 306, 206, { color: '#c8d0ee', align: 'right' });
    drawText(ctx, COMMAND_DESC[this.rootItems[this.index]] || '', 18, 218, { color: '#a8b2d8' });
  }

  drawListMode(ctx) {
    drawWindow(ctx, 6, 6, 222, 186);
    drawText(ctx, this.title, 18, 14, { color: '#f4d58d' });
    const visible = 11;
    const scroll = Math.max(0, Math.min(this.index - visible + 1, this.list.length - visible));
    const start = Math.max(0, scroll);
    for (let i = start; i < Math.min(this.list.length, start + visible); i++) {
      const entry = this.list[i];
      const y = 28 + (i - start) * 14;
      if (i === this.index) drawCursor(ctx, 18, y - 1, this.time);
      drawText(ctx, entry.label, 30, y, { color: entry.disabled ? '#6a7194' : (i === this.index ? '#ffe9a8' : '#ffffff') });
      if (entry.right) {
        drawText(ctx, entry.right, 216, y, { color: entry.disabled ? '#6a7194' : '#c8d0ee', align: 'right' });
      }
    }

    const entry = this.list[this.index];
    drawWindow(ctx, 232, 6, 82, 186);
    drawText(ctx, 'Detalle', 244, 14, { color: '#8fa2ff' });
    if (entry && entry.desc) {
      drawText(ctx, entry.desc, 240, 28, { color: '#dfe6ff', maxWidth: 68, wrap: true, lineHeight: 10 });
    }
    drawWindow(ctx, 6, 198, 308, 34);
    drawText(ctx, 'Z: elegir   X: volver', 160, 210, { color: '#8a93b8', align: 'center' });
  }

  drawTarget(ctx) {
    drawWindow(ctx, 60, 52, 200, 136);
    drawText(ctx, '¿Sobre quién?', 160, 62, { color: '#f4d58d', align: 'center' });
    this.targets.forEach((t, i) => {
      const y = 82 + i * 18;
      if (i === this.index) drawCursor(ctx, 84, y - 1, this.time);
      drawText(ctx, t.label, 96, y, { color: t.disabled ? '#6a7194' : (i === this.index ? '#ffe9a8' : '#ffffff') });
      const stats = statsOf(t.member);
      drawText(ctx, `${t.member.hp}/${stats.maxhp}`, 246, y, { color: t.disabled ? '#6a7194' : '#c8d0ee', align: 'right' });
    });
  }

  drawSave(ctx) {
    drawWindow(ctx, 70, 78, 180, 70);
    drawText(ctx, '¿Guardar la partida?', 160, 90, { color: '#ffffff', align: 'center' });
    drawText(ctx, 'Se sobrescribirá la ranura.', 160, 104, { color: '#8a93b8', align: 'center' });
    const opts = ['Sí', 'No'];
    opts.forEach((o, i) => {
      const x = 110 + i * 70;
      if (i === this.confirmSave) drawCursor(ctx, x - 9, 122, this.time);
      drawText(ctx, o, x, 122, { color: i === this.confirmSave ? '#ffe9a8' : '#ffffff' });
    });
  }

  drawEquipSlots(ctx) {
    const m = this.equipMember;
    drawWindow(ctx, 6, 6, 308, 186);
    drawText(ctx, `Equipo de ${m.name}`, 18, 14, { color: '#f4d58d' });
    const rows = [
      { label: 'Arma', item: ITEMS[m.weapon] },
      { label: 'Armadura', item: ITEMS[m.armor] },
    ];
    rows.forEach((row, i) => {
      const y = 44 + i * 34;
      if (i === this.index) drawCursor(ctx, 26, y - 1, this.time);
      drawText(ctx, row.label, 38, y, { color: i === this.index ? '#ffe9a8' : '#ffffff' });
      drawText(ctx, row.item ? row.item.name : '—', 110, y, { color: '#c8d0ee' });
      if (row.item) {
        const bonus = ['atk', 'def', 'mag', 'mdef', 'spd']
          .filter((k) => row.item[k]).map((k) => `${k.toUpperCase()}+${row.item[k]}`).join(' ');
        drawText(ctx, bonus, 300, y, { color: '#8fa2ff', align: 'right' });
      }
    });

    const stats = statsOf(m);
    drawText(ctx, `ATQ ${stats.atk}   DEF ${stats.def}   MAG ${stats.mag}   MDEF ${stats.mdef}   VEL ${stats.spd}`, 18, 130, { color: '#c8d0ee' });
    drawText(ctx, `PV ${m.hp}/${stats.maxhp}    PM ${m.mp}/${stats.maxmp}`, 18, 146, { color: '#c8d0ee' });
    drawText(ctx, m.weapon ? ITEMS[m.weapon].desc : '', 18, 164, { color: '#8a93b8' });
    drawText(ctx, 'Z: cambiar   X: volver', 160, 182, { color: '#8a93b8', align: 'center' });
  }

  drawStatus(ctx) {
    const m = G.party[this.index] || G.party[0];
    if (!m) return;
    const stats = statsOf(m);
    const c = CHARACTERS[m.id];
    drawWindow(ctx, 6, 6, 308, 204);
    drawText(ctx, m.name, 20, 16, { color: '#f4d58d' });
    drawText(ctx, c.job, 300, 16, { color: '#8fa2ff', align: 'right' });
    drawText(ctx, `Nivel ${m.lvl}`, 20, 32, { color: '#ffffff' });
    const nextExp = expForLevel(m.lvl + 1);
    const need = Math.max(0, nextExp - m.exp);
    drawText(ctx, `EXP ${m.exp}  (faltan ${need})`, 300, 32, { color: '#c8d0ee', align: 'right' });

    drawText(ctx, `PV  ${m.hp}/${stats.maxhp}`, 20, 52, { color: '#ffffff' });
    drawStatBar(ctx, 110, 54, 90, m.hp / stats.maxhp, hpColor(m.hp / stats.maxhp));
    drawText(ctx, `PM  ${m.mp}/${stats.maxmp}`, 20, 64, { color: '#ffffff' });
    drawStatBar(ctx, 110, 66, 90, m.mp / stats.maxmp, '#5b8cff');

    const pairs = [
      ['Ataque', stats.atk], ['Defensa', stats.def],
      ['Magia', stats.mag], ['Def. mágica', stats.mdef],
      ['Velocidad', stats.spd],
    ];
    pairs.forEach(([label, val], i) => {
      const y = 84 + i * 12;
      drawText(ctx, label, 20, y, { color: '#8a93b8' });
      drawText(ctx, String(val), 160, y, { color: '#ffffff' });
    });

    drawText(ctx, 'Equipo', 190, 84, { color: '#8fa2ff' });
    drawText(ctx, ITEMS[m.weapon]?.name || '—', 190, 98, { color: '#dfe6ff' });
    drawText(ctx, ITEMS[m.armor]?.name || '—', 190, 110, { color: '#dfe6ff' });

    drawText(ctx, 'Magia', 190, 128, { color: '#8fa2ff' });
    const spells = learnedSpells(m).map((id) => SPELLS[id]?.name).filter(Boolean);
    drawText(ctx, spells.slice(0, 5).join(', ') || '—', 190, 142, { color: '#dfe6ff', maxWidth: 112, wrap: true, lineHeight: 9 });
    const next = nextSpell(m);
    if (next) {
      drawText(ctx, `Próxima: ${SPELLS[next.spell]?.name} (Nv ${next.lvl})`, 20, 156, { color: '#8a93b8' });
    }

    drawText(ctx, c.bio, 20, 172, { color: '#a8b2d8', maxWidth: 280, wrap: true, lineHeight: 10 });
    drawText(ctx, '← → cambiar   X: volver', 160, 200, { color: '#8a93b8', align: 'center' });
  }
}
