// Staged scenes for screenshots: ?shot=start|play|end (with &seed=N) paints that scene
// instead of running the loop, twice, then sets window.__shotReady. The shots show the
// whole loop at a glance: the title, play in progress with its HUD, and the game-over
// screen with its restart.

import { FIELD } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function seedScene(world, seed) {
  const s = world.state;
  // A busy mid-game moment: several meteors, stars and a power-up on screen, a combo
  // running and the player mid-field, so the play shot reads as a real game.
  s.time = 42.5;
  s.level = 4;
  s.score = 1240;
  s.combo = 4;
  s.bestCombo = 4;
  s.lives = 2;
  s.caught = 31;
  s.dodged = 58;
  s.player.x = FIELD.width / 2 - 60;
  s.player.y = FIELD.height - 150;
  s.player.shield = true;
  s.things = [
    { kind: 'meteor', sub: 'normal', x: 220, y: 150, vx: 0, vy: 300, radius: 22, rot: 0.4, spin: 0.8, passed: false },
    { kind: 'meteor', sub: 'zigzag', x: 640, y: 90, vx: 130, vy: 280, radius: 16, rot: 1.2, spin: -1.1, passed: false },
    { kind: 'meteor', sub: 'big', x: 980, y: 210, vx: 0, vy: 170, radius: 36, rot: 0.1, spin: 0.4, passed: false },
    { kind: 'meteor', sub: 'normal', x: 1120, y: 60, vx: 0, vy: 330, radius: 14, rot: 2.0, spin: 1.4, passed: false },
    { kind: 'star', x: 380, y: 260, vy: 210, radius: 11, phase: 0.5, passed: false },
    { kind: 'star', x: 760, y: 180, vy: 210, radius: 11, phase: 1.8, passed: false },
    { kind: 'star', x: 540, y: 420, vy: 210, radius: 11, phase: 3.1, passed: false },
    { kind: 'powerup', power: 'double', x: 900, y: 320, vy: 120, radius: 15, phase: 0.9, passed: false },
  ];
  s.particles = [
    { x: 380, y: 260, vx: 40, vy: -60, life: 0.5, max: 0.8, size: 4, color: '#ffd94d' },
    { x: 390, y: 270, vx: -50, vy: -30, life: 0.6, max: 0.8, size: 3, color: '#ffd94d' },
    { x: 370, y: 250, vx: 20, vy: -80, life: 0.4, max: 0.8, size: 3, color: '#ffffff' },
  ];
  s.floats = [{ x: 380, y: 240, text: '+40', color: '#ffd94d', life: 0.7, max: 0.9 }];
  s.player.trail = [
    { x: s.player.x, y: s.player.y + 14 },
    { x: s.player.x - 2, y: s.player.y + 26 },
    { x: s.player.x - 5, y: s.player.y + 38 },
  ];
  void seed;
}

export function stageShot(name, world) {
  const s = world.state;
  if (name === 'start') {
    return { screen: SCREEN_TITLE, best: 2480 };
  }
  if (name === 'play') {
    seedScene(world, 0);
    return { screen: SCREEN_PLAY, best: 2480 };
  }
  if (name === 'end') {
    seedScene(world, 0);
    s.over = true;
    s.score = 2870;
    s.lives = 0;
    return { screen: SCREEN_OVER, best: 2480, isBest: true };
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
