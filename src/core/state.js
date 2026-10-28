// Estado global de la partida y utilidades compartidas por todas las escenas.

import { CHARACTERS, PARTY_ORDER, createMember, statsOf, fullHeal } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { MAPS } from '../data/maps.js';

export const SAVE_KEY = 'cristal-aurora-save-v1';

export const G = {
  W: 320,
  H: 240,
  TILE: 16,
  canvas: null,
  ctx: null,
  input: null,
  audio: null,
  scenes: null,

  party: [],
  inventory: {},
  gold: 0,
  flags: {},
  mapId: 'vallebruma',
  pos: { x: 16, y: 18, dir: 'up' },
  playtime: 0,
  frame: 0,
  time: 0,
  battleCount: 0,

  // Efectos globales
  fade: { alpha: 0, target: 0, speed: 4, onDone: null },
  flash: { alpha: 0, color: '#ffffff' },
  shake: 0,
  toast: { text: '', time: 0 },

  // ---------- Partida ----------
  newGame() {
    this.party = [];
    this.inventory = { pocion: 3, antidoto: 1 };
    this.gold = 120;
    this.flags = {};
    this.mapId = 'vallebruma';
    this.pos = { x: 16, y: 18, dir: 'up' };
    this.playtime = 0;
    this.battleCount = 0;
    this.addMember('kael');
    this.fade.alpha = 1;
    this.fade.target = 0;
  },

  addMember(id, level = null) {
    if (this.party.some((m) => m.id === id)) return this.party.find((m) => m.id === id);
    const maxLvl = this.party.reduce((m, p) => Math.max(m, p.lvl), 1);
    const target = level ?? (this.party.length ? Math.max(1, maxLvl - 1) : 1);
    const member = createMember(id, Math.min(30, target));
    this.party.push(member);
    this.party.sort((a, b) => PARTY_ORDER.indexOf(a.id) - PARTY_ORDER.indexOf(b.id));
    return member;
  },

  hasMember(id) {
    return this.party.some((m) => m.id === id);
  },

  member(id) {
    return this.party.find((m) => m.id === id);
  },

  aliveMembers() {
    return this.party.filter((m) => m.hp > 0);
  },

  avgLevel() {
    if (!this.party.length) return 1;
    return Math.round(this.party.reduce((s, m) => s + m.lvl, 0) / this.party.length);
  },

  healParty() {
    for (const m of this.party) fullHeal(m);
  },

  reviveAll() {
    for (const m of this.party) {
      if (m.hp <= 0) m.hp = Math.max(1, Math.floor(statsOf(m).maxhp * 0.25));
    }
  },

  // ---------- Inventario ----------
  giveItem(id, n = 1) {
    if (!ITEMS[id]) return;
    this.inventory[id] = (this.inventory[id] || 0) + n;
  },

  takeItem(id, n = 1) {
    if (!this.inventory[id]) return false;
    this.inventory[id] -= n;
    if (this.inventory[id] <= 0) delete this.inventory[id];
    return true;
  },

  countItem(id) {
    return this.inventory[id] || 0;
  },

  itemList(kinds = ['consumable', 'key']) {
    return Object.keys(this.inventory)
      .filter((id) => ITEMS[id] && kinds.includes(ITEMS[id].kind))
      .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  },

  addGold(n) {
    this.gold = Math.max(0, this.gold + n);
  },

  spendGold(n) {
    if (this.gold < n) return false;
    this.gold -= n;
    return true;
  },

  flag(name) {
    return !!this.flags[name];
  },

  setFlag(name, value = true) {
    this.flags[name] = value;
  },

  // ---------- Transiciones y efectos ----------
  fadeTo(target, onDone = null, speed = 4) {
    this.fade.target = target;
    this.fade.speed = speed;
    this.fade.onDone = onDone;
  },

  updateFade(dt) {
    const f = this.fade;
    if (f.alpha === f.target) return;
    const dir = Math.sign(f.target - f.alpha);
    f.alpha += dir * f.speed * dt;
    if ((dir > 0 && f.alpha >= f.target) || (dir < 0 && f.alpha <= f.target)) {
      f.alpha = f.target;
      const cb = f.onDone;
      f.onDone = null;
      if (cb) cb();
    }
  },

  updateEffects(dt) {
    this.frame++;
    this.time += dt;
    this.updateFade(dt);
    if (this.flash.alpha > 0) this.flash.alpha = Math.max(0, this.flash.alpha - dt * 2.2);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 18);
    if (this.toast.time > 0) this.toast.time = Math.max(0, this.toast.time - dt);
  },

  // ---------- Guardado ----------
  serialize() {
    return {
      v: 1,
      savedAt: Date.now(),
      party: this.party.map((m) => ({
        id: m.id, lvl: m.lvl, exp: m.exp, hp: m.hp, mp: m.mp,
        weapon: m.weapon, armor: m.armor,
      })),
      inventory: { ...this.inventory },
      gold: this.gold,
      flags: { ...this.flags },
      mapId: this.mapId,
      pos: { ...this.pos },
      playtime: this.playtime,
      battleCount: this.battleCount,
    };
  },

  applySave(data) {
    if (!data || !data.party || !data.party.length) return false;
    this.party = data.party
      .filter((m) => CHARACTERS[m.id])
      .map((m) => ({
        id: m.id,
        name: CHARACTERS[m.id].name,
        lvl: Math.max(1, m.lvl | 0),
        exp: m.exp | 0,
        hp: Math.max(0, m.hp | 0),
        mp: Math.max(0, m.mp | 0),
        weapon: m.weapon,
        armor: m.armor,
      }));
    this.inventory = { ...(data.inventory || {}) };
    this.gold = Math.max(0, data.gold | 0);
    this.flags = { ...(data.flags || {}) };
    this.mapId = MAPS[data.mapId] ? data.mapId : 'vallebruma';
    this.pos = {
      x: (data.pos?.x ?? 16) | 0,
      y: (data.pos?.y ?? 18) | 0,
      dir: data.pos?.dir || 'up',
    };
    this.playtime = Number(data.playtime) || 0;
    this.battleCount = data.battleCount | 0;
    this.fade.alpha = 1;
    this.fade.target = 0;
    return true;
  },
};

export function formatPlaytime(seconds) {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
