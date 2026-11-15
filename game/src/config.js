// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 690 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 620,
  invulnerable: 1.6,
  trail: 14,
};

export const LIVES = 3;

/** Falling meteors: the hazard. Speed and spawn rate grow with the level. */
export const METEOR = {
  minRadius: 12,
  maxRadius: 30,
  speed: 230,
  speedPerLevel: 26,
  speedJitter: 100,
  interval: 0.62,
  intervalScale: 0.9,
  minInterval: 0.16,
  dodgePoints: 1,
  /** Levels at which the zigzag and the big slow meteor first appear. */
  zigzagFromLevel: 3,
  bigFromLevel: 5,
};

/** Falling stars: the score. Catch them in a row to raise the combo. */
export const STAR = {
  radius: 11,
  speed: 185,
  speedPerLevel: 12,
  interval: 1.05,
  intervalJitter: 0.55,
  points: 10,
};

/** Power-ups: rare, slow, glowing. Each lasts a few seconds once caught. */
export const POWERUP = {
  radius: 15,
  speed: 120,
  interval: 13,
  intervalJitter: 6,
  kinds: ['shield', 'magnet', 'slow', 'double'],
  duration: { shield: 0, magnet: 8, slow: 6, double: 10 },
};

export const COMBO = { max: 5, window: 1.6 };

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 15, max: 12, bonus: 50 };

export const POOL_SIZE = 96;

export const PALETTE = {
  backdrop: '#070a14',
  skyTop: '#0b1026',
  skyBottom: '#131a33',
  ground: '#1d2440',
  player: '#4de8ff',
  playerGlow: '#1fb6d6',
  meteor: '#ff5a4e',
  meteorBig: '#ff8a3d',
  star: '#ffd94d',
  shield: '#4dd8ff',
  magnet: '#ff5ad1',
  slow: '#7aa8ff',
  double: '#ffe14d',
  panel: 'rgba(16, 22, 42, 0.88)',
  text: '#eef1f5',
  muted: '#9aa3b5',
  accent: '#4de8ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starfall.best';
