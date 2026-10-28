// Prueba del motor de audio con un WebAudio simulado.
// Detecta errores como llamar a stop() antes de start().
// Uso: node tests/audio.mjs

import { AudioEngine } from '../src/core/audio.js';
import { TRACKS } from '../src/core/music.js';

const violations = [];

class Param {
  constructor(value = 0) { this.value = value; }
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
  setTargetAtTime() {}
}

class Node {
  connect(dest) { return dest; }
  disconnect() {}
}

class GainNode extends Node {
  constructor() { super(); this.gain = new Param(1); }
}

class OscillatorNode extends Node {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.frequency = new Param(440);
    this.type = 'sine';
    this.started = false;
  }
  setPeriodicWave() {}
  start(when) {
    if (this.started) violations.push('oscillator.start dos veces');
    this.started = true;
    this.startTime = when;
  }
  stop(when) {
    if (!this.started) violations.push('oscillator.stop antes de start');
    if (when !== undefined && when < this.startTime) violations.push('oscillator.stop anterior a start');
    this.stopped = true;
  }
}

class BufferSourceNode extends Node {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.buffer = null;
    this.started = false;
  }
  start(when) {
    if (this.started) violations.push('buffer.start dos veces');
    this.started = true;
    this.startTime = when;
  }
  stop(when) {
    if (!this.started) violations.push('buffer.stop antes de start');
    if (when !== undefined && when < this.startTime) violations.push('buffer.stop anterior a start');
    this.stopped = true;
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new Node();
  }
  resume() { this.state = 'running'; }
  createGain() { return new GainNode(); }
  createOscillator() { return new OscillatorNode(this); }
  createBufferSource() { return new BufferSourceNode(this); }
  createBiquadFilter() {
    const n = new Node();
    n.type = 'lowpass';
    n.frequency = new Param(350);
    n.Q = new Param(1);
    return n;
  }
  createDynamicsCompressor() {
    const n = new Node();
    n.threshold = new Param(-24);
    n.knee = new Param(30);
    n.ratio = new Param(12);
    n.attack = new Param(0.003);
    n.release = new Param(0.25);
    return n;
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  }
  createPeriodicWave() { return {}; }
}

globalThis.window = { AudioContext: FakeAudioContext };

const audio = new AudioEngine();
audio.unlock();

let notes = 0;
const originalNote = audio._note.bind(audio);
audio._note = (ev, when) => {
  notes++;
  return originalNote(ev, when);
};

for (const id of Object.keys(TRACKS)) {
  audio.playMusic(id, { restart: true });
  for (let i = 0; i < 240; i++) {
    audio.ctx.currentTime += 0.05;
    audio.update();
  }
  if (!audio.playing && TRACKS[id].loop) {
    console.log(`  aviso: la pista ${id} terminó antes de tiempo`);
  }
}

const sfxNames = [
  'cursor', 'ok', 'cancel', 'menu', 'hit', 'slash', 'crit', 'magic', 'heal',
  'item', 'chest', 'door', 'stairs', 'encounter', 'flee', 'levelup', 'save',
  'death', 'boss', 'crystal', 'select', 'deny',
];
for (const name of sfxNames) {
  audio.sfx(name);
  audio.ctx.currentTime += 0.01;
}

audio.stopMusic();
audio.toggleMute();
audio.toggleMute();

if (violations.length) {
  console.error(`\n${violations.length} errores de audio:`);
  for (const v of violations.slice(0, 20)) console.error('  ✗', v);
  process.exit(1);
}
if (notes < 100) {
  console.error(`\nMuy pocas notas programadas (${notes}); la música no está sonando.`);
  process.exit(1);
}
console.log(`Audio OK: ${Object.keys(TRACKS).length} pistas, ${notes} notas programadas, ${sfxNames.length} efectos sin errores.`);
