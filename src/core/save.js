// Guardado local (localStorage). Una sola ranura, estilo cartucho.

import { G, SAVE_KEY } from './state.js';

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function saveGame() {
  try {
    const payload = JSON.stringify(G.serialize());
    localStorage.setItem(SAVE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return G.applySave(data);
  } catch {
    return false;
  }
}

export function saveSummary() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      leader: d.party?.[0]?.id || 'kael',
      level: Math.max(...(d.party || []).map((m) => m.lvl || 1), 1),
      playtime: d.playtime || 0,
      gold: d.gold || 0,
      mapId: d.mapId,
      savedAt: d.savedAt || 0,
    };
  } catch {
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* sin almacenamiento */ }
}
