// THE UNWEAVER: the three-phase boss of Level 8. It is not a sprite with a
// health bar — it changes what the player must do. Phase I distorts: it shakes
// the fullest well and scatters its stars. Phase II shatters: it launches
// meteor clusters at the wells and the Heart Star. Phase III collapses: it
// speeds the meteors, hurries the falling stars, and shatters faster.
// Sealing a constellation damages it; the Grand Constellation is the blow
// that ends the fight. The boss only exists on Level 8.

import { BOSS, FIELD, HEART, bossDamage, bossPhase } from './config.js';

export const EVENT_BOSS_HIT = 'bosshit';
export const EVENT_BOSS_PHASE = 'bossphase';
export const EVENT_BOSS_DEAD = 'bossdead';

/** A boss that only wakes on the Grand level. Before that it is null. */
export class UnweaverBoss {
  constructor(random, difficulty) {
    this.x = BOSS.x;
    this.y = BOSS.y;
    this.maxHp = Math.round(BOSS.maxHp * difficulty.bossHp);
    this.hp = this.maxHp;
    this.phase = 1;
    this.distortTimer = BOSS.distortEvery;
    this.shatterTimer = BOSS.shatterEvery;
    this.pulse = 0;
    this.flash = 0;
    this.dead = false;
    this.random = random;
    this.difficulty = difficulty;
  }

  /** Damage from a sealed constellation. Returns the damage dealt. */
  damageFromSeal(starCount) {
    const dmg = bossDamage(starCount);
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 1;
    if (this.hp <= 0) this.dead = true;
    return dmg;
  }

  /** The phase from current HP; the caller announces a change. */
  currentPhase() {
    return bossPhase(this.hp);
  }

  /** The boss's attacks, driven by the world's step. It returns events and
   * asks the world (via the hooks object) to scatter a well, spawn a meteor
   * cluster, or apply the phase-3 speed modifiers. */
  step(dt, hooks) {
    if (this.dead) return [];
    const events = [];
    this.pulse += dt;
    if (this.flash > 0) this.flash -= dt;
    const phase = this.currentPhase();
    if (phase !== this.phase) {
      this.phase = phase;
      this.shatterTimer = Math.min(this.shatterTimer, 1.2);
      events.push({ type: EVENT_BOSS_PHASE, phase });
    }
    // Phase I and up: distortion shakes the fullest well apart.
    this.distortTimer -= dt;
    if (this.distortTimer <= 0) {
      this.distortTimer = BOSS.distortEvery;
      hooks.scatterFullestWell();
    }
    // Phase II and up: shatter clusters hunt the wells and the Heart Star.
    if (phase >= 2) {
      const every = phase === 3 ? BOSS.shatterEveryPhase3 : BOSS.shatterEvery;
      this.shatterTimer -= dt;
      if (this.shatterTimer <= 0) {
        this.shatterTimer = every;
        hooks.spawnShatterCluster(BOSS.shatterCount);
      }
    }
    return events;
  }

  /** Phase III collapses the sky: meteors and falling stars hurry. */
  get meteorSpeedMult() {
    return this.phase === 3 ? BOSS.phase3MeteorSpeed : 1;
  }

  get starSpeedMult() {
    return this.phase === 3 ? BOSS.phase3StarSpeed : 1;
  }

  /** A meteor the boss launches at a target: wells first, the Heart Star
   * when no well stands. */
  static aimedMeteor(random, tx, ty) {
    const x = random.range(60, FIELD.width - 60);
    const y = -30;
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const speed = 330;
    return {
      kind: 'meteor',
      sub: 'normal',
      x,
      y,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      radius: random.range(13, 18),
      rot: random.range(0, Math.PI * 2),
      spin: random.range(-1.6, 1.6),
      bent: false,
    };
  }

  /** Where a shatter cluster aims: a random well, else the Heart Star. */
  static clusterTarget(wells) {
    if (wells.length > 0) {
      const w = wells[Math.floor(Math.random() * wells.length)];
      return { x: w.x, y: w.y };
    }
    return { x: HEART.x, y: HEART.y };
  }
}
