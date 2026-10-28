// Motor de audio: sintetizador chiptune (ondas cuadradas, triangular y ruido)
// con secuenciador de música y efectos de sonido generados en tiempo real.

import { TRACKS } from './music.js';

const SEMITONES = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function noteFreq(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name.trim());
  if (!m) return 0;
  const semi = SEMITONES[m[1]];
  if (semi === undefined) return 0;
  const midi = 12 * (Number(m[2]) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.pulseWaves = new Map();
    this.noiseBuffer = null;
    this.song = null;
    this.songId = null;
    this.startAt = 0;
    this.pos = 0;
    this.ei = 0;
    this.step = 0.1;
    this.playing = false;
    this.muted = false;
    this.volume = 0.85;
    this._pendingMusic = null;
    this._schedGuard = 0;
  }

  get ready() {
    return !!this.ctx;
  }

  unlock() {
    if (!this.ctx) this._init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this._pendingMusic) {
      const id = this._pendingMusic;
      this._pendingMusic = null;
      this.playMusic(id);
    }
  }

  _init() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.62;
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.75;

    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    // Búfer de ruido para percusión y efectos
    const len = Math.floor(this.ctx.sampleRate * 0.6);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  _pulseWave(duty) {
    const key = duty.toFixed(3);
    if (this.pulseWaves.has(key)) return this.pulseWaves.get(key);
    const n = 24;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    }
    const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.pulseWaves.set(key, wave);
    return wave;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(m ? 0 : this.volume, this.ctx.currentTime + 0.15);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  parse(def) {
    const channels = def.channels.map((ch) => {
      const notes = [];
      let t = 0;
      const tokens = (ch.seq || '').trim().split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        const [name, d] = tok.split(':');
        const dur = Math.max(1, Number(d) || 4);
        notes.push({ t, dur, name });
        t += dur;
      }
      return { ...ch, notes, len: t };
    });
    const len = Math.max(16, ...channels.map((c) => c.len));
    const events = [];
    for (const ch of channels) {
      for (const nt of ch.notes) events.push({ time: nt.t, dur: nt.dur, name: nt.name, ch });
    }
    events.sort((a, b) => a.time - b.time || (a.ch.wave === 'drums' ? 1 : -1));
    return { bpm: def.bpm || 120, loop: def.loop !== false, len, events, channels };
  }

  playMusic(id, { restart = false } = {}) {
    if (!this.ctx) {
      this._pendingMusic = id;
      return;
    }
    const def = TRACKS[id];
    if (!def) return;
    if (!restart && this.songId === id && this.playing) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.song = this.parse(def);
    this.songId = id;
    this.step = 60 / this.song.bpm / 4;
    this.startAt = this.ctx.currentTime + 0.1;
    this.pos = 0;
    this.ei = 0;
    this.playing = true;
    this._schedGuard = 0;
    // Pequeño fundido de entrada
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(0.35, now);
    this.musicBus.gain.linearRampToValueAtTime(0.62, now + 0.4);
  }

  stopMusic(fade = 0.2) {
    this.playing = false;
    this.songId = null;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.linearRampToValueAtTime(0.0001, now + fade);
    setTimeout(() => {
      if (!this.playing && this.musicBus) this.musicBus.gain.value = 0.62;
    }, fade * 1000 + 50);
  }

  update() {
    if (!this.ctx || !this.playing || !this.song) return;
    if (this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const ahead = now + 0.22;
      let guard = 0;
      while (this.startAt + this.pos * this.step <= ahead && guard++ < 512) {
        const time = this.startAt + this.pos * this.step;
        while (this.ei < this.song.events.length && this.song.events[this.ei].time <= this.pos) {
          this._note(this.song.events[this.ei], time);
          this.ei++;
        }
        this.pos++;
        if (this.pos >= this.song.len) {
          if (this.song.loop) {
            this.startAt += this.song.len * this.step;
            this.pos = 0;
            this.ei = 0;
          } else {
            this.playing = false;
            this.songId = null;
            break;
          }
        }
      }
    } catch (err) {
      // Un fallo de audio nunca debe detener la partida.
      this.playing = false;
      this.songId = null;
      if (!this._warned) {
        this._warned = true;
        console.warn('Audio desactivado tras un error:', err);
      }
    }
  }

  _note(ev, when) {
    const { ch, name, dur } = ev;
    const durSec = dur * this.step;
    if (ch.wave === 'drums') {
      this._drum(name, when);
      return;
    }
    if (name === 'R' || name === 'r') return;
    const freq = noteFreq(name);
    if (!freq) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (ch.wave === 'square') {
      osc.setPeriodicWave(this._pulseWave(ch.duty || 0.5));
    } else {
      osc.type = ch.wave;
    }
    osc.frequency.setValueAtTime(freq, when);

    const vol = (ch.vol ?? 0.15) * 0.5;
    const atk = 0.006;
    const rel = Math.min(0.05, durSec * 0.3);
    const end = when + Math.max(0.02, durSec * 0.94);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(vol, when + atk);
    gain.gain.linearRampToValueAtTime(vol * 0.72, when + Math.min(durSec * 0.6, 0.12));
    gain.gain.setValueAtTime(vol * 0.72, Math.max(when + atk, end - rel));
    gain.gain.linearRampToValueAtTime(0.0001, end + rel);

    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(when);
    osc.stop(end + rel + 0.02);
  }

  _drum(kind, when) {
    const ctx = this.ctx;
    const k = String(kind).toUpperCase();
    if (k === 'R') return;
    if (k === 'K') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.11);
      g.gain.setValueAtTime(0.5, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
      osc.connect(g).connect(this.musicBus);
      osc.start(when);
      osc.stop(when + 0.18);
      return;
    }
    if (k === 'S' || k === 'H' || k === 'T') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      let stopAt = when + 0.15;
      if (k === 'S') {
        filt.type = 'bandpass';
        filt.frequency.value = 1800;
        filt.Q.value = 0.9;
        g.gain.setValueAtTime(0.34, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.13);
        stopAt = when + 0.15;
      } else if (k === 'H') {
        filt.type = 'highpass';
        filt.frequency.value = 7000;
        g.gain.setValueAtTime(0.13, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
        stopAt = when + 0.06;
      } else {
        filt.type = 'lowpass';
        filt.frequency.value = 400;
        g.gain.setValueAtTime(0.4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
        stopAt = when + 0.18;
      }
      src.connect(filt).connect(g).connect(this.musicBus);
      src.start(when);
      src.stop(stopAt);
    }
  }

  // ---------- Efectos de sonido ----------
  sfx(name) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    try {
      this._sfx(name, t);
    } catch (err) {
      if (!this._warned) {
        this._warned = true;
        console.warn('Efectos de sonido desactivados tras un error:', err);
      }
    }
  }

  _sfx(name, t) {
    switch (name) {
      case 'cursor': this._tone(1046, 0.035, 'square', 0.10, t, 0.5); break;
      case 'ok': this._tone(784, 0.05, 'square', 0.12, t); this._tone(1175, 0.08, 'square', 0.11, t + 0.05); break;
      case 'cancel': this._tone(440, 0.05, 'square', 0.11, t); this._tone(294, 0.09, 'square', 0.09, t + 0.05); break;
      case 'menu': this._tone(660, 0.05, 'square', 0.10, t, 0.25); break;
      case 'hit':
        this._noise(t, 0.09, 0.5, 900, 'lowpass');
        this._tone(196, 0.1, 'square', 0.16, t, 0.5, 98);
        break;
      case 'slash':
        this._noise(t, 0.13, 0.4, 3000, 'highpass');
        this._tone(880, 0.06, 'sawtooth', 0.08, t, 0.5, 220);
        break;
      case 'crit':
        this._noise(t, 0.16, 0.55, 1400, 'bandpass');
        this._tone(320, 0.16, 'square', 0.18, t, 0.5, 120);
        this._tone(1600, 0.1, 'square', 0.1, t + 0.02);
        break;
      case 'magic':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.12, 'triangle', 0.10, t + i * 0.045));
        break;
      case 'heal':
        [659, 880, 1046, 1318].forEach((f, i) => this._tone(f, 0.2, 'sine', 0.12, t + i * 0.07));
        break;
      case 'item': this._tone(880, 0.06, 'square', 0.1, t); this._tone(1174, 0.12, 'square', 0.1, t + 0.06); break;
      case 'chest':
        [659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.14, 'square', 0.09, t + i * 0.06));
        break;
      case 'door':
        this._tone(110, 0.12, 'square', 0.16, t, 0.5, 70);
        this._noise(t, 0.08, 0.2, 400, 'lowpass');
        break;
      case 'stairs': this._tone(220, 0.1, 'square', 0.12, t, 0.5, 330); break;
      case 'encounter':
        [880, 740, 620, 520, 440].forEach((f, i) => this._tone(f, 0.09, 'square', 0.13, t + i * 0.055));
        this._noise(t + 0.1, 0.3, 0.25, 2000, 'highpass');
        break;
      case 'flee': this._noise(t, 0.22, 0.3, 1200, 'bandpass'); break;
      case 'levelup':
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this._tone(f, 0.18, 'square', 0.10, t + i * 0.075));
        break;
      case 'save': [784, 988, 1175].forEach((f, i) => this._tone(f, 0.22, 'sine', 0.12, t + i * 0.09)); break;
      case 'death':
        this._tone(220, 0.5, 'sawtooth', 0.14, t, 0.5, 55);
        this._noise(t, 0.5, 0.2, 300, 'lowpass');
        break;
      case 'boss':
        this._tone(70, 0.7, 'sawtooth', 0.22, t, 0.5, 40);
        this._noise(t, 0.7, 0.3, 500, 'lowpass');
        break;
      case 'crystal':
        [1046, 1318, 1568, 2093].forEach((f, i) => this._tone(f, 0.5, 'sine', 0.09, t + i * 0.12));
        break;
      case 'select': this._tone(988, 0.03, 'square', 0.08, t); break;
      case 'deny': this._tone(180, 0.12, 'square', 0.14, t, 0.5, 120); break;
      default: break;
    }
  }

  _tone(freq, dur, wave, vol, when, duty = 0.5, slideTo = 0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    if (wave === 'square') osc.setPeriodicWave(this._pulseWave(duty));
    else osc.type = wave;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(this.sfxBus);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  _noise(when, dur, vol, cutoff, type = 'highpass') {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filt).connect(g).connect(this.sfxBus);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
}
