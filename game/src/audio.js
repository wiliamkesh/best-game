// All sound is synthesized with WebAudio: no audio files, no network, nothing to load.
// Each effect is a short oscillator/noise burst. Audio starts only after the first user
// gesture (a browser rule), so createSound is called on start and every play call is safe
// to make before that: it simply does nothing until the context exists.

export function createSound() {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    /** The audio context exists (a gesture happened). */
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    click() {
      tone(660, 0.07, 'sine', 0.5, 880);
    },
    /** A gravity well drops into the sky: a soft low pluck. */
    place() {
      tone(330, 0.14, 'triangle', 0.55, 220);
      tone(495, 0.1, 'sine', 0.3, 660);
    },
    /** A star is caught: the pitch climbs with the well's count, so a full well sings. */
    capture(count) {
      const base = 480 + Math.min(count, 6) * 60;
      tone(base, 0.1, 'sine', 0.5, base * 1.4);
    },
    /** A constellation seals: an arpeggio that rises with its size and combo. */
    seal(size, combo) {
      const steps = Math.min(size, 7);
      const base = 523 + Math.min(combo, 5) * 40;
      for (let i = 0; i < steps; i += 1) {
        setTimeout(() => tone(base * (1 + i * 0.16), 0.16, 'triangle', 0.5), i * 60);
      }
    },
    /** A well detonates: a burst and a low boom. */
    detonate() {
      noise(0.3, 0.7, 800);
      tone(140, 0.35, 'sawtooth', 0.5, 40);
    },
    /** A meteor breaks a well: glass and a thud. */
    wellLost() {
      noise(0.2, 0.5, 1400);
      tone(200, 0.25, 'square', 0.35, 70);
    },
    /** Two meteors shatter each other: a bright crack. */
    shatter() {
      noise(0.16, 0.6, 2200);
      tone(880, 0.1, 'triangle', 0.4, 1320);
    },
    /** A meteor hits the Heart Star: a deep thud. */
    heartHit() {
      noise(0.3, 0.7, 700);
      tone(120, 0.4, 'sawtooth', 0.55, 38);
    },
    /** A level clears: a rising three-note lift. */
    levelup() {
      [392, 523, 659].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, 'square', 0.3), i * 70);
      });
    },
    /** The Grand Constellation seals: a full fanfare. */
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => tone(f, 0.3, 'triangle', 0.5), i * 110);
      });
    },
    /** The Heart Star falls: a slow descent. */
    over() {
      [392, 330, 262, 196].forEach((f, i) => {
        setTimeout(() => tone(f, 0.28, 'triangle', 0.45), i * 140);
      });
    },
    /** A denied action: a dull tick. */
    denied() {
      tone(180, 0.08, 'sine', 0.3, 140);
    },
  };
}
