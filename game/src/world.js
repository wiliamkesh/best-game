// The world: gravity wells, falling stars, meteors and the Heart Star. It knows nothing
// about the screen; the renderer paints what is here. Events (a well placed, a star
// captured, a constellation sealed, a well lost, the Heart hit, a level, a win, game
// over) are returned from step() so the loop can play a sound for each one.
//
// The loop, in one sentence: place a gravity well where the stars fall, let it catch
// them into orbit, seal the constellation before a meteor breaks the well — and keep
// the meteors off the Heart Star at the bottom of the sky.

import {
  COMBO, ENERGY, FIELD, HEART, LEVEL, LIVES, METEOR, STAR, WEAVER, WELL,
  constellationScore, levelName, levelTarget, maxWells, regenForLevel,
} from './config.js';

export const EVENT_PLACE = 'place';
export const EVENT_CAPTURE = 'capture';
export const EVENT_SEAL = 'seal';
export const EVENT_DETONATE = 'detonate';
export const EVENT_WELL_LOST = 'welllost';
export const EVENT_SHATTER = 'shatter';
export const EVENT_HEART = 'heart';
export const EVENT_LEVEL = 'level';
export const EVENT_WIN = 'win';
export const EVENT_OVER = 'over';
export const EVENT_DENIED = 'denied';

let nextWellId = 1;

function makeStar(random, level) {
  const roll = random.next();
  let kind = 'normal';
  if (roll < STAR.goldChance) kind = 'gold';
  else if (level >= STAR.cometFromLevel && roll < STAR.goldChance + STAR.cometChance) kind = 'comet';
  const fast = kind === 'comet' ? 95 : 0;
  return {
    kind,
    x: random.range(24, FIELD.width - 24),
    y: -20,
    vx: 0,
    vy: STAR.speed + level * STAR.speedPerLevel + fast,
    radius: kind === 'gold' ? 13 : kind === 'comet' ? 12 : STAR.radius,
    phase: random.range(0, Math.PI * 2),
    state: 'falling',
    wellId: null,
    angle: 0,
    orbitR: 0,
    orbitSpeed: 0,
    orbitDir: 1,
  };
}

function makeMeteor(random, level) {
  const big = level >= METEOR.bigFromLevel && random.next() < METEOR.bigChance;
  const hunter = !big && level >= METEOR.hunterFromLevel && random.next() < METEOR.hunterChance;
  const radius = big
    ? random.range(30, 40)
    : hunter
      ? random.range(13, 17)
      : random.range(METEOR.minRadius, METEOR.maxRadius);
  const baseSpeed = big ? METEOR.speed * 0.55 : METEOR.speed + level * METEOR.speedPerLevel;
  const speed = (hunter ? baseSpeed * METEOR.hunterSpeed : baseSpeed)
    + random.range(-METEOR.speedJitter / 2, METEOR.speedJitter / 2);
  return {
    kind: 'meteor',
    sub: big ? 'big' : hunter ? 'hunter' : 'normal',
    x: random.range(radius + 8, FIELD.width - radius - 8),
    y: -radius - 10,
    vx: random.range(-30, 30),
    vy: Math.max(90, speed),
    radius,
    rot: random.range(0, Math.PI * 2),
    spin: random.range(-1.6, 1.6),
    bent: false,
  };
}

