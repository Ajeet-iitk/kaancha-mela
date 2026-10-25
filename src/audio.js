// Procedural sound design for Kaanch Ka Mela. No external audio files.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class MelaAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.ambience = null;
    this.noise = null;
    this.muted = false;
    this.lastImpact = 0;
    this.lastShatter = 0;
    this.voices = [];
    this.hiVoice = null;
    this.enVoice = null;
    this.lang = 'en';
    this.ambientTimer = null;
    this.chargeOsc = null;
    this.chargeGain = null;
    this._speakingTimer = null;
    this.onSpeaking = null;

    if ('speechSynthesis' in window) {
      this._loadVoices();
      try {
        window.speechSynthesis.addEventListener('voiceschanged', () => this._loadVoices());
      } catch (_) { /* older browsers */ }
    }
  }

  get ready() { return !!this.ctx; }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.85;
    this.master.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.95;
    this.sfx.connect(this.master);

    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.0;
    this.ambience.connect(this.master);

    // 2 second noise bed
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.55 + last * 1.4;
    }
    this.noise = buf;

    this._startAmbience();
    if (ctx.state === 'suspended') ctx.resume();
  }

  _noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  _env(gain, t, peak, attack, decay) {
    const g = gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _startAmbience() {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Low crowd rumble
    const s1 = this._noiseSource(true);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 330; lp.Q.value = 0.5;
    const g1 = ctx.createGain(); g1.gain.value = 0.038;
    s1.connect(lp).connect(g1).connect(this.ambience);
    s1.start(t);

    // Mid murmur, slowly breathing
    const s2 = this._noiseSource(true);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 620; bp.Q.value = 0.7;
    const g2 = ctx.createGain(); g2.gain.value = 0.012;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain).connect(g2.gain);
    lfo.start(t);
    s2.connect(bp).connect(g2).connect(this.ambience);
    s2.start(t);

    // Faint tanpura-like drone, root + fifth, very quiet
    [110, 164.81, 220].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.006 : 0.0028;
      const trem = ctx.createOscillator();
      trem.frequency.value = 0.08 + i * 0.017;
      const tg = ctx.createGain(); tg.gain.value = 0.0018;
      trem.connect(tg).connect(g.gain); trem.start(t);
      o.connect(g).connect(this.ambience);
      o.start(t);
    });

    this.ambience.gain.setValueAtTime(0.0001, t);
    this.ambience.gain.exponentialRampToValueAtTime(1, t + 3.0);

    // Occasional distant temple bell / fair chime
    const chime = () => {
      if (!this.ctx || this.muted) return;
      this._bell(this.ctx.currentTime + 0.05, 784 + Math.random() * 320, 0.018, 2.8);
      this.ambientTimer = setTimeout(chime, 14000 + Math.random() * 16000);
    };
    this.ambientTimer = setTimeout(chime, 9000);
  }

  _bell(t, freq, vol = 0.03, dur = 1.8) {
    if (!this.ctx) return;
    [1, 2.01, 2.72, 4.16].forEach((mult, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const g = this.ctx.createGain();
      this._env(g, t, vol / (i + 1.2), 0.006, dur * (1 - i * 0.14));
      o.connect(g).connect(this.sfx);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(m ? 0 : 0.85, t + 0.12);
    }
    if (m) {
      this.stopCharge();
      try { window.speechSynthesis.cancel(); } catch (_) {}
      if (this.onSpeaking) this.onSpeaking(false);
    }
  }

  ui() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(720, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.08);
    this._env(g, t, 0.035, 0.005, 0.09);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.13);
  }

  whoosh() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(280, t);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.16);
    bp.frequency.exponentialRampToValueAtTime(360, t + 0.42);
    const g = this.ctx.createGain();
    this._env(g, t, 0.14, 0.025, 0.38);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + 0.5);

    const thump = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(130, t);
    thump.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    this._env(tg, t, 0.07, 0.008, 0.2);
    thump.connect(tg).connect(this.sfx); thump.start(t); thump.stop(t + 0.25);
  }

  chargeStart() {
    if (!this.ctx || this.muted) return;
    this.stopCharge();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.linearRampToValueAtTime(520, t + 1.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.09);
    o.connect(g).connect(this.sfx);
    o.start(t);
    this.chargeOsc = o; this.chargeGain = g;
  }

  stopCharge() {
    if (!this.chargeOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      this.chargeGain.gain.cancelScheduledValues(t);
      this.chargeGain.gain.setTargetAtTime(0.0001, t, 0.025);
      this.chargeOsc.stop(t + 0.12);
    } catch (_) {}
    this.chargeOsc = null; this.chargeGain = null;
  }

  impact(kind = 'glass', strength = 0.5) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastImpact < 24) return;
    this.lastImpact = now;
    const t = this.ctx.currentTime + 0.001;
    const s = clamp(strength, 0.08, 1);

    if (kind === 'glass' || kind === 'china') {
      const base = kind === 'glass' ? 1 : 0.78;
      const partials = kind === 'glass'
        ? [[1760, 0.065], [2630, 0.045], [3940, 0.03], [5210, 0.018]]
        : [[1120, 0.06], [1850, 0.042], [2920, 0.026], [4100, 0.015]];
      partials.forEach(([f, v], i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * base * (0.97 + Math.random() * 0.06);
        this._env(g, t, v * s, 0.002, 0.16 + i * 0.07 + s * 0.12);
        o.connect(g).connect(this.sfx);
        o.start(t); o.stop(t + 0.55);
      });
      // tiny transient
      const src = this._noiseSource();
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2800;
      const ng = this.ctx.createGain();
      this._env(ng, t, 0.055 * s, 0.001, 0.06);
      src.connect(hp).connect(ng).connect(this.sfx);
      src.start(t); src.stop(t + 0.1);
    } else if (kind === 'clay') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
      this._env(g, t, 0.09 * s, 0.002, 0.14);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.2);
      const src = this._noiseSource();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1500;
      const ng = this.ctx.createGain();
      this._env(ng, t, 0.06 * s, 0.001, 0.1);
      src.connect(lp).connect(ng).connect(this.sfx); src.start(t); src.stop(t + 0.15);
    } else if (kind === 'steel') {
      [186, 438, 796, 1240, 1820].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = i < 2 ? 'triangle' : 'sine';
        o.frequency.value = f * (0.98 + Math.random() * 0.04);
        this._env(g, t, (0.07 / (i + 1.5)) * s, 0.002, 0.65 - i * 0.07);
        o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.9);
      });
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(105, t);
      o.frequency.exponentialRampToValueAtTime(62, t + 0.2);
      this._env(g, t, 0.08 * s, 0.003, 0.24);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3);
    } else if (kind === 'wood') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(180, t);
      this._env(g, t, 0.06 * s, 0.002, 0.1);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.15);
    } else {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(105, t);
      o.frequency.exponentialRampToValueAtTime(58, t + 0.12);
      this._env(g, t, 0.055 * s, 0.002, 0.13);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.18);
    }
  }

  shatter(strength = 0.8) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastShatter < 220) return;
    this.lastShatter = now;
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1600;
    const g = this.ctx.createGain();
    this._env(g, t, 0.12 * clamp(strength, 0.2, 1), 0.002, 0.32);
    src.connect(hp).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + 0.4);
    for (let i = 0; i < 5; i++) {
      const tt = t + Math.random() * 0.14;
      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2600 + Math.random() * 4200;
      this._env(og, tt, 0.018 * Math.random() + 0.006, 0.001, 0.05 + Math.random() * 0.08);
      o.connect(og).connect(this.sfx); o.start(tt); o.stop(tt + 0.16);
    }
  }

  crowdCheer(intensity = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 780; bp.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * intensity, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + 2.0);

    // excited woo voices
    [0, 0.12, 0.26].forEach((offset, i) => {
      const o = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(330 + i * 40, t + offset);
      o.frequency.exponentialRampToValueAtTime(720 + i * 60, t + offset + 0.28);
      o.frequency.exponentialRampToValueAtTime(500 + i * 50, t + offset + 0.95);
      const vib = this.ctx.createOscillator();
      const vg = this.ctx.createGain();
      vib.frequency.value = 6 + i; vg.gain.value = 14;
      vib.connect(vg).connect(o.frequency); vib.start(t + offset); vib.stop(t + 1.2);
      og.gain.setValueAtTime(0.0001, t + offset);
      og.gain.exponentialRampToValueAtTime(0.022 * intensity, t + offset + 0.08);
      og.gain.exponentialRampToValueAtTime(0.0001, t + offset + 1.15);
      o.connect(og).connect(this.sfx);
      o.start(t + offset); o.stop(t + offset + 1.2);
    });

    // claps
    for (let i = 0; i < 18; i++) {
      const tt = t + 0.1 + Math.random() * 1.4;
      const src2 = this._noiseSource();
      const bp2 = this.ctx.createBiquadFilter();
      bp2.type = 'bandpass'; bp2.frequency.value = 1500 + Math.random() * 1200; bp2.Q.value = 1.2;
      const g2 = this.ctx.createGain();
      this._env(g2, tt, 0.018 + Math.random() * 0.022, 0.001, 0.045);
      src2.connect(bp2).connect(g2).connect(this.sfx);
      src2.start(tt); src2.stop(tt + 0.09);
    }
  }

  crowdLaugh() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const voices = [
      { base: 172, rate: 0.195, off: 0.0, vol: 0.05 },
      { base: 225, rate: 0.21, off: 0.075, vol: 0.042 },
      { base: 128, rate: 0.235, off: 0.13, vol: 0.048 },
      { base: 260, rate: 0.18, off: 0.035, vol: 0.032 },
    ];
    voices.forEach((v, vi) => {
      const syllables = 5 + (vi % 2);
      for (let i = 0; i < syllables; i++) {
        const t = t0 + v.off + i * v.rate + Math.random() * 0.012;
        const dur = 0.105 + Math.random() * 0.02;
        // breathy "ha"
        const src = this._noiseSource();
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(880 + vi * 90, t);
        bp.frequency.linearRampToValueAtTime(620 + vi * 70, t + dur);
        bp.Q.value = 1.0;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v.vol, t + 0.022);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp).connect(g).connect(this.sfx);
        src.start(t); src.stop(t + dur + 0.02);

        // voiced "haa"
        const o = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 850;
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(v.base * (1 + Math.random() * 0.06) * (i < 2 ? 1.08 : 0.96), t);
        o.frequency.exponentialRampToValueAtTime(v.base * 0.82, t + dur);
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(v.vol * 0.55, t + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp).connect(og).connect(this.sfx);
        o.start(t); o.stop(t + dur + 0.02);
      }
    });

    // crowd titter bed
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.022, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t0); src.stop(t0 + 2.3);
  }

  winJingle() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.12;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this._bell(t + i * 0.13, f, 0.055, 1.5);
    });
    // final chord
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const tt = t + 0.62;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      this._env(g, tt, 0.034 / (1 + i * 0.1), 0.015, 1.6);
      o.connect(g).connect(this.sfx);
      o.start(tt); o.stop(tt + 1.7);
    });
    this.crowdCheer(1.15);
  }

  loseSting() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      const tt = t + i * 0.24;
      const o = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, tt);
      o.frequency.exponentialRampToValueAtTime(f * 0.94, tt + 0.22);
      lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.04, tt + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.23);
      o.connect(lp).connect(g).connect(this.sfx);
      o.start(tt); o.stop(tt + 0.28);
    });
    const tt = t + 1.0;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, tt);
    o.frequency.exponentialRampToValueAtTime(110, tt + 0.7);
    lp.type = 'lowpass'; lp.frequency.value = 500;
    this._env(g, tt, 0.065, 0.02, 0.75);
    o.connect(lp).connect(g).connect(this.sfx);
    o.start(tt); o.stop(tt + 0.8);
  }

  _loadVoices() {
    try {
      this.voices = window.speechSynthesis.getVoices() || [];
      this.hiVoice = this.voices.find(v => /^hi/i.test(v.lang)) ||
        this.voices.find(v => /hindi/i.test(v.name));
      this.enVoice = this.voices.find(v => /^en-in/i.test(v.lang)) ||
        this.voices.find(v => /^en-gb/i.test(v.lang)) ||
        this.voices.find(v => /^en/i.test(v.lang)) ||
        null;
    } catch (_) {}
  }

  setLanguage(lang) {
    this.lang = lang === 'hi' ? 'hi' : 'en';
    try { window.speechSynthesis.cancel(); } catch (_) {}
    if (this.onSpeaking) this.onSpeaking(false);
  }

  taunt(line, lang) {
    if (!this.ctx || this.muted || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    try {
      const now = performance.now();
      if (this._lastSpeech && now - this._lastSpeech < 1600) return;
      this._lastSpeech = now;
      synth.cancel();
      const u = new SpeechSynthesisUtterance();
      // Shetty Anna is a Hindi-speaking shopkeeper. With a Hindi voice he reads
      // the Devanagari line; without one he speaks the Roman-Hindi line with an
      // Indian-English voice so the delivery still sounds like Hindi.
      if (this.hiVoice) {
        u.text = line.hi || line.text || line.en || '';
        u.lang = this.hiVoice.lang || 'hi-IN';
        try { u.voice = this.hiVoice; } catch (_) {}
      } else {
        u.text = line.text || line.en || line.hi || '';
        u.lang = this.enVoice?.lang || 'en-IN';
        try { if (this.enVoice) u.voice = this.enVoice; } catch (_) {}
      }
      if (!u.text) return;
      u.rate = 0.92;
      u.pitch = 0.72;
      u.volume = 1;
      if (this.onSpeaking) {
        u.onstart = () => this.onSpeaking(true);
        u.onend = () => this.onSpeaking(false);
        u.onerror = () => this.onSpeaking(false);
      }
      // speak on next tick so cancel doesn't swallow it in some browsers
      setTimeout(() => {
        if (!this.muted) {
          try { synth.speak(u); } catch (_) {}
        }
      }, 70);
    } catch (_) {}
  }

  /* comedy bonk when the ball finds Anna */
  bonk() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(430, t);
    o.frequency.exponentialRampToValueAtTime(92, t + 0.16);
    this._env(g, t, 0.13, 0.003, 0.2);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.28);
    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(160, t + 0.01);
    o2.frequency.exponentialRampToValueAtTime(66, t + 0.2);
    this._env(g2, t + 0.01, 0.08, 0.002, 0.16);
    o2.connect(g2).connect(this.sfx); o2.start(t); o2.stop(t + 0.25);
    const src = this._noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = this.ctx.createGain();
    this._env(ng, t, 0.05, 0.001, 0.09);
    src.connect(lp).connect(ng).connect(this.sfx); src.start(t); src.stop(t + 0.12);
  }

  squeak() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [0, 0.09].forEach((off, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880 + i * 220, t + off);
      o.frequency.exponentialRampToValueAtTime(1500 + i * 300, t + off + 0.09);
      this._env(g, t + off, 0.05, 0.004, 0.11);
      o.connect(g).connect(this.sfx); o.start(t + off); o.stop(t + off + 0.16);
    });
  }

  glug() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // three wet gulps sliding down the throat
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.17;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      o.type = 'sine';
      o.frequency.setValueAtTime(210 + i * 26, at);
      o.frequency.exponentialRampToValueAtTime(72 + i * 8, at + 0.15);
      lp.type = 'lowpass'; lp.frequency.value = 620;
      this._env(g, at, 0.1, 0.008, 0.15);
      o.connect(lp).connect(g).connect(this.sfx);
      o.start(at); o.stop(at + 0.2);
    }
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 340; bp.Q.value = 1.4;
    const ng = this.ctx.createGain();
    this._env(ng, t, 0.035, 0.01, 0.4);
    src.connect(bp).connect(ng).connect(this.sfx);
    src.start(t); src.stop(t + 0.5);
  }

  grunt() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.36);
    const vib = this.ctx.createOscillator();
    const vg = this.ctx.createGain();
    vib.frequency.value = 17; vg.gain.value = 9;
    vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + 0.42);
    lp.type = 'lowpass'; lp.frequency.value = 420;
    this._env(g, t, 0.075, 0.02, 0.36);
    o.connect(lp).connect(g).connect(this.sfx);
    o.start(t); o.stop(t + 0.45);
    const src = this._noiseSource();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 0.8;
    const ng = this.ctx.createGain();
    this._env(ng, t + 0.02, 0.035, 0.02, 0.3);
    src.connect(bp).connect(ng).connect(this.sfx); src.start(t + 0.02); src.stop(t + 0.36);
  }
}
