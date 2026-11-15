// The world: everything that falls, everything the player catches or dodges, and the
// score. It knows nothing about the screen; the renderer paints what is here. Events
// (a catch, a hit, a power-up, a level, game over) are returned from step() so the loop
// can play a sound and shake the screen for each one.

import { COMBO, FIELD, LEVEL, LIVES, METEOR, PLAYER, POWERUP, STAR } from './config.js';

export const EVENT_CATCH = 'catch';
export const EVENT_MISS = 'miss';
export const EVENT_HIT = 'hit';
export const EVENT_POWERUP = 'powerup';
export const EVENT_LEVEL = 'level';
export const EVENT_OVER = 'over';

function makeMeteor(random, level, kind) {
  const big = kind === 'big';
  const radius = big
    ? random.range(30, 40)
    : random.range(METEOR.minRadius, METEOR.maxRadius);
  const speed = (big ? METEOR.speed * 0.55 : METEOR.speed + level * METEOR.speedPerLevel)
    + random.range(-METEOR.speedJitter / 2, METEOR.speedJitter / 2);
  return {
    kind: 'meteor',
    sub: big ? 'big' : kind,
    x: random.range(radius + 8, FIELD.width - radius - 8),
    y: -radius - 10,
    vx: kind === 'zigzag' ? random.range(90, 170) * (random.next() < 0.5 ? -1 : 1) : 0,
    vy: Math.max(90, speed),
    radius,
    rot: random.range(0, Math.PI * 2),
    spin: random.range(-1.6, 1.6),
    passed: false,
  };
}

function makeStar(random, level) {
  return {
    kind: 'star',
    x: random.range(24, FIELD.width - 24),
    y: -20,
    vy: STAR.speed + level * STAR.speedPerLevel,
    radius: STAR.radius,
    phase: random.range(0, Math.PI * 2),
    passed: false,
  };
}

function makePowerup(random) {
  return {
    kind: 'powerup',
    power: random.pick(POWERUP.kinds),
    x: random.range(30, FIELD.width - 30),
    y: -20,
    vy: POWERUP.speed,
    radius: POWERUP.radius,
    phase: random.range(0, Math.PI * 2),
    passed: false,
  };
}

