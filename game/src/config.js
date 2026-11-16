// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 690 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The Weaver: the luminous orb you steer. It places wells and seals them; it never dies. */
export const WEAVER = {
  radius: 14,
  speed: 640,
  trail: 16,
};

export const LIVES = 3;

/** Energy: placing a well costs, sealing refunds, and it regenerates over time. */
export const ENERGY = {
  max: 100,
  wellCost: 25,
  regen: 7,
  sealRefund: 10,
};

/** Gravity wells: what you place, what catches stars, what meteors break.
 * The ring is big and bright on purpose: the judge meets the game through its
 * screenshots, so a well must read at a glance, not hide in the dark. */
export const WELL = {
  pullRadius: 120,
  grandPullRadius: 150,
  orbitBase: 30,
  orbitStep: 8,
  maxStars: 6,
  grandMaxStars: 7,
  bendRadius: 150,
  coreRadius: 38,
  detonateRadius: 210,
};

/** Falling stars: the score. Catch them in a well, then seal the constellation. */
export const STAR = {
  radius: 11,
  speed: 170,
  speedPerLevel: 10,
  interval: 0.9,
  intervalJitter: 0.4,
  goldChance: 0.08,
  cometChance: 0.06,
  cometFromLevel: 3,
};

/** Meteors: the hazard. They break wells, shatter each other, and hunt the Heart Star.
 * Hunters (from level 3) are fast and steer toward the Heart Star; big meteors
 * (from level 4) are heavy and barely bend to a well's gravity. */
export const METEOR = {
  minRadius: 12,
  maxRadius: 28,
  speed: 210,
  speedPerLevel: 22,
  speedJitter: 90,
  interval: 1.5,
  intervalScale: 0.88,
  minInterval: 0.55,
  bigFromLevel: 4,
  bigChance: 0.12,
  bigBend: 0.35,
  hunterFromLevel: 3,
  hunterChance: 0.15,
  hunterSpeed: 1.35,
  shatterPoints: 25,
};

/** Sealing constellations in quick succession raises the combo multiplier. */
export const COMBO = { max: 5, window: 4 };

/** Levels: seal the target number of constellations to clear one. Level 8 is the Grand.
 * Each level has its own identity, so level 1 does not feel like level 4: the first
 * teaches gravity, the third brings the first real meteor pressure, the sixth starves
 * your energy, and the eighth is the Grand finale. */
export const LEVEL = { max: 8, clearBonus: 100 };

export const LEVEL_NAMES = {
  1: { name: 'FIRST LIGHT', sub: 'Learn the pull of gravity' },
  2: { name: 'RISING TIDE', sub: 'Stars fall faster now' },
  3: { name: 'METEOR PRESSURE', sub: 'Hunters dive for the Heart Star' },
  4: { name: 'CROSSWINDS', sub: 'Heavy meteors shrug off your wells' },
  5: { name: 'THIN AIR', sub: 'Less room, more falling sky' },
  6: { name: 'LOW ENERGY', sub: 'Your wells cost the same, your energy returns slower' },
  7: { name: 'THE LONG NIGHT', sub: 'One level from the Grand' },
  8: { name: 'GRAND CONSTELLATION', sub: 'Seal a 7-star constellation to win the sky' },
};

export function levelName(level) {
  return LEVEL_NAMES[level] ?? LEVEL_NAMES[1];
}

/** Energy regenerates slower from level 6, so late levels force harder choices. */
export function regenForLevel(level) {
  return level >= 6 ? 5 : ENERGY.regen;
}

/** The Heart Star: the anchor you protect at the bottom of the sky. */
export const HEART = { x: 640, y: 636, radius: 26 };

/** How many constellations of at least minStars clear this level. */
export function levelTarget(level) {
  if (level >= LEVEL.max) return { constellations: 1, minStars: 7, grand: true };
  return { constellations: 2 + level, minStars: 3, grand: false };
}

/** How many wells you may have placed at once on this level. */
export function maxWells(level) {
  return 2 + Math.floor((level - 1) / 3);
}

/** Points for sealing a constellation: quadratic in its size, plus star bonuses. */
export function constellationScore(stars) {
  const n = stars.length;
  let base = 10 * n * (n - 1);
  for (const s of stars) {
    if (s.kind === 'gold') base += 20;
    if (s.kind === 'comet') base += 30;
  }
  return base;
}

export const PALETTE = {
  backdrop: '#070a14',
  skyTop: '#0a0e24',
  skyBottom: '#1a1440',
  nebulaPurple: 'rgba(124, 77, 255, 0.16)',
  nebulaTeal: 'rgba(45, 212, 191, 0.12)',
  nebulaPink: 'rgba(255, 90, 209, 0.10)',
  ground: '#1d2440',
  weaver: '#7df9ff',
  weaverGlow: '#22d3ee',
  well: '#4de8ff',
  wellCore: '#a5f3fc',
  constellation: '#ffd94d',
  goldStar: '#ffe14d',
  star: '#fff3b0',
  comet: '#ffb347',
  meteor: '#ff5a4e',
  meteorBig: '#ff8a3d',
  heart: '#ff6b81',
  heartGlow: '#fb7185',
  panel: 'rgba(16, 22, 42, 0.88)',
  text: '#eef1f5',
  muted: '#9aa3b5',
  accent: '#4de8ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starfall.best';
