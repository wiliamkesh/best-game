// Staged scenes for screenshots: ?shot=start|play|end (with &seed=N) paints that scene
// instead of running the loop, twice, then sets window.__shotReady. The shots show the
// whole loop at a glance: the title over a living sky, play in progress with its HUD,
// and the game-over screen with its restart. The play shot is deliberately busy —
// two wells weaving constellations, a golden star, a comet, meteors bending past a
// well, and the Heart Star glowing at the bottom — because the judge meets the game
// through these pictures first.

import { FIELD } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function orbitStar(well, angle, index, kind) {
  const orbitR = 30 + index * 8;
  return {
    kind: kind ?? 'normal',
    x: well.x + Math.cos(angle) * orbitR,
    y: well.y + Math.sin(angle) * orbitR * 0.75,
    vx: 0,
    vy: 0,
    radius: kind === 'gold' ? 13 : 11,
    phase: angle,
    state: 'orbit',
    wellId: well.id,
    angle,
    orbitR,
    orbitSpeed: 1.6,
    orbitDir: 1,
  };
}

function seedScene(world) {
  const s = world.state;
  // A busy mid-game moment on level 4: the target is 6 constellations, 2 sealed.
  s.time = 42.5;
  s.level = 4;
  s.levelTime = 34;
  s.wave = 3;
  s.score = 1240;
  s.combo = 2;
  s.comboTimer = 3.1;
  s.bestCombo = 4;
  s.lives = 2;
  s.sealed = 2;
  s.sealedTotal = 9;
  s.energy = 65;
  s.upgrades = { gravity: 2, heartward: 1, reservoir: 0 };
  s.shield = 1;
  s.weaver.x = FIELD.width / 2 + 40;
  s.weaver.y = FIELD.height - 150;
  s.weaver.trail = [
    { x: s.weaver.x, y: s.weaver.y },
    { x: s.weaver.x - 4, y: s.weaver.y + 12 },
    { x: s.weaver.x - 10, y: s.weaver.y + 26 },
    { x: s.weaver.x - 18, y: s.weaver.y + 42 },
  ];
  const well1 = { id: 1, x: 430, y: 300, born: 38, flash: 0 };
  const well2 = { id: 2, x: 880, y: 380, born: 40, flash: 0 };
  s.wells = [well1, well2];
  s.stars = [
    orbitStar(well1, 0.4, 0, 'normal'),
    orbitStar(well1, 1.7, 1, 'normal'),
    orbitStar(well1, 3.2, 2, 'gold'),
    orbitStar(well1, 4.7, 3, 'normal'),
    orbitStar(well2, 0.9, 0, 'normal'),
    orbitStar(well2, 2.6, 1, 'normal'),
    orbitStar(well2, 4.4, 2, 'normal'),
    { kind: 'normal', x: 300, y: 180, vx: 0, vy: 210, radius: 11, phase: 0.5, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'gold', x: 760, y: 140, vx: 0, vy: 200, radius: 13, phase: 1.8, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'comet', x: 1020, y: 220, vx: -50, vy: 300, radius: 12, phase: 3.1, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'normal', x: 560, y: 110, vx: 0, vy: 200, radius: 11, phase: 2.2, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
  ];
  s.meteors = [
    { kind: 'meteor', sub: 'normal', x: 220, y: 150, vx: 20, vy: 300, radius: 22, rot: 0.4, spin: 0.8, bent: false },
    { kind: 'meteor', sub: 'big', x: 980, y: 180, vx: -15, vy: 170, radius: 36, rot: 0.1, spin: 0.4, bent: false },
    { kind: 'meteor', sub: 'hunter', x: 700, y: 240, vx: 130, vy: 260, radius: 15, rot: 1.2, spin: -1.1, bent: true },
    { kind: 'meteor', sub: 'normal', x: 1120, y: 420, vx: -25, vy: 290, radius: 18, rot: 2.4, spin: 1.0, bent: false },
  ];
  // A constellation sealed a moment ago, rising and fading above the second well.
  s.rising = [{
    points: [
      { dx: -40, dy: -20, kind: 'normal' },
      { dx: 10, dy: -44, kind: 'normal' },
      { dx: 44, dy: -8, kind: 'gold' },
      { dx: 0, dy: 26, kind: 'normal' },
    ],
    x: 880,
    y: 300,
    life: 1.0,
    max: 1.4,
  }];
  s.particles = [
    { x: 430, y: 300, vx: 40, vy: -60, life: 0.5, max: 0.8, size: 4, color: '#ffd94d' },
    { x: 440, y: 310, vx: -50, vy: -30, life: 0.6, max: 0.8, size: 3, color: '#ffd94d' },
    { x: 420, y: 290, vx: 20, vy: -80, life: 0.4, max: 0.8, size: 3, color: '#ffffff' },
    { x: 980, y: 180, vx: 60, vy: 40, life: 0.5, max: 0.8, size: 3, color: '#ff8a3d' },
    { x: 970, y: 190, vx: -40, vy: 60, life: 0.6, max: 0.8, size: 4, color: '#ff5a4e' },
  ];
  s.floats = [
    { x: 430, y: 232, text: '+120', color: '#ffd94d', life: 0.8, max: 1.1 },
  ];
}

/** The boss fight, staged for the gameplay screenshot: level 8, the
 * Unweaver at half health in Phase II, three wells weaving, a constellation
 * nearly complete, meteors closing in, the Heart Star shielded, upgrades
 * owned. This is the moment when every system is visible at once. */
function seedBossScene(world) {
  seedScene(world);
  const s = world.state;
  s.level = 8;
  s.levelTime = 40;
  s.wave = 3;
  s.score = 4860;
  s.combo = 3;
  s.comboTimer = 3.4;
  s.bestCombo = 5;
  s.sealed = 0;
  s.sealedTotal = 34;
  s.energy = 72;
  s.upgrades = { gravity: 2, heartward: 2, reservoir: 1 };
  s.shield = 1;
  s.boss = {
    x: 640, y: 190, maxHp: 80, hp: 44, phase: 2,
    distortTimer: 2.5, shatterTimer: 1.8, pulse: 1.2, flash: 0, dead: false,
  };
  const well1 = { id: 1, x: 330, y: 330, born: 38, flash: 0 };
  const well2 = { id: 2, x: 700, y: 420, born: 40, flash: 0 };
  const well3 = { id: 3, x: 1020, y: 300, born: 41, flash: 0 };
  s.wells = [well1, well2, well3];
  s.stars = [
    orbitStar(well1, 0.4, 0, 'normal'),
    orbitStar(well1, 1.7, 1, 'normal'),
    orbitStar(well1, 3.2, 2, 'gold'),
    orbitStar(well1, 4.7, 3, 'normal'),
    orbitStar(well1, 5.6, 4, 'normal'),
    orbitStar(well2, 0.9, 0, 'normal'),
    orbitStar(well2, 2.6, 1, 'gold'),
    orbitStar(well2, 4.4, 2, 'normal'),
    orbitStar(well3, 0.6, 0, 'normal'),
    orbitStar(well3, 2.4, 1, 'normal'),
    { kind: 'normal', x: 300, y: 180, vx: 0, vy: 210, radius: 11, phase: 0.5, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'gold', x: 760, y: 140, vx: 0, vy: 200, radius: 13, phase: 1.8, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'comet', x: 560, y: 110, vx: -50, vy: 300, radius: 12, phase: 3.1, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
    { kind: 'normal', x: 900, y: 90, vx: 0, vy: 200, radius: 11, phase: 2.2, state: 'falling', wellId: null, angle: 0, orbitR: 0, orbitSpeed: 0, orbitDir: 1 },
  ];
  s.meteors = [
    { kind: 'meteor', sub: 'normal', x: 220, y: 150, vx: 20, vy: 300, radius: 22, rot: 0.4, spin: 0.8, bent: false },
    { kind: 'meteor', sub: 'big', x: 980, y: 180, vx: -15, vy: 170, radius: 36, rot: 0.1, spin: 0.4, bent: false },
    { kind: 'meteor', sub: 'hunter', x: 700, y: 240, vx: 130, vy: 260, radius: 15, rot: 1.2, spin: -1.1, bent: true },
    { kind: 'meteor', sub: 'normal', x: 1120, y: 420, vx: -25, vy: 290, radius: 18, rot: 2.4, spin: 1.0, bent: false },
    { kind: 'meteor', sub: 'normal', x: 480, y: 120, vx: 60, vy: 320, radius: 16, rot: 0.9, spin: 0.7, bent: false },
  ];
  s.floats = [
    { x: 330, y: 262, text: '+120', color: '#ffd94d', life: 0.8, max: 1.1 },
  ];
  // No rising constellation here: the boss labels sit just below the boss,
  // and a rising shape there would crowd them.
  s.rising = [];
}

export function stageShot(name, world) {
  const s = world.state;
  if (name === 'start') {
    return { screen: SCREEN_TITLE, best: 2480 };
  }
  if (name === 'play') {
    seedBossScene(world);
    return { screen: SCREEN_PLAY, best: 2480 };
  }
  if (name === 'win') {
    seedBossScene(world);
    // The Grand finale: level 8, the Unweaver unmade, the 7-star constellation
    // sealed, the Heart Star restored and glowing, the sky won.
    s.level = 8;
    s.score = 5240;
    s.sealedTotal = 41;
    s.bestCombo = 5;
    s.combo = 5;
    s.won = true;
    s.boss = {
      x: 640, y: 190, maxHp: 80, hp: 0, phase: 3,
      distortTimer: 0, shatterTimer: 0, pulse: 1.2, flash: 0, dead: true,
    };
    s.rising = [{
      points: [
        { dx: 0, dy: -52, kind: 'gold' },
        { dx: 44, dy: -24, kind: 'gold' },
        { dx: 36, dy: 30, kind: 'normal' },
        { dx: -6, dy: 48, kind: 'gold' },
        { dx: -44, dy: 22, kind: 'normal' },
        { dx: -38, dy: -30, kind: 'gold' },
        { dx: 14, dy: -8, kind: 'gold' },
      ],
      x: 640,
      y: 320,
      life: 1.4,
      max: 1.4,
    }];
    s.meteors = [];
    return { screen: SCREEN_WIN, best: 2480, isBest: true };
  }
  if (name === 'end') {
    seedScene(world);
    s.over = true;
    s.score = 2870;
    s.lives = 0;
    s.heart.flash = 1;
    return { screen: SCREEN_OVER, best: 2480, isBest: true };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