export function createWorld(random) {
  const state = {
    time: 0,
    level: 1,
    levelTime: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    lives: LIVES,
    caught: 0,
    dodged: 0,
    missed: 0,
    player: {
      x: FIELD.width / 2,
      y: FIELD.height - 110,
      vx: 0,
      vy: 0,
      invulnerable: 0,
      shield: false,
      trail: [],
    },
    things: [],
    particles: [],
    floats: [],
    shake: 0,
    flash: 0,
    magnetUntil: 0,
    slowUntil: 0,
    doubleUntil: 0,
    over: false,
    meteorTimer: 0.5,
    starTimer: 0.7,
    powerupTimer: POWERUP.interval,
    banner: null,
    bannerTimer: 0,
  };

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = random.range(0, Math.PI * 2);
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: random.range(0.35, 0.8),
        max: 0.8,
        size: random.range(2, 5),
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 0.9, max: 0.9 });
  }

  function slowFactor() {
    return state.time < state.slowUntil ? 0.45 : 1;
  }

  function spawnMeteor() {
    const level = state.level;
    let kind = 'normal';
    const roll = random.next();
    if (level >= METEOR.bigFromLevel && roll < 0.14) kind = 'big';
    else if (level >= METEOR.zigzagFromLevel && roll < 0.38) kind = 'zigzag';
    state.things.push(makeMeteor(random, level, kind));
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    const dir = input.directions();
    const pointer = input.pointer();
    let ax = 0;
    let ay = 0;
    if (dir.left) ax -= 1;
    if (dir.right) ax += 1;
    if (dir.up) ay -= 1;
    if (dir.down) ay += 1;
    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay);
      p.vx = (ax / len) * PLAYER.speed;
      p.vy = (ay / len) * PLAYER.speed;
    } else if (pointer) {
      // Steer toward the pointer, easing in so it never snaps.
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const d = Math.hypot(dx, dy);
      const want = Math.min(PLAYER.speed, d * 8);
      p.vx = d > 4 ? (dx / d) * want : 0;
      p.vy = d > 4 ? (dy / d) * want : 0;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
    p.x = Math.max(PLAYER.radius + 6, Math.min(FIELD.width - PLAYER.radius - 6, p.x + p.vx * dt));
    p.y = Math.max(90, Math.min(FIELD.groundY - PLAYER.radius - 6, p.y + p.vy * dt));
    p.trail.unshift({ x: p.x, y: p.y + 14 });
    if (p.trail.length > PLAYER.trail) p.trail.pop();
    if (p.invulnerable > 0) p.invulnerable -= dt;
  }

  function stepThings(dt, events) {
    const p = state.player;
    const slow = slowFactor();
    const magnet = state.time < state.magnetUntil;
    for (let i = state.things.length - 1; i >= 0; i -= 1) {
      const t = state.things[i];
      if (t.kind === 'meteor' && t.sub === 'zigzag') {
        t.x += t.vx * dt * slow;
        if (t.x < t.radius + 6 || t.x > FIELD.width - t.radius - 6) t.vx *= -1;
      }
      if (magnet && (t.kind === 'star' || t.kind === 'powerup')) {
        const dx = p.x - t.x;
        const dy = p.y - t.y;
        const d = Math.hypot(dx, dy);
        if (d > 1 && d < 260) {
          t.x += (dx / d) * 340 * dt;
          t.y += (dy / d) * 340 * dt;
        }
      }
      t.y += t.vy * dt * slow;
      if (t.kind === 'meteor') t.rot += t.spin * dt;
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const hitDist = t.radius + PLAYER.radius - 4;
      if (dx * dx + dy * dy < hitDist * hitDist) {
        if (t.kind === 'meteor') {
          state.things.splice(i, 1);
          if (p.invulnerable > 0) continue;
          if (p.shield) {
            p.shield = false;
            p.invulnerable = PLAYER.invulnerable;
            burst(p.x, p.y, '#4dd8ff', 26, 260);
            state.shake = 0.35;
            floatText(p.x, p.y - 30, 'SHIELD!', '#4dd8ff');
            events.push({ type: EVENT_HIT, shield: true });
            continue;
          }
          state.lives -= 1;
          state.combo = 0;
          p.invulnerable = PLAYER.invulnerable;
          burst(p.x, p.y, '#ff5a4e', 34, 320);
          burst(t.x, t.y, '#ff8a3d', 18, 220);
          state.shake = 0.55;
          events.push({ type: EVENT_HIT });
          if (state.lives <= 0) {
            state.over = true;
            events.push({ type: EVENT_OVER });
          }
          continue;
        }
        if (t.kind === 'star') {
          state.things.splice(i, 1);
          state.caught += 1;
          state.combo = Math.min(state.combo + 1, COMBO.max);
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          state.comboTimer = COMBO.window;
          const mult = state.combo * (state.time < state.doubleUntil ? 2 : 1);
          const gained = STAR.points * mult;
          state.score += gained;
          burst(t.x, t.y, '#ffd94d', 12, 180);
          floatText(t.x, t.y - 14, `+${gained}`, '#ffd94d');
          events.push({ type: EVENT_CATCH, combo: state.combo });
          continue;
        }
        if (t.kind === 'powerup') {
          state.things.splice(i, 1);
          if (t.power === 'shield') state.player.shield = true;
          if (t.power === 'magnet') state.magnetUntil = state.time + POWERUP.duration.magnet;
          if (t.power === 'slow') state.slowUntil = state.time + POWERUP.duration.slow;
          if (t.power === 'double') state.doubleUntil = state.time + POWERUP.duration.double;
          burst(t.x, t.y, '#ffffff', 20, 240);
          floatText(t.x, t.y - 16, t.power.toUpperCase(), '#ffffff');
          state.flash = 0.25;
          events.push({ type: EVENT_POWERUP, power: t.power });
          continue;
        }
      }
      if (t.y - t.radius > FIELD.groundY) {
        state.things.splice(i, 1);
        if (t.kind === 'meteor' && !t.passed) {
          state.dodged += 1;
          state.score += METEOR.dodgePoints;
        }
        if (t.kind === 'star') {
          state.missed += 1;
          if (state.combo > 0) {
            state.combo = 0;
            events.push({ type: EVENT_MISS });
          }
        }
      }
    }
  }

  function stepFx(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 160 * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.y -= 42 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }
    if (state.shake > 0) state.shake -= dt;
    if (state.flash > 0) state.flash -= dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }

  function step(dt, input) {
    const events = [];
    if (state.over) return events;
    state.time += dt;
    state.levelTime += dt;
    if (state.levelTime >= LEVEL.seconds && state.level < LEVEL.max) {
      state.level += 1;
      state.levelTime = 0;
      state.score += LEVEL.bonus;
      state.banner = `LEVEL ${state.level}`;
      state.bannerTimer = 1.6;
      events.push({ type: EVENT_LEVEL });
    }
    stepPlayer(dt, input);
    const slow = slowFactor();
    state.meteorTimer -= dt;
    if (state.meteorTimer <= 0) {
      spawnMeteor();
      const interval = Math.max(
        METEOR.minInterval,
        METEOR.interval * Math.pow(METEOR.intervalScale, state.level - 1),
      );
      state.meteorTimer = interval * random.range(0.7, 1.3) * slow;
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      state.things.push(makeStar(random, state.level));
      state.starTimer = STAR.interval * random.range(0.6, 1.4);
    }
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      state.things.push(makePowerup(random));
      state.powerupTimer = POWERUP.interval * random.range(0.7, 1.3);
    }
    stepThings(dt, events);
    stepFx(dt);
    return events;
  }

  return { state, step, burst };
}