export function createWorld(random) {
  const state = {
    time: 0,
    level: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    lives: LIVES,
    sealed: 0,
    sealedTotal: 0,
    energy: ENERGY.max,
    weaver: {
      x: FIELD.width / 2,
      y: FIELD.height - 110,
      vx: 0,
      vy: 0,
      trail: [],
    },
    heart: { x: HEART.x, y: HEART.y, radius: HEART.radius, flash: 0 },
    wells: [],
    stars: [],
    meteors: [],
    particles: [],
    floats: [],
    rising: [],
    shockwaves: [],
    shake: 0,
    flash: 0,
    banner: null,
    bannerTimer: 0,
    over: false,
    won: false,
    starTimer: 0.7,
    meteorTimer: 1.2,
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
    state.floats.push({ x, y, text, color, life: 1.1, max: 1.1 });
  }

  function wellStars(well) {
    return state.stars.filter((s) => s.wellId === well.id);
  }

  function wellCapacity() {
    return state.level >= LEVEL.max ? WELL.grandMaxStars : WELL.maxStars;
  }

  function pullRadius() {
    return state.level >= LEVEL.max ? WELL.grandPullRadius : WELL.pullRadius;
  }

  function scatterWell(well) {
    for (const s of wellStars(well)) {
      s.state = 'falling';
      s.wellId = null;
      s.vx = random.range(-90, 90);
      s.vy = random.range(40, 110);
    }
  }

  function placeWellAt(x, y, events) {
    const px = Math.max(40, Math.min(FIELD.width - 40, x));
    const py = Math.max(90, Math.min(FIELD.groundY - 30, y));
    if (state.energy < ENERGY.wellCost) {
      floatText(state.weaver.x, state.weaver.y - 30, 'NEED ENERGY', '#9aa3b5');
      events.push({ type: EVENT_DENIED });
      return;
    }
    if (state.wells.length >= maxWells(state.level)) {
      floatText(state.weaver.x, state.weaver.y - 30, 'WELL LIMIT', '#9aa3b5');
      events.push({ type: EVENT_DENIED });
      return;
    }
    const well = { id: nextWellId, x: px, y: py, born: state.time, flash: 0 };
    nextWellId += 1;
    state.wells.push(well);
    state.energy -= ENERGY.wellCost;
    burst(px, py, '#4de8ff', 16, 200);
    events.push({ type: EVENT_PLACE });
  }

  function sealWell(well, events) {
    const stars = wellStars(well);
    const target = levelTarget(state.level);
    if (stars.length < target.minStars) {
      floatText(
        well.x, well.y - 44,
        target.grand ? 'THE GRAND NEEDS 7 STARS' : `NEED ${target.minStars} STARS`,
        '#9aa3b5',
      );
      events.push({ type: EVENT_DENIED });
      return;
    }
    const base = constellationScore(stars);
    state.combo = state.comboTimer > 0 ? Math.min(state.combo + 1, COMBO.max) : 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.comboTimer = COMBO.window;
    const gained = base * state.combo;
    state.score += gained;
    state.sealed += 1;
    state.sealedTotal += 1;
    state.energy = Math.min(ENERGY.max, state.energy + ENERGY.sealRefund * stars.length);
    state.rising.push({
      points: stars.map((s) => ({ dx: s.x - well.x, dy: s.y - well.y, kind: s.kind })),
      x: well.x,
      y: well.y,
      life: 1.4,
      max: 1.4,
    });
    burst(well.x, well.y, '#ffd94d', 40, 320);
    floatText(well.x, well.y - 52, `+${gained}`, '#ffd94d');
    if (state.combo >= 2) floatText(well.x, well.y - 78, `COMBO x${state.combo}`, '#ff5ad1');
    state.stars = state.stars.filter((s) => s.wellId !== well.id);
    state.wells = state.wells.filter((w) => w.id !== well.id);
    events.push({ type: EVENT_SEAL, size: stars.length, combo: state.combo });
    if (target.grand) {
      state.won = true;
      // The Grand seal is a spectacle: a golden storm, a shockwave, a flash.
      burst(HEART.x, HEART.y, '#ffd94d', 120, 480);
      burst(well.x, well.y, '#ffd94d', 80, 420);
      burst(well.x, well.y, '#ffffff', 40, 300);
      state.shockwaves.push({ x: well.x, y: well.y, r: 10, maxR: 420, life: 0.9, max: 0.9 });
      state.flash = 0.35;
      state.shake = 0.5;
      events.push({ type: EVENT_WIN });
      return;
    }
    if (state.sealed >= target.constellations) {
      state.score += LEVEL.clearBonus * state.level;
      state.energy = ENERGY.max;
      for (const m of state.meteors) burst(m.x, m.y, '#ff8a3d', 10, 180);
      state.meteors = [];
      state.level += 1;
      state.sealed = 0;
      state.banner = `LEVEL ${state.level} — ${levelName(state.level).name}`;
      state.bannerTimer = 1.8;
      events.push({ type: EVENT_LEVEL });
    }
  }

  function sealFullest(events) {
    if (state.wells.length === 0) return;
    let best = null;
    let bestCount = -1;
    for (const w of state.wells) {
      const n = wellStars(w).length;
      if (n > bestCount) {
        bestCount = n;
        best = w;
      }
    }
    if (best) sealWell(best, events);
  }

  function detonateNear(x, y, events) {
    let best = null;
    let bestD = WELL.detonateRadius;
    for (const w of state.wells) {
      const d = Math.hypot(w.x - x, w.y - y);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    if (!best) return;
    scatterWell(best);
    state.wells = state.wells.filter((w) => w.id !== best.id);
    state.shockwaves.push({ x: best.x, y: best.y, r: 10, maxR: WELL.detonateRadius, life: 0.5, max: 0.5 });
    let cleared = 0;
    for (let i = state.meteors.length - 1; i >= 0; i -= 1) {
      const m = state.meteors[i];
      if (Math.hypot(m.x - best.x, m.y - best.y) < WELL.detonateRadius) {
        burst(m.x, m.y, '#ff8a3d', 14, 220);
        state.meteors.splice(i, 1);
        cleared += 1;
      }
    }
    if (cleared > 0) floatText(best.x, best.y - 44, `BLAST x${cleared}`, '#ff8a3d');
    state.shake = Math.max(state.shake, 0.3);
    state.flash = 0.18;
    events.push({ type: EVENT_DETONATE });
  }

  function stepWeaver(dt, input) {
    const w = state.weaver;
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
      w.vx = (ax / len) * WEAVER.speed;
      w.vy = (ay / len) * WEAVER.speed;
    } else if (pointer) {
      const dx = pointer.x - w.x;
      const dy = pointer.y - w.y;
      const d = Math.hypot(dx, dy);
      const want = Math.min(WEAVER.speed, d * 9);
      w.vx = d > 4 ? (dx / d) * want : 0;
      w.vy = d > 4 ? (dy / d) * want : 0;
    } else {
      w.vx = 0;
      w.vy = 0;
    }
    w.x = Math.max(WEAVER.radius + 6, Math.min(FIELD.width - WEAVER.radius - 6, w.x + w.vx * dt));
    w.y = Math.max(70, Math.min(FIELD.groundY - WEAVER.radius - 6, w.y + w.vy * dt));
    w.trail.unshift({ x: w.x, y: w.y });
    if (w.trail.length > WEAVER.trail) w.trail.pop();
  }

  function stepStars(dt, events) {
    const pr = pullRadius();
    const cap = wellCapacity();
    for (let i = state.stars.length - 1; i >= 0; i -= 1) {
      const s = state.stars[i];
      if (s.state === 'orbit') {
        const well = state.wells.find((w) => w.id === s.wellId);
        if (!well) {
          s.state = 'falling';
          s.wellId = null;
          s.vx = random.range(-60, 60);
          s.vy = 60;
          continue;
        }
        s.angle += s.orbitSpeed * s.orbitDir * dt;
        s.x = well.x + Math.cos(s.angle) * s.orbitR;
        s.y = well.y + Math.sin(s.angle) * s.orbitR * 0.75;
        continue;
      }
      // Falling: the nearest well in range pulls it in.
      let nearest = null;
      let nearestD = pr;
      for (const w of state.wells) {
        if (wellStars(w).length >= cap) continue;
        const d = Math.hypot(w.x - s.x, w.y - s.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = w;
        }
      }
      if (nearest) {
        const dx = nearest.x - s.x;
        const dy = nearest.y - s.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const pull = 1050 * (1 - d / pr);
        s.vx += (dx / d) * pull * dt;
        s.vy += (dy / d) * pull * dt;
        const speed = Math.hypot(s.vx, s.vy);
        if (speed > 430) {
          s.vx = (s.vx / speed) * 430;
          s.vy = (s.vy / speed) * 430;
        }
        const count = wellStars(nearest).length;
        const orbitR = WELL.orbitBase + count * WELL.orbitStep;
        if (d < orbitR + 6) {
          s.state = 'orbit';
          s.wellId = nearest.id;
          s.angle = Math.atan2(s.y - nearest.y, s.x - nearest.x);
          s.orbitR = orbitR;
          s.orbitSpeed = random.range(1.3, 2.1);
          s.orbitDir = random.next() < 0.5 ? -1 : 1;
          s.vx = 0;
          s.vy = 0;
          burst(s.x, s.y, '#a5f3fc', 8, 140);
          events.push({ type: EVENT_CAPTURE, count: count + 1 });
          // Caught: its position is the orbit's from here on, so it must not
          // also move by its old falling velocity this step.
          continue;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y - s.radius > FIELD.groundY) state.stars.splice(i, 1);
    }
  }

  function stepMeteors(dt, events) {
    for (let i = state.meteors.length - 1; i >= 0; i -= 1) {
      const m = state.meteors[i];
      // Hunters steer toward the Heart Star: they are the level-3 pressure.
      if (m.sub === 'hunter') {
        const dx = HEART.x - m.x;
        const dy = HEART.y - m.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const steer = 260 * dt;
        m.vx += (dx / d) * steer;
        m.vy += (dy / d) * steer;
      }
      // Gravity wells bend a meteor's path; a well that eats one dies for it.
      // Big meteors are heavy: a well barely bends them.
      for (const w of state.wells) {
        const dx = w.x - m.x;
        const dy = w.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < WELL.bendRadius && d > WELL.coreRadius + m.radius) {
          const bend = m.sub === 'big' ? METEOR.bigBend : 1;
          const pull = 520 * bend * (1 - d / WELL.bendRadius);
          m.vx += (dx / d) * pull * dt;
          m.vy += (dy / d) * pull * dt;
          m.bent = true;
        }
      }
      const speed = Math.hypot(m.vx, m.vy);
      if (speed > 540) {
        m.vx = (m.vx / speed) * 540;
        m.vy = (m.vy / speed) * 540;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.spin * dt;
      let dead = false;
      for (const w of [...state.wells]) {
        const d = Math.hypot(w.x - m.x, w.y - m.y);
        if (d < WELL.coreRadius + m.radius) {
          scatterWell(w);
          state.wells = state.wells.filter((x) => x.id !== w.id);
          burst(w.x, w.y, '#4de8ff', 22, 260);
          burst(m.x, m.y, '#ff8a3d', 16, 220);
          state.combo = 0;
          state.comboTimer = 0;
          state.shake = Math.max(state.shake, 0.4);
          floatText(w.x, w.y - 40, 'WELL LOST', '#4de8ff');
          events.push({ type: EVENT_WELL_LOST });
          dead = true;
          break;
        }
      }
      if (dead) {
        state.meteors.splice(i, 1);
        continue;
      }
      const hd = Math.hypot(HEART.x - m.x, HEART.y - m.y);
      if (hd < HEART.radius + m.radius) {
        state.meteors.splice(i, 1);
        state.lives -= 1;
        state.heart.flash = 1;
        state.combo = 0;
        state.comboTimer = 0;
        burst(HEART.x, HEART.y, '#ff6b81', 36, 340);
        state.shake = 0.6;
        events.push({ type: EVENT_HEART });
        if (state.lives <= 0) {
          state.over = true;
          events.push({ type: EVENT_OVER });
        }
        continue;
      }
      for (let j = state.meteors.length - 1; j > i; j -= 1) {
        const o = state.meteors[j];
        const dd = Math.hypot(o.x - m.x, o.y - m.y);
        if (dd < m.radius + o.radius) {
          burst(m.x, m.y, '#ff8a3d', 18, 240);
          burst(o.x, o.y, '#ff8a3d', 18, 240);
          state.score += METEOR.shatterPoints * 2;
          floatText((m.x + o.x) / 2, (m.y + o.y) / 2 - 20, `SHATTER +${METEOR.shatterPoints * 2}`, '#ff8a3d');
          state.meteors.splice(j, 1);
          state.meteors.splice(i, 1);
          events.push({ type: EVENT_SHATTER });
          dead = true;
          break;
        }
      }
      if (dead) continue;
      if (m.y - m.radius > FIELD.groundY || m.x < -60 || m.x > FIELD.width + 60) {
        burst(m.x, Math.min(m.y, FIELD.groundY), '#5b6478', 8, 120);
        state.meteors.splice(i, 1);
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
    for (let i = state.rising.length - 1; i >= 0; i -= 1) {
      const r = state.rising[i];
      r.y -= 46 * dt;
      r.life -= dt;
      if (r.life <= 0) state.rising.splice(i, 1);
    }
    for (let i = state.shockwaves.length - 1; i >= 0; i -= 1) {
      const s = state.shockwaves[i];
      s.r += 620 * dt;
      s.life -= dt;
      if (s.life <= 0 || s.r >= s.maxR) state.shockwaves.splice(i, 1);
    }
    if (state.shake > 0) state.shake -= dt;
    if (state.flash > 0) state.flash -= dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.heart.flash > 0) state.heart.flash -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }

  function step(dt, input) {
    const events = [];
    if (state.over || state.won) return events;
    state.time += dt;
    state.energy = Math.min(ENERGY.max, state.energy + regenForLevel(state.level) * dt);
    for (const action of input.takePressed()) {
      if (action === 'place') placeWellAt(state.weaver.x, state.weaver.y, events);
      if (action === 'seal') sealFullest(events);
      if (action === 'detonate') detonateNear(state.weaver.x, state.weaver.y, events);
    }
    for (const click of input.takeClicks()) {
      if (click.button === 'right') {
        detonateNear(click.x, click.y, events);
        continue;
      }
      let hit = null;
      for (const w of state.wells) {
        if (Math.hypot(w.x - click.x, w.y - click.y) < WELL.coreRadius + 16) {
          hit = w;
          break;
        }
      }
      if (hit) sealWell(hit, events);
      else placeWellAt(click.x, click.y, events);
    }
    stepWeaver(dt, input);
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      state.stars.push(makeStar(random, state.level));
      state.starTimer = STAR.interval * random.range(0.6, 1.4);
    }
    state.meteorTimer -= dt;
    if (state.meteorTimer <= 0) {
      state.meteors.push(makeMeteor(random, state.level));
      const interval = Math.max(
        METEOR.minInterval,
        METEOR.interval * Math.pow(METEOR.intervalScale, state.level - 1),
      );
      state.meteorTimer = interval * random.range(0.7, 1.3);
    }
    stepStars(dt, events);
    stepMeteors(dt, events);
    stepFx(dt);
    return events;
  }

  return { state, step, burst };
}
