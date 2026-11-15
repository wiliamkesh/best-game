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
    catch(combo) {
      // The pitch climbs with the combo, so a streak sounds like a streak.
      const base = 520 + Math.min(combo, 5) * 70;
      tone(base, 0.12, 'sine', 0.6, base * 1.5);
      tone(base * 2, 0.08, 'triangle', 0.25, base * 2.4);
    },
    miss() {
      tone(220, 0.15, 'sine', 0.3, 140);
    },
    hit() {
      noise(0.28, 0.7, 900);
      tone(160, 0.3, 'sawtooth', 0.5, 45);
    },
    powerup() {
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 0.14, 'triangle', 0.5), i * 55);
      });
    },
    levelup() {
      [392, 523, 659].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, 'square', 0.3), i * 70);
      });
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => {
        setTimeout(() => tone(f, 0.28, 'triangle', 0.45), i * 140);
      });
    },
  };
}
